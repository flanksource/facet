import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PUBLISHED_RUNTIME_PLATFORMS } from './platform.js';

const { runtimePackages } = createRequire(import.meta.url)('../../scripts/runtime-packages.cjs') as { runtimePackages: (version: string) => Record<string, string> };

describe('PUBLISHED_RUNTIME_PLATFORMS', () => {
  it('names exactly the runtime packages declared as npm optionalDependencies', () => {
    expect(PUBLISHED_RUNTIME_PLATFORMS.map(name => `@flanksource/facet-runtime-${name}`)).toEqual(Object.keys(runtimePackages('0.0.0')));
  });

  it('excludes Windows x64, which has no released rendering runtime', () => {
    expect(PUBLISHED_RUNTIME_PLATFORMS).not.toContain('win32-x64');
  });
});
