import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { AsyncLocalStorage } from 'node:async_hooks';
import { selfExecBase } from '../utils/self-exec.js';
import type { Logger } from '../utils/logger.js';

export interface PersistentLoaderRequest {
  facetRoot: string;
  cacheKey: string;
  data: Record<string, unknown>;
  verbose?: boolean;
}

export interface PersistentLoaderResult {
  html: string;
  css: string;
}

interface Reply {
  id: number;
  result?: PersistentLoaderResult;
  error?: string;
}

class SsrLoaderProcess {
  private child: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: PersistentLoaderResult) => void; reject: (error: Error) => void }>();
  private stderr = '';
  private exited = false;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private lastUsedAt = Date.now();

  constructor(
    readonly facetRoot: string,
    private readonly logger: Logger,
    private readonly onExit: () => void,
  ) {
    const [command, ...baseArgs] = selfExecBase();
    this.child = spawn(command, [...baseArgs, `--facet-root=${facetRoot}`], {
      cwd: facetRoot,
      env: { ...process.env, FACET_LOADER: 'ssr-daemon' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child.stderr.on('data', (chunk: Buffer) => {
      this.stderr = (this.stderr + chunk.toString()).slice(-64 * 1024);
    });
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      let reply: Reply;
      try { reply = JSON.parse(line) as Reply; }
      catch { return; }
      const pending = this.pending.get(reply.id);
      if (!pending) return;
      this.pending.delete(reply.id);
      if (reply.result) pending.resolve(reply.result);
      else pending.reject(new Error(reply.error ?? 'Persistent SSR loader failed'));
      this.lastUsedAt = Date.now();
      if (!this.hasPending()) this.scheduleIdleShutdown();
    });
    const fail = (error: Error): void => {
      if (this.exited) return;
      this.exited = true;
      const detail = this.stderr.trim();
      const failure = detail ? new Error(`${error.message}\n${detail}`) : error;
      for (const pending of this.pending.values()) pending.reject(failure);
      this.pending.clear();
      this.onExit();
    };
    this.child.on('error', fail);
    this.child.on('exit', (code) => fail(new Error(`Persistent SSR loader exited with code ${code}`)));
  }

  private scheduleIdleShutdown(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const idleMs = validEnvInteger('FACET_SSR_LOADER_IDLE_MS', 300_000, 1_000);
    this.idleTimer = setTimeout(() => void this.close(), idleMs);
    this.idleTimer.unref();
  }

  hasPending(): boolean {
    return this.pending.size > 0;
  }

  lastUsed(): number {
    return this.lastUsedAt;
  }

  request(data: Record<string, unknown>, cacheKey: string, verbose = false): Promise<PersistentLoaderResult> {
    if (this.exited) return Promise.reject(new Error('Persistent SSR loader is not running'));
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.lastUsedAt = Date.now();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify({ id, data, cacheKey, verbose })}\n`, (error) => {
        if (!error) return;
        this.pending.delete(id);
        reject(error);
        if (!this.hasPending()) this.scheduleIdleShutdown();
      });
    });
  }

  async close(): Promise<void> {
    if (this.exited) return;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.child.stdin.end();
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.child.kill('SIGKILL');
        resolve();
      }, 5_000);
      timer.unref();
      this.child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.logger.debug(`Stopped persistent SSR loader: ${this.facetRoot}`);
  }
}

function validEnvInteger(name: string, fallback: number, minimum: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.max(minimum, parsed);
}

export type PersistentSsrLoaderOwner = object;

const loaders = new Map<string, SsrLoaderProcess>();
const loaderOwners = new Map<string, Set<PersistentSsrLoaderOwner>>();
const unownedLoaders = new Set<string>();
const ownerContext = new AsyncLocalStorage<PersistentSsrLoaderOwner>();

export function withPersistentSsrLoaderOwner<T>(
  owner: PersistentSsrLoaderOwner,
  action: () => Promise<T>,
): Promise<T> {
  return ownerContext.run(owner, action);
}

export function runPersistentSsrLoader(
  request: PersistentLoaderRequest,
  logger: Logger,
): Promise<PersistentLoaderResult> {
  let loader = loaders.get(request.facetRoot);
  if (!loader) {
    const maxLoaders = validEnvInteger('FACET_MAX_SSR_LOADERS', 4, 1);
    if (loaders.size >= maxLoaders) {
      const oldest = [...loaders.entries()]
        .filter(([, candidate]) => !candidate.hasPending())
        .sort(([, left], [, right]) => left.lastUsed() - right.lastUsed())[0];
      if (!oldest) {
        return Promise.reject(new Error(`Persistent SSR loader pool exhausted (${maxLoaders} active loaders)`));
      }
      loaders.delete(oldest[0]);
      loaderOwners.delete(oldest[0]);
      unownedLoaders.delete(oldest[0]);
      void oldest[1].close();
    }
    let created!: SsrLoaderProcess;
    created = new SsrLoaderProcess(request.facetRoot, logger, () => {
      if (loaders.get(request.facetRoot) === created) loaders.delete(request.facetRoot);
      loaderOwners.delete(request.facetRoot);
      unownedLoaders.delete(request.facetRoot);
    });
    loader = created;
    loaders.set(request.facetRoot, loader);
    logger.debug(`Started persistent SSR loader: ${request.facetRoot}`);
  } else {
    // Refresh insertion order for simple LRU eviction.
    loaders.delete(request.facetRoot);
    loaders.set(request.facetRoot, loader);
  }

  const owner = ownerContext.getStore();
  if (owner) {
    const owners = loaderOwners.get(request.facetRoot) ?? new Set<PersistentSsrLoaderOwner>();
    owners.add(owner);
    loaderOwners.set(request.facetRoot, owners);
  } else {
    unownedLoaders.add(request.facetRoot);
  }
  return loader.request(request.data, request.cacheKey, request.verbose);
}

export async function shutdownPersistentSsrLoaders(owner?: PersistentSsrLoaderOwner): Promise<void> {
  if (!owner) {
    const active = [...loaders.values()];
    loaders.clear();
    loaderOwners.clear();
    unownedLoaders.clear();
    await Promise.allSettled(active.map((loader) => loader.close()));
    return;
  }

  const closing: SsrLoaderProcess[] = [];
  for (const [facetRoot, owners] of loaderOwners) {
    owners.delete(owner);
    if (owners.size > 0 || unownedLoaders.has(facetRoot)) continue;
    loaderOwners.delete(facetRoot);
    const loader = loaders.get(facetRoot);
    if (loader) {
      loaders.delete(facetRoot);
      closing.push(loader);
    }
  }
  await Promise.allSettled(closing.map((loader) => loader.close()));
}
