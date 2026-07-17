import type { Browser } from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { launchBrowser } from '../utils/pdf-generator.js';
import { RenderError } from './errors.js';
import { Logger } from '../utils/logger.js';

export interface Worker {
  browser: Browser;
  renders: number;
  startedAt: number;
  lastRssMb: number;
  lastRssAt: number;
}

export interface WorkerPoolOptions {
  maxRendersPerWorker?: number;
  maxQueueDepth?: number;
  maxWorkerAgeMs?: number;
  maxWorkerRssMb?: number;
  acquireTimeoutMs?: number;
}

function chromiumTreeRssMb(browser: Browser): number {
  if (process.platform !== 'linux') return 0;
  const rootPid = browser.process()?.pid;
  if (!rootPid) return 0;
  const visited = new Set<number>();
  const visit = (pid: number): number => {
    if (visited.has(pid)) return 0;
    visited.add(pid);
    let pages = 0;
    try {
      const fields = readFileSync(`/proc/${pid}/statm`, 'utf-8').trim().split(/\s+/);
      pages = parseInt(fields[1] ?? '0', 10);
    } catch { return 0; }
    let children: number[] = [];
    try {
      children = readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf-8')
        .trim().split(/\s+/).filter(Boolean).map(Number);
    } catch { /* process may have exited */ }
    return pages * 4096 + children.reduce((total, child) => total + visit(child), 0);
  };
  return visit(rootPid) / 1024 / 1024;
}

export class WorkerPool {
  private available: Worker[] = [];
  private waiting: Array<{ resolve: (w: Worker) => void; reject: (e: Error) => void }> = [];
  private active = new Set<Worker>();
  private recycling = 0;
  private total = 0;
  private shuttingDown = false;
  private logger: Logger;
  private readonly limits: Required<WorkerPoolOptions>;

  constructor(
    private size: number,
    verbose = false,
    options: WorkerPoolOptions = {},
  ) {
    this.logger = new Logger(verbose);
    this.limits = {
      maxRendersPerWorker: Math.max(1, options.maxRendersPerWorker ?? 50),
      maxQueueDepth: Math.max(1, options.maxQueueDepth ?? 20),
      maxWorkerAgeMs: Math.max(1_000, options.maxWorkerAgeMs ?? 1_800_000),
      maxWorkerRssMb: Math.max(0, options.maxWorkerRssMb ?? 0),
      acquireTimeoutMs: Math.max(1, options.acquireTimeoutMs ?? 30_000),
    };
  }

  async start(): Promise<void> {
    if (!Number.isInteger(this.size) || this.size < 0) {
      throw new RenderError('RENDER_FAILED', 'Worker count must be a non-negative integer', 500);
    }
    this.logger.info(`Starting worker pool with ${this.size} browsers...`);
    // Start sequentially to avoid a large transient memory spike.
    for (let i = 0; i < this.size; i++) {
      const browser = await launchBrowser();
      this.available.push({ browser, renders: 0, startedAt: Date.now(), lastRssMb: 0, lastRssAt: 0 });
      this.total++;
    }
    this.logger.info(`Worker pool ready (${this.total} browsers)`);
  }

  async acquire(): Promise<Worker> {
    if (this.shuttingDown) {
      throw new RenderError('RENDER_FAILED', 'Server is shutting down', 503);
    }

    if (this.available.length > 0) {
      const worker = this.available.pop()!;
      this.active.add(worker);
      return worker;
    }

    if (this.waiting.length >= this.limits.maxQueueDepth) {
      throw new RenderError('QUEUE_FULL', 'Too many concurrent requests', 503);
    }

    return new Promise<Worker>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const waiter = {
        resolve: (worker: Worker) => {
          clearTimeout(timer);
          this.active.add(worker);
          resolve(worker);
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      this.waiting.push(waiter);
      timer = setTimeout(() => {
        const index = this.waiting.indexOf(waiter);
        if (index >= 0) this.waiting.splice(index, 1);
        reject(new RenderError('RENDER_FAILED', 'Timed out waiting for a browser worker', 503));
      }, this.limits.acquireTimeoutMs);
    });
  }

  async release(worker: Worker, healthy = true): Promise<void> {
    this.active.delete(worker);
    worker.renders++;

    worker.lastRssMb = chromiumTreeRssMb(worker.browser);
    worker.lastRssAt = Date.now();
    const expired = Date.now() - worker.startedAt >= this.limits.maxWorkerAgeMs;
    const overMemoryLimit = this.limits.maxWorkerRssMb > 0 && worker.lastRssMb >= this.limits.maxWorkerRssMb;
    if (overMemoryLimit) {
      this.logger.info(`Recycling Chromium worker at ${worker.lastRssMb.toFixed(1)}MB RSS`);
    }
    if (!healthy || !worker.browser.connected || worker.renders >= this.limits.maxRendersPerWorker || expired || overMemoryLimit || this.shuttingDown) {
      await this.recycle(worker);
      return;
    }

    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next.resolve(worker);
      return;
    }

    this.available.push(worker);
  }

  private async recycle(worker: Worker): Promise<void> {
    this.recycling++;
    try {
      try {
        await worker.browser.close();
      } catch {
        // ignore close errors
      }

      if (this.shuttingDown) {
        this.total = Math.max(0, this.total - 1);
        return;
      }

      try {
        const browser = await launchBrowser();
        const fresh: Worker = {
          browser, renders: 0, startedAt: Date.now(), lastRssMb: 0, lastRssAt: 0,
        };

        if (this.shuttingDown) {
          try { await browser.close(); } catch { /* shutdown is best effort */ }
          this.total = Math.max(0, this.total - 1);
          return;
        }

        if (this.waiting.length > 0) {
          this.waiting.shift()!.resolve(fresh);
        } else {
          this.available.push(fresh);
        }
      } catch (err) {
        this.total = Math.max(0, this.total - 1);
        this.logger.error(`Failed to recycle browser: ${err}`);
        if (this.waiting.length > 0) {
          this.waiting.shift()!.reject(
            new RenderError('RENDER_FAILED', 'No browsers available', 503),
          );
        }
      }
    } finally {
      this.recycling--;
    }
  }

  stats(): { total: number; available: number; active: number; recycling: number; waiting: number; chromiumRssMb: number } {
    const workers = [...this.available, ...this.active];
    const now = Date.now();
    return {
      total: this.total,
      available: this.available.length,
      active: this.active.size,
      recycling: this.recycling,
      waiting: this.waiting.length,
      chromiumRssMb: Number(workers.reduce((total, worker) => {
        if (now - worker.lastRssAt >= 5_000) {
          worker.lastRssMb = chromiumTreeRssMb(worker.browser);
          worker.lastRssAt = now;
        }
        return total + worker.lastRssMb;
      }, 0).toFixed(1)),
    };
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    for (const w of this.waiting) {
      w.reject(new RenderError('RENDER_FAILED', 'Server is shutting down', 503));
    }
    this.waiting = [];

    const workers = [...this.available, ...this.active];
    await Promise.allSettled(workers.map((w) => w.browser.close()));
    this.available = [];
    this.active.clear();
    this.total = 0;
    this.logger.info('Worker pool shut down');
  }
}
