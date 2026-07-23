import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams, type SpawnOptions } from 'node:child_process';
import { setPriority as nodeSetPriority } from 'node:os';

export const CHILD_PROCESS_NICE = 10;

export interface LowPriorityCommandOptions {
  command: string;
  args?: string[];
  platform?: NodeJS.Platform;
}

export interface LowPriorityCommand {
  command: string;
  args: string[];
}

export interface SpawnLowPriorityOptions extends LowPriorityCommandOptions {
  options?: SpawnOptions;
}

export interface RunLowPriorityOptions extends SpawnLowPriorityOptions {
  timeoutMs?: number;
  maxBufferBytes?: number;
}

export interface LowPriorityProcessResult {
  stdout: Buffer;
  stderr: Buffer;
}

interface LowPriorityProcessErrorOptions extends LowPriorityProcessResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  cause?: unknown;
}

export class LowPriorityProcessError extends Error {
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly timedOut: boolean;

  constructor(message: string, options: LowPriorityProcessErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'LowPriorityProcessError';
    this.stdout = options.stdout;
    this.stderr = options.stderr;
    this.exitCode = options.exitCode;
    this.signal = options.signal;
    this.timedOut = options.timedOut;
  }
}

/** Escape hatch: FACET_LOW_PRIORITY=0 disables all child deprioritization. */
export function lowPriorityDisabled(): boolean {
  return process.env['FACET_LOW_PRIORITY'] === '0';
}

export function buildLowPriorityCommand(options: LowPriorityCommandOptions): LowPriorityCommand {
  const args = options.args ?? [];
  if (lowPriorityDisabled()) return { command: options.command, args: [...args] };
  switch (options.platform ?? process.platform) {
    case 'darwin':
      // nice only — taskpolicy -b puts children in the background QoS band
      // (efficiency cores + throttled I/O), which stretched a measured 70s SSR
      // build past 7 minutes under load. CPU-derating is the intent; keep it.
      return {
        command: '/usr/bin/nice',
        args: ['-n', String(CHILD_PROCESS_NICE), options.command, ...args],
      };
    case 'linux':
      return {
        command: '/usr/bin/nice',
        args: ['-n', String(CHILD_PROCESS_NICE), options.command, ...args],
      };
    case 'win32':
      return { command: options.command, args: [...args] };
    default:
      throw new Error(`Low-priority subprocesses are unsupported on ${options.platform ?? process.platform}`);
  }
}

export function applySpawnedProcessPriority(options: {
  pid: number;
  platform?: NodeJS.Platform;
  kill?: () => unknown;
  setPriority?: (pid: number, priority: number) => void;
}): void {
  if (lowPriorityDisabled()) return;
  if ((options.platform ?? process.platform) !== 'win32') return;
  try {
    (options.setPriority ?? nodeSetPriority)(options.pid, CHILD_PROCESS_NICE);
  } catch (error) {
    options.kill?.();
    throw new Error(
      `Failed to lower subprocess ${options.pid} priority: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

export function spawnLowPriority<T extends ChildProcess = ChildProcess>(options: SpawnLowPriorityOptions): T {
  const command = buildLowPriorityCommand(options);
  const spawnOptions: SpawnOptions = options.options ?? {};
  const child: ChildProcess = spawn(command.command, command.args, spawnOptions);
  if (child.pid !== undefined) {
    applySpawnedProcessPriority({ pid: child.pid, kill: () => child.kill() });
  }
  return child as T;
}

export function runLowPriority(options: RunLowPriorityOptions): Promise<LowPriorityProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawnLowPriority<ChildProcessWithoutNullStreams>({
      ...options,
      options: { ...options.options, stdio: ['ignore', 'pipe', 'pipe'] },
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const maxBufferBytes = options.maxBufferBytes ?? 50 * 1024 * 1024;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let bufferExceeded = false;
    let settled = false;

    const capture = (chunks: Buffer[], chunk: Buffer, streamBytes: number): number => {
      const nextBytes = streamBytes + chunk.length;
      if (nextBytes > maxBufferBytes) {
        bufferExceeded = true;
        child.kill('SIGKILL');
      } else {
        chunks.push(chunk);
      }
      return nextBytes;
    };
    child.stdout.on('data', (chunk: Buffer) => { stdoutBytes = capture(stdout, chunk, stdoutBytes); });
    child.stderr.on('data', (chunk: Buffer) => { stderrBytes = capture(stderr, chunk, stderrBytes); });

    const timer = options.timeoutMs === undefined ? undefined : setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeoutMs);
    const finish = (exitCode: number | null, signal: NodeJS.Signals | null, cause?: unknown): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const output = { stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) };
      if (exitCode === 0 && !timedOut && !bufferExceeded && cause === undefined) {
        resolve(output);
        return;
      }
      const reason = timedOut ? 'timed out' : bufferExceeded ? 'exceeded its output limit' : `exited with code ${exitCode}`;
      reject(new LowPriorityProcessError(`Low-priority subprocess ${options.command} ${reason}`, {
        ...output, exitCode, signal, timedOut, cause,
      }));
    };
    child.once('error', (error) => finish(null, null, error));
    child.once('close', (exitCode, signal) => finish(exitCode, signal));
  });
}
