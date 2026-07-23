import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  renderedClassKey,
  runTailwindCached,
  tailwindDirectivesPresent,
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

describe('tailwindDirectivesPresent', () => {
  function facetRootWith(files: Record<string, string>): string {
    const facetRoot = mkdtempSync(join(tmpdir(), 'facet-tw-directives-'));
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(facetRoot, name), content);
    }
    return facetRoot;
  }

  it('is false for pre-expanded CSS with only relative and URL imports', () => {
    const facetRoot = facetRootWith({
      'post-process.css': "@import './facet.css';\n",
      'facet.css': '@import url("https://fonts.example/css");\n.page { color: red; }\n',
    });
    try {
      expect(tailwindDirectivesPresent(facetRoot)).toBe(false);
    } finally {
      rmSync(facetRoot, { recursive: true, force: true });
    }
  });

  it('detects @tailwind directives through relative imports', () => {
    const facetRoot = facetRootWith({
      'post-process.css': "@import './facet.css';\n@import './custom.css';\n",
      'facet.css': '.page { color: red; }\n',
      'custom.css': '@tailwind utilities;\n',
    });
    try {
      expect(tailwindDirectivesPresent(facetRoot)).toBe(true);
    } finally {
      rmSync(facetRoot, { recursive: true, force: true });
    }
  });

  it('assumes directives when imports cannot be inspected', () => {
    const packageImport = facetRootWith({
      'post-process.css': "@import 'some-package/styles.css';\n",
    });
    const missingFile = facetRootWith({
      'post-process.css': "@import './missing.css';\n",
    });
    try {
      expect(tailwindDirectivesPresent(packageImport)).toBe(true);
      expect(tailwindDirectivesPresent(missingFile)).toBe(true);
    } finally {
      rmSync(packageImport, { recursive: true, force: true });
      rmSync(missingFile, { recursive: true, force: true });
    }
  });
});

describe('runTailwindCached', () => {
  it('refreshes a cache hit timestamp', async () => {
    const facetRoot = mkdtempSync(join(tmpdir(), 'facet-tw-cache-test-'));
    try {
      const html = '<div class="font-bold"></div>';
      const cacheDir = join(facetRoot, 'tailwind-cache');
      const cachePath = join(cacheDir, `build-${renderedClassKey(html).key}.css`);
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
