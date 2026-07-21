import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { shouldUseLiveRendering } from './live-template.js';

const fixture = (name: string) => fileURLToPath(new URL(`../../test/fixtures/${name}`, import.meta.url));

describe('shouldUseLiveRendering', () => {
  it('enables live rendering when requested explicitly', () => {
    expect(shouldUseLiveRendering(true, fixture('standard-template.tsx'))).toBe(true);
  });

  it('enables live rendering when the first non-empty line is // @live', () => {
    expect(shouldUseLiveRendering(false, fixture('live-template.tsx'))).toBe(true);
  });

  it('does not enable live rendering for a later // @live comment', () => {
    expect(shouldUseLiveRendering(false, fixture('standard-template.tsx'))).toBe(false);
  });
});
