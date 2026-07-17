import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync, statSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  resolveTailwindBin,
  tailwindBinExists,
  runTailwind,
  renderedClassKey,
  runTailwindCached,
  TailwindBinNotFoundError,
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
        stylesInput: join(facetRoot, 'styles.css'),
        html,
        buildCacheKey: 'build',
      })).resolves.toContain('font-weight');
      expect(statSync(cachePath).mtimeMs).toBeGreaterThan(old.getTime());
    } finally {
      rmSync(facetRoot, { recursive: true, force: true });
    }
  });
});

describe('resolveTailwindBin', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns node_modules/.bin/tailwindcss on POSIX', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    expect(resolveTailwindBin('/tmp/.facet')).toBe(
      join('/tmp/.facet', 'node_modules', '.bin', 'tailwindcss'),
    );
  });

  it('returns node_modules/.bin/tailwindcss.cmd on Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    expect(resolveTailwindBin('C:\\proj\\.facet')).toBe(
      join('C:\\proj\\.facet', 'node_modules', '.bin', 'tailwindcss.cmd'),
    );
  });
});

describe('tailwindBinExists', () => {
  let facetRoot: string;

  beforeEach(() => {
    facetRoot = mkdtempSync(join(tmpdir(), 'facet-tw-test-'));
  });

  afterEach(() => {
    rmSync(facetRoot, { recursive: true, force: true });
  });

  it('returns false when .bin/tailwindcss is missing', () => {
    expect(tailwindBinExists(facetRoot)).toBe(false);
  });

  it('returns true when .bin/tailwindcss exists', () => {
    const binDir = join(facetRoot, 'node_modules', '.bin');
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(binDir, 'tailwindcss'), '#!/bin/sh\n');
    chmodSync(join(binDir, 'tailwindcss'), 0o755);
    expect(tailwindBinExists(facetRoot)).toBe(true);
  });
});

describe('runTailwind', () => {
  let facetRoot: string;

  beforeEach(() => {
    facetRoot = mkdtempSync(join(tmpdir(), 'facet-tw-test-'));
  });

  afterEach(() => {
    rmSync(facetRoot, { recursive: true, force: true });
  });

  it('throws TailwindBinNotFoundError when binary is missing', async () => {
    await expect(
      runTailwind({
        facetRoot,
        stylesInput: '/tmp/in.css',
        contentPath: '/tmp/in.html',
        outputCssPath: '/tmp/out.css',
      }),
    ).rejects.toBeInstanceOf(TailwindBinNotFoundError);
  });

  it('error message includes the expected binary path', async () => {
    const expected = resolveTailwindBin(facetRoot);
    await expect(
      runTailwind({
        facetRoot,
        stylesInput: '/tmp/in.css',
        contentPath: '/tmp/in.html',
        outputCssPath: '/tmp/out.css',
      }),
    ).rejects.toThrow(expected);
  });
});
