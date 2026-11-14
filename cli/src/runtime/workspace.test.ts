import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { runtimeCacheRoot } from './workspace.js';

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.stubEnv('FACET_CACHE_DIR', undefined);
  vi.stubEnv('FACET_DEV_ROOT', undefined);
  vi.stubEnv('XDG_CACHE_HOME', undefined);
});

test('defaults to the shared XDG cache directory', () => {
  expect(runtimeCacheRoot()).toBe(join(homedir(), '.cache', 'facet'));
});

test('uses XDG_CACHE_HOME instead of a consumer-local directory', () => {
  const cache = resolve('.tmp/xdg-cache');
  vi.stubEnv('XDG_CACHE_HOME', cache);
  vi.stubEnv('FACET_CACHE_DIR', '');
  expect(runtimeCacheRoot()).toBe(join(cache, 'facet'));
});

test('resolves a relative runtime cache before loading installed native tools', () => {
  vi.stubEnv('FACET_CACHE_DIR', '.tmp/relative-runtime');
  vi.stubEnv('XDG_CACHE_HOME', resolve('.tmp/xdg-cache'));
  expect(runtimeCacheRoot()).toBe(resolve('.tmp/relative-runtime'));
});
