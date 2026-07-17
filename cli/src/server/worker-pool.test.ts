import { describe, expect, it } from 'vitest';
import { WorkerPool } from './worker-pool.js';

// Queue policy tests do not start Chromium; an unstarted pool has no available workers.
describe('WorkerPool queue policy', () => {
  it('times out browser acquisition', async () => {
    const pool = new WorkerPool(1, false, { acquireTimeoutMs: 10 });
    await expect(pool.acquire()).rejects.toThrow('Timed out waiting for a browser worker');
    expect(pool.stats().waiting).toBe(0);
  });

  it('rejects requests beyond queue depth', async () => {
    const pool = new WorkerPool(1, false, { acquireTimeoutMs: 50, maxQueueDepth: 1 });
    const first = pool.acquire();
    await expect(pool.acquire()).rejects.toThrow('Too many concurrent requests');
    await expect(first).rejects.toThrow('Timed out waiting for a browser worker');
  });

  it('finishes recycle bookkeeping during shutdown', async () => {
    const pool = new WorkerPool(0);
    const internals = pool as unknown as {
      shuttingDown: boolean;
      recycle: (worker: unknown) => Promise<void>;
    };
    internals.shuttingDown = true;
    await internals.recycle({
      browser: { close: async () => undefined },
      renders: 0,
      startedAt: Date.now(),
      lastRssMb: 0,
      lastRssAt: 0,
    });
    expect(pool.stats().recycling).toBe(0);
  });
});
