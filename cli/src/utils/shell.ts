/**
 * Minimal Node replacement for Bun's `$` shell.
 *
 * Supports the subset used across the CLI:
 *   await $`cmd ${arg}`.quiet()        -> ShellResult, output suppressed
 *   await $`cmd ${arg}`.text()         -> stdout as string
 *   await $`cmd`.env(obj).quiet()      -> run with extra env vars
 *   $`prefix ${{ raw: str }} rest`     -> inject str without escaping
 *
 * Interpolated values are shell-escaped unless wrapped as `{ raw: string }`.
 * Commands run through `/bin/sh -c`, matching Bun's shell semantics
 * (`&&`, `2>&1`, `cd`, pipes).
 */
import { spawn } from 'node:child_process';

export interface ShellResult {
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number;
}

export interface ShellError extends Error {
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

type RawArg = { raw: string };

function isRaw(value: unknown): value is RawArg {
  return typeof value === 'object' && value !== null && 'raw' in value;
}

function escape(value: unknown): string {
  const str = String(value);
  // Single-quote and escape embedded single quotes for POSIX sh.
  return `'${str.replace(/'/g, `'\\''`)}'`;
}

function renderValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(el => (isRaw(el) ? el.raw : escape(el))).join(' ');
  }
  return isRaw(value) ? value.raw : escape(value);
}

function buildCommand(strings: TemplateStringsArray, values: unknown[]): string {
  let cmd = strings[0];
  for (let i = 0; i < values.length; i++) {
    cmd += renderValue(values[i]);
    cmd += strings[i + 1];
  }
  return cmd;
}

class ShellPromise implements PromiseLike<ShellResult> {
  private extraEnv: Record<string, string> = {};

  constructor(private readonly command: string) {}

  env(vars: Record<string, string>): this {
    this.extraEnv = { ...this.extraEnv, ...vars };
    return this;
  }

  /** Run the command, suppressing inherited stdio (output captured only). */
  quiet(): Promise<ShellResult> {
    return this.run();
  }

  /** Run the command and return trimmed stdout. */
  async text(): Promise<string> {
    const result = await this.run();
    return result.stdout.toString();
  }

  then<T1 = ShellResult, T2 = never>(
    onfulfilled?: ((value: ShellResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private run(): Promise<ShellResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('/bin/sh', ['-c', this.command], {
        env: { ...process.env, ...this.extraEnv },
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      child.on('error', reject);
      child.on('close', (code, signal) => {
        const stdout = Buffer.concat(stdoutChunks);
        const stderr = Buffer.concat(stderrChunks);
        if (code !== 0) {
          const reason = signal ? `signal ${signal}` : `exit ${code}`;
          const error = new Error(
            `command failed (${reason}): ${this.command}`,
          ) as ShellError;
          error.stdout = stdout;
          error.stderr = stderr;
          error.exitCode = code;
          error.signal = signal;
          reject(error);
          return;
        }
        resolve({ stdout, stderr, exitCode: code });
      });
    });
  }
}

export function $(strings: TemplateStringsArray, ...values: unknown[]): ShellPromise {
  return new ShellPromise(buildCommand(strings, values));
}
