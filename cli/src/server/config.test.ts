import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const limitEnvNames = [
  'FACET_MAX_RENDERS_PER_WORKER',
  'FACET_MAX_QUEUE_DEPTH',
  'FACET_MAX_WORKER_AGE_MS',
  'FACET_MAX_WORKER_RSS_MB',
  'FACET_WORKER_ACQUIRE_TIMEOUT_MS',
] as const;
const savedEnv = new Map(limitEnvNames.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const [name, value] of savedEnv) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('loadConfig worker limits', () => {
  it('propagates the global skip-modules flag without an environment fallback', () => {
    expect(loadConfig({ skipModules: true }).skipModules).toBe(true);
    expect(loadConfig({}).skipModules).toBe(false);
  });

  it('falls back to defaults for invalid environment values', () => {
    process.env.FACET_MAX_RENDERS_PER_WORKER = 'NaN';
    process.env.FACET_MAX_QUEUE_DEPTH = '0';
    process.env.FACET_MAX_WORKER_AGE_MS = '1.5';
    process.env.FACET_MAX_WORKER_RSS_MB = '-1';
    process.env.FACET_WORKER_ACQUIRE_TIMEOUT_MS = 'Infinity';

    const config = loadConfig({});
    expect(config.maxRendersPerWorker).toBe(50);
    expect(config.maxQueueDepth).toBe(20);
    expect(config.maxWorkerAgeMs).toBe(1_800_000);
    expect(config.maxWorkerRssMb).toBe(0);
    expect(config.workerAcquireTimeoutMs).toBe(30_000);
  });

  it('accepts safe integers at or above each minimum', () => {
    const config = loadConfig({
      maxRendersPerWorker: 2,
      maxQueueDepth: 3,
      maxWorkerAge: 4,
      maxWorkerRss: 0,
      workerAcquireTimeout: 5,
    });
    expect(config.maxRendersPerWorker).toBe(2);
    expect(config.maxQueueDepth).toBe(3);
    expect(config.maxWorkerAgeMs).toBe(4);
    expect(config.maxWorkerRssMb).toBe(0);
    expect(config.workerAcquireTimeoutMs).toBe(5);
  });
});
