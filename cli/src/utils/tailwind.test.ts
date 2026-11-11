import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  assertTailwindV4,
  cssInputKey,
  renderedClassKey,
  runTailwindCached,
} from './tailwind.js';

describe('renderedClassKey', () => {
  it('ignores text and class ordering', () => {
    const first = renderedClassKey('<p class="font-bold text-red-500">first</p>');
    const second = renderedClassKey("<p class='text-red-500 font-bold'>different data</p>");
    expect(first.key).toBe(second.key);
    expect(first.content).toContain('font-bold text-red-500');
  });

  it('changes when conditional classes change', () => {
    expect(renderedClassKey('<div class="block"/>').key)
      .not.toBe(renderedClassKey('<div class="hidden"/>').key);
  });
});

describe('assertTailwindV4', () => {
  function facetRootWithTailwind(version: string): string {
    const facetRoot = mkdtempSync(join(tmpdir(), 'facet-tw-version-'));
    mkdirSync(join(facetRoot, 'node_modules', 'tailwindcss'), { recursive: true });
    writeFileSync(join(facetRoot, 'package.json'), '{"type":"module"}');
    writeFileSync(
      join(facetRoot, 'node_modules', 'tailwindcss', 'package.json'),
      JSON.stringify({ name: 'tailwindcss', version }),
    );
    return facetRoot;
  }

  it.each(['3.4.19', '2.2.19', '5.0.0'])('rejects tailwindcss %s, naming the found version and the v4 requirement', (version) => {
    const facetRoot = facetRootWithTailwind(version);
    try {
      expect(() => assertTailwindV4(facetRoot))
        .toThrow(new RegExp(`tailwindcss ${version.replaceAll('.', '\\.')}.*requires Tailwind CSS v4.*@tailwindcss/vite`));
    } finally {
      rmSync(facetRoot, { recursive: true, force: true });
    }
  });

  it('accepts tailwindcss v4', () => {
    const facetRoot = facetRootWithTailwind('4.1.17');
    try {
      expect(() => assertTailwindV4(facetRoot)).not.toThrow();
    } finally {
      rmSync(facetRoot, { recursive: true, force: true });
    }
  });
});

describe('cssInputKey', () => {
  it('changes when the stylesheet changes', () => {
    // Neither of the other cache-key parts covers the stylesheets: the build
    // key hashes consumer files plus the facet version, and the class key
    // hashes the rendered HTML. Without this, editing facet.css — or
    // installing a patched build at the same version — served stale CSS, which
    // reads as the edit simply having no effect.
    const facetRoot = mkdtempSync(join(tmpdir(), 'facet-css-key-'));
    try {
      writeFileSync(join(facetRoot, 'facet.css'), 'h1{font-size:22pt}');
      const before = cssInputKey(facetRoot);

      writeFileSync(join(facetRoot, 'facet.css'), 'h1{font-size:26pt}');

      expect(cssInputKey(facetRoot)).not.toBe(before);
    } finally {
      rmSync(facetRoot, { recursive: true, force: true });
    }
  });
});

describe('runTailwindCached', () => {
  it('refreshes a cache hit timestamp', async () => {
    const facetRoot = mkdtempSync(join(tmpdir(), 'facet-tw-cache-test-'));
    try {
      const html = '<div class="font-bold"></div>';
      const cacheDir = join(facetRoot, 'tailwind-cache');
      const cachePath = join(cacheDir, `build-${renderedClassKey(html).key}-${cssInputKey(facetRoot)}.css`);
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cachePath, '.font-bold{font-weight:700}');
      const old = new Date(Date.now() - 60_000);
      utimesSync(cachePath, old, old);

      await expect(runTailwindCached({
        facetRoot,
        html,
        buildCacheKey: 'build',
      })).resolves.toContain('font-weight');
      expect(statSync(cachePath).mtimeMs).toBeGreaterThan(old.getTime());
    } finally {
      rmSync(facetRoot, { recursive: true, force: true });
    }
  });
});
