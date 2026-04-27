import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync, symlinkSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Logger } from '../utils/logger.js';
import { FacetDirectory } from './facet-directory.js';

let consumerRoot: string;
let facetRoot: string;
let logger: Logger;

beforeEach(async () => {
  consumerRoot = await mkdtemp(join(tmpdir(), 'facet-fd-test-'));
  facetRoot = join(consumerRoot, '.facet');
  await mkdir(facetRoot, { recursive: true });
  // Quiet logger — verbose=false suppresses debug, but warn/info still
  // print. Tests assert on return values, not on logger output.
  logger = new Logger(false);
});

afterEach(async () => {
  await rm(consumerRoot, { recursive: true, force: true });
});

function newFacetDir(): FacetDirectory {
  return new FacetDirectory({
    consumerRoot,
    templateFile: 'template.tsx',
    logger,
  });
}

async function writeSentinels(deps: string[] = ['react', 'vite', '@vitejs/plugin-react', '@flanksource/facet']) {
  const nm = join(facetRoot, 'node_modules');
  for (const dep of deps) {
    const dir = join(nm, ...dep.split('/'));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: dep, version: '0.0.0' }));
  }
}

describe('FacetDirectory.needsInstall', () => {
  it('returns true when node_modules is missing', async () => {
    await writeFile(join(facetRoot, 'package.json'), '{}');
    expect(newFacetDir().needsInstall()).toBe(true);
  });

  it('returns true when node_modules is empty', async () => {
    await writeFile(join(facetRoot, 'package.json'), '{}');
    await mkdir(join(facetRoot, 'node_modules'));
    expect(newFacetDir().needsInstall()).toBe(true);
  });

  it('returns true when a sentinel package is missing', async () => {
    await writeFile(join(facetRoot, 'package.json'), '{}');
    await writeSentinels(['react', 'vite']); // missing @vitejs/plugin-react and @flanksource/facet
    expect(newFacetDir().needsInstall()).toBe(true);
  });

  it('returns true when package.json mtime is newer than node_modules', async () => {
    await writeSentinels();
    await writeFile(join(facetRoot, 'package.json'), '{}');
    const future = new Date(Date.now() + 60_000);
    utimesSync(join(facetRoot, 'package.json'), future, future);
    const past = new Date(Date.now() - 60_000);
    utimesSync(join(facetRoot, 'node_modules'), past, past);
    expect(newFacetDir().needsInstall()).toBe(true);
  });

  it('returns false when sentinels exist and node_modules is newer than package.json', async () => {
    await writeFile(join(facetRoot, 'package.json'), '{}');
    await writeSentinels();
    const past = new Date(Date.now() - 60_000);
    utimesSync(join(facetRoot, 'package.json'), past, past);
    const future = new Date(Date.now() + 60_000);
    utimesSync(join(facetRoot, 'node_modules'), future, future);
    expect(newFacetDir().needsInstall()).toBe(false);
  });
});

describe('FacetDirectory.isInstallBroken', () => {
  it('returns true when node_modules is missing', () => {
    expect(newFacetDir().isInstallBroken()).toBe(true);
  });

  it('returns true when node_modules is empty', async () => {
    await mkdir(join(facetRoot, 'node_modules'));
    expect(newFacetDir().isInstallBroken()).toBe(true);
  });

  it('returns true when react/package.json is missing', async () => {
    await writeSentinels(['vite', '@vitejs/plugin-react', '@flanksource/facet']);
    expect(newFacetDir().isInstallBroken()).toBe(true);
  });

  it('returns true when a sentinel symlink is dangling', async () => {
    await writeSentinels(['react', '@vitejs/plugin-react', '@flanksource/facet']);
    const viteDir = join(facetRoot, 'node_modules', 'vite');
    await mkdir(viteDir, { recursive: true });
    symlinkSync('/nonexistent-target', join(viteDir, 'package.json'));
    expect(newFacetDir().isInstallBroken()).toBe(true);
  });

  it('returns false when all sentinels exist as real files', async () => {
    await writeSentinels();
    expect(newFacetDir().isInstallBroken()).toBe(false);
  });
});

describe('FacetDirectory.nukeInstall', () => {
  it('removes node_modules and pnpm-lock.yaml', async () => {
    await writeSentinels();
    await writeFile(join(facetRoot, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
    await mkdir(join(facetRoot, '.pnpm-store'));

    newFacetDir().nukeInstall();

    expect(existsSync(join(facetRoot, 'node_modules'))).toBe(false);
    expect(existsSync(join(facetRoot, 'pnpm-lock.yaml'))).toBe(false);
    expect(existsSync(join(facetRoot, '.pnpm-store'))).toBe(false);
  });

  it('is a no-op when nothing is installed', () => {
    expect(() => newFacetDir().nukeInstall()).not.toThrow();
  });

  it('removes a symlinked node_modules without following the link', async () => {
    const externalCache = await mkdtemp(join(tmpdir(), 'facet-cache-'));
    await writeFile(join(externalCache, 'sentinel.txt'), 'do-not-delete');
    symlinkSync(externalCache, join(facetRoot, 'node_modules'), 'junction');
    await writeFile(join(facetRoot, 'package-lock.json'), '{}');
    newFacetDir().nukeInstall();
    expect(existsSync(join(facetRoot, 'node_modules'))).toBe(false);
    expect(existsSync(join(facetRoot, 'package-lock.json'))).toBe(false);
    expect(existsSync(join(externalCache, 'sentinel.txt'))).toBe(true);
    await rm(externalCache, { recursive: true, force: true });
  });
});

describe('FacetDirectory.isInstallBroken foreign markers', () => {
  it('flags installs with a sibling package-lock.json as broken', async () => {
    await writeSentinels();
    await writeFile(join(facetRoot, 'package-lock.json'), '{}');
    expect(newFacetDir().isInstallBroken()).toBe(true);
  });

  it('flags symlinked node_modules as broken', async () => {
    const externalCache = await mkdtemp(join(tmpdir(), 'facet-cache-'));
    symlinkSync(externalCache, join(facetRoot, 'node_modules'), 'junction');
    expect(newFacetDir().isInstallBroken()).toBe(true);
    await rm(externalCache, { recursive: true, force: true });
  });
});

describe('FacetDirectory.generatePackageJson .npmrc', () => {
  it('disables modules-purge confirmation so non-interactive pnpm runs do not abort', async () => {
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({ name: 'consumer', version: '0.0.0' }));
    newFacetDir().generatePackageJson();
    const npmrc = await readFile(join(facetRoot, '.npmrc'), 'utf-8');
    expect(npmrc).toContain('confirm-modules-purge=false');
  });
});
