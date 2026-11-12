import { afterEach, expect, test, vi } from 'vitest';
import { resolve } from 'node:path';
import { runtimeCacheRoot } from './workspace.js';

afterEach(() => vi.unstubAllEnvs());

test('resolves a relative runtime cache before loading installed native tools', () => {
  vi.stubEnv('FACET_CACHE_DIR', '.tmp/relative-runtime');
  expect(runtimeCacheRoot()).toBe(resolve('.tmp/relative-runtime'));
});
