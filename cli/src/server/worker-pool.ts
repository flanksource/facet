import type { Browser } from 'puppeteer';
import { launchBrowser } from '../utils/pdf-generator.js';
import { RenderError } from './errors.js';
import { Logger } from '../utils/logger.js';

interface Worker {
  browser: Browser;
  renders: number;
}

const MAX_RENDERS_PER_WORKER = 50;
const MAX_QUEUE_DEPTH = 20;

export class WorkerPool {
  private available: Worker[] = [];
  private waiting: Array<{ resolve: (w: Worker) => void; reject: (e: Error) => void }> = [];
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
    this.logger.info(`Starting worker pool with ${this.size} browsers...`);
    const browsers = await Promise.all(
      Array.from({ length: this.size }, () => launchBrowser()),
    );
    for (const browser of browsers) {
      this.available.push({ browser, renders: 0 });
      this.total++;
    }
    this.logger.info(`Worker pool ready (${this.total} browsers)`);
  }

  async acquire(): Promise<Worker> {
    if (this.shuttingDown) {
      throw new RenderError('RENDER_FAILED', 'Server is shutting down', 503);
    }

    if (this.available.length > 0) {
      return this.available.pop()!;
    }

    if (this.waiting.length >= MAX_QUEUE_DEPTH) {
      throw new RenderError('QUEUE_FULL', 'Too many concurrent requests', 503);
    }

    return new Promise<Worker>((resolve, reject) => {
      this.waiting.push({ resolve, reject });
    });
  }

  async release(worker: Worker): Promise<void> {
    worker.renders++;

    if (worker.renders >= MAX_RENDERS_PER_WORKER || this.shuttingDown) {
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
      const fresh: Worker = { browser, renders: 0 };

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
    }
  }

  stats(): { total: number; available: number; waiting: number } {
    return {
      total: this.total,
      available: this.available.length,
      waiting: this.waiting.length,
    };
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    for (const w of this.waiting) {
      w.reject(new RenderError('RENDER_FAILED', 'Server is shutting down', 503));
    }
    this.waiting = [];

    await Promise.allSettled(
      this.available.map((w) => w.browser.close()),
    );
    this.available = [];
    this.total = 0;
    this.logger.info('Worker pool shut down');
  }
}
