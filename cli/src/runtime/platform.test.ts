import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PUBLISHED_RUNTIME_PLATFORMS, runtimePlatformName } from './platform.js';

const { runtimePackages } = createRequire(import.meta.url)('../../scripts/runtime-packages.cjs') as { runtimePackages: (version: string) => Record<string, string> };

describe('PUBLISHED_RUNTIME_PLATFORMS', () => {
  it('names exactly the runtime packages declared as npm optionalDependencies', () => {
    expect(PUBLISHED_RUNTIME_PLATFORMS.map(name => `@flanksource/facet-runtime-${name}`)).toEqual(Object.keys(runtimePackages('0.0.0')));
  });

  it('uses runtimePlatformName names, with a libc suffix exactly on linux', () => {
    for (const name of PUBLISHED_RUNTIME_PLATFORMS) {
      const [platform, arch, libc] = name.split('-');
      expect(runtimePlatformName({ platform, arch, libc: platform === 'linux' ? libc as 'glibc' | 'musl' : undefined })).toBe(name);
      expect(libc === 'glibc' || libc === 'musl').toBe(platform === 'linux');
    }
  });

  it('excludes Windows x64, which has no released rendering runtime', () => {
    expect(PUBLISHED_RUNTIME_PLATFORMS).not.toContain('win32-x64');
  });
});
