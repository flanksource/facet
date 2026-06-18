import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  resolveTailwindBin,
  tailwindBinExists,
  runTailwind,
  TailwindBinNotFoundError,
} from './tailwind.js';

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
