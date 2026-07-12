import type { Browser } from 'puppeteer-core';
import { launchBrowser } from '../utils/pdf-generator.js';
import { RenderError } from './errors.js';
import { Logger } from '../utils/logger.js';

export interface Worker {
  browser: Browser;
  renders: number;
  startedAt: number;
}

const MAX_RENDERS_PER_WORKER = Math.max(1, parseInt(process.env['FACET_MAX_RENDERS_PER_WORKER'] ?? '50', 10));
const MAX_QUEUE_DEPTH = Math.max(1, parseInt(process.env['FACET_MAX_QUEUE_DEPTH'] ?? '20', 10));
const MAX_WORKER_AGE_MS = Math.max(1_000, parseInt(process.env['FACET_MAX_WORKER_AGE_MS'] ?? '1800000', 10));

export class WorkerPool {
  private available: Worker[] = [];
  private waiting: Array<{ resolve: (w: Worker) => void; reject: (e: Error) => void }> = [];
  private active = new Set<Worker>();
  private recycling = 0;
  private total = 0;
  private shuttingDown = false;
  private logger: Logger;

  constructor(
    private size: number,
    verbose = false,
  ) {
    this.logger = new Logger(verbose);
  }

  async start(): Promise<void> {
    if (!Number.isInteger(this.size) || this.size < 1) {
      throw new RenderError('RENDER_FAILED', 'Worker count must be a positive integer', 500);
    }
    this.logger.info(`Starting worker pool with ${this.size} browsers...`);
    // Start sequentially to avoid a large transient memory spike.
    for (let i = 0; i < this.size; i++) {
      const browser = await launchBrowser();
      this.available.push({ browser, renders: 0, startedAt: Date.now() });
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

    if (this.waiting.length >= MAX_QUEUE_DEPTH) {
      throw new RenderError('QUEUE_FULL', 'Too many concurrent requests', 503);
    }

    return new Promise<Worker>((resolve, reject) => {
      this.waiting.push({
        resolve: (worker) => {
          this.active.add(worker);
          resolve(worker);
        },
        reject,
      });
    });
  }

  async release(worker: Worker, healthy = true): Promise<void> {
    this.active.delete(worker);
    worker.renders++;

    const expired = Date.now() - worker.startedAt >= MAX_WORKER_AGE_MS;
    if (!healthy || !worker.browser.connected || worker.renders >= MAX_RENDERS_PER_WORKER || expired || this.shuttingDown) {
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
      await worker.browser.close();
    } catch {
      // ignore close errors
    }

    if (this.shuttingDown) {
      this.total--;
      return;
    }

    try {
      const browser = await launchBrowser();
      const fresh: Worker = { browser, renders: 0, startedAt: Date.now() };

      if (this.waiting.length > 0) {
        this.waiting.shift()!.resolve(fresh);
      } else {
        this.available.push(fresh);
      }
    } catch (err) {
      this.total--;
      this.logger.error(`Failed to recycle browser: ${err}`);
      if (this.waiting.length > 0) {
        this.waiting.shift()!.reject(
          new RenderError('RENDER_FAILED', 'No browsers available', 503),
        );
      }
    } finally {
      this.recycling--;
    }
  }

  stats(): { total: number; available: number; active: number; recycling: number; waiting: number } {
    return {
      total: this.total,
      available: this.available.length,
      active: this.active.size,
      recycling: this.recycling,
      waiting: this.waiting.length,
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
