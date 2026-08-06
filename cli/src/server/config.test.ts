import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const limitEnvNames = [
  'FACET_MAX_RENDERS_PER_WORKER',
  'FACET_MAX_QUEUE_DEPTH',
  'FACET_MAX_WORKER_AGE_MS',
  'FACET_MAX_WORKER_RSS_MB',
  'FACET_WORKER_ACQUIRE_TIMEOUT_MS',
  'FACET_RENDER_TIMEOUT',
] as const;
const savedEnv = new Map(limitEnvNames.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const [name, value] of savedEnv) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('loadConfig worker limits', () => {
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

describe('loadConfig render timeout', () => {
  it('defaults to 5 minutes', () => {
    expect(loadConfig({}).renderTimeout).toBe(300_000);
  });

  it('reads FACET_RENDER_TIMEOUT', () => {
    process.env.FACET_RENDER_TIMEOUT = '120000';
    expect(loadConfig({}).renderTimeout).toBe(120_000);
  });

  it('prefers the flag over the environment', () => {
    process.env.FACET_RENDER_TIMEOUT = '120000';
    expect(loadConfig({ timeout: '90000' }).renderTimeout).toBe(90_000);
  });

  it('falls back to the default for unusable values', () => {
    process.env.FACET_RENDER_TIMEOUT = '5m';
    expect(loadConfig({}).renderTimeout).toBe(300_000);
    expect(loadConfig({ timeout: '0' }).renderTimeout).toBe(300_000);
    expect(loadConfig({ timeout: '-1' }).renderTimeout).toBe(300_000);
    expect(loadConfig({ timeout: '1.5' }).renderTimeout).toBe(300_000);
  });

  it('rejects values setTimeout cannot represent', () => {
    // A 32-bit overflow makes setTimeout fire after 1ms, timing out every render.
    expect(loadConfig({ timeout: '2147483648' }).renderTimeout).toBe(300_000);
    expect(loadConfig({ timeout: '2147483647' }).renderTimeout).toBe(2_147_483_647);
  });
});
