import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync, symlinkSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Logger } from '../utils/logger.js';
import {
  FacetDirectory,
  localFacetBuildFingerprint,
  needsLocalFacetComponentsBuild,
  needsLocalFacetCssBuild,
  resolveFacetPackageOverride,
  serializeInjectedData,
} from './facet-directory.js';

let consumerRoot: string;
let facetRoot: string;
let logger: Logger;
let savedFacetPackagePath: string | undefined;

beforeEach(async () => {
  consumerRoot = await mkdtemp(join(tmpdir(), 'facet-fd-test-'));
  facetRoot = join(consumerRoot, '.facet');
  await mkdir(facetRoot, { recursive: true });
  savedFacetPackagePath = process.env.FACET_PACKAGE_PATH;
  delete process.env.FACET_PACKAGE_PATH;
  // Quiet logger — verbose=false suppresses debug, but warn/info still
  // print. Tests assert on return values, not on logger output.
  logger = new Logger(false);
});

afterEach(async () => {
  if (savedFacetPackagePath === undefined) delete process.env.FACET_PACKAGE_PATH;
  else process.env.FACET_PACKAGE_PATH = savedFacetPackagePath;
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

async function writeLocalFacetPackage(options: { scripts?: Record<string, string> } = {}) {
  const root = join(consumerRoot, 'local-facet');
  await mkdir(join(root, 'src/components'), { recursive: true });
  await mkdir(join(root, 'cli'), { recursive: true });
  await mkdir(join(root, 'dist/components'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({
    name: '@flanksource/facet',
    version: '9.9.9-local',
    dependencies: {
      react: '^18.2.0',
      vite: '^9.9.9',
      tailwindcss: '^3.4.0',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^9.9.9',
    },
    scripts: options.scripts ?? {
      'build:components': 'echo build-components',
      'build:css': 'echo build-css',
    },
  }, null, 2));
  await writeFile(join(root, 'src/styles.css'), '/* local facet styles */\n.local-only { color: red; }\n');
  await writeFile(join(root, 'src/components/index.tsx'), 'export const Marker = "source";\n');
  await writeFile(join(root, 'dist/styles.css'), '/* built local css */\n');
  await writeFile(join(root, 'dist/components/index.js'), 'export const Marker = "built";\n');

  const oldTime = new Date(Date.now() - 60_000);
  const newTime = new Date(Date.now() + 60_000);
  for (const rel of ['package.json', 'src/styles.css', 'src/components/index.tsx']) {
    utimesSync(join(root, rel), oldTime, oldTime);
  }
  for (const rel of ['dist/styles.css', 'dist/components/index.js']) {
    utimesSync(join(root, rel), newTime, newTime);
  }
  return root;
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

describe('FACET_PACKAGE_PATH local directory override', () => {
  it('resolves directory and tarball overrides distinctly', async () => {
    const localRoot = await writeLocalFacetPackage();
    expect(resolveFacetPackageOverride(localRoot)).toEqual({ kind: 'directory', path: localRoot });

    const tarball = join(consumerRoot, 'facet.tgz');
    await writeFile(tarball, 'fake tarball');
    expect(resolveFacetPackageOverride(tarball)).toEqual({ kind: 'tarball', path: tarball });
  });

  it('copies default styles from the local checkout', async () => {
    const localRoot = await writeLocalFacetPackage();
    process.env.FACET_PACKAGE_PATH = localRoot;
    const facetDir = newFacetDir();
    facetDir.create();

    facetDir.copyStylesCss();

    expect(await readFile(join(facetRoot, 'src/styles.css'), 'utf-8')).toContain('local facet styles');
  });

  it('uses local package metadata and writes a build fingerprint into .facet/package.json', async () => {
    const localRoot = await writeLocalFacetPackage();
    process.env.FACET_PACKAGE_PATH = localRoot;

    newFacetDir().generatePackageJson();

    const generated = JSON.parse(await readFile(join(facetRoot, 'package.json'), 'utf-8'));
    expect(generated.dependencies['@flanksource/facet']).toBe(`file:${localRoot}`);
    expect(generated.dependencies.vite).toBe('^9.9.9');
    expect(generated.dependencies['@vitejs/plugin-react']).toBe('^9.9.9');
    expect(generated.facetLocalOverride).toEqual({
      path: localRoot,
      fingerprint: localFacetBuildFingerprint(localRoot),
    });
  });

  it('keeps tarball overrides dependency-only', async () => {
    const tarball = join(consumerRoot, 'facet.tgz');
    await writeFile(tarball, 'fake tarball');
    process.env.FACET_PACKAGE_PATH = tarball;

    newFacetDir().generatePackageJson();

    const generated = JSON.parse(await readFile(join(facetRoot, 'package.json'), 'utf-8'));
    expect(generated.dependencies['@flanksource/facet']).toBe(`file:${tarball}`);
    expect(generated.facetLocalOverride).toBeUndefined();
  });

  it('changes the local build fingerprint when local dist output changes', async () => {
    const localRoot = await writeLocalFacetPackage();
    const before = localFacetBuildFingerprint(localRoot);

    await writeFile(join(localRoot, 'dist/components/index.js'), 'export const Marker = "changed";\n');
    const future = new Date(Date.now() + 120_000);
    utimesSync(join(localRoot, 'dist/components/index.js'), future, future);

    expect(localFacetBuildFingerprint(localRoot)).not.toBe(before);
  });

  it('detects stale component and css outputs without invoking pnpm', async () => {
    const localRoot = await writeLocalFacetPackage();
    const oldTime = new Date(Date.now() - 120_000);
    const future = new Date(Date.now() + 120_000);

    utimesSync(join(localRoot, 'dist/components/index.js'), oldTime, oldTime);
    utimesSync(join(localRoot, 'src/components/index.tsx'), future, future);
    expect(needsLocalFacetComponentsBuild(localRoot)).toBe(true);

    utimesSync(join(localRoot, 'dist/styles.css'), oldTime, oldTime);
    utimesSync(join(localRoot, 'src/styles.css'), future, future);
    expect(needsLocalFacetCssBuild(localRoot)).toBe(true);
  });

  it('detects css output removal after components clean dist', async () => {
    const localRoot = await writeLocalFacetPackage();
    const oldTime = new Date(Date.now() - 120_000);
    const future = new Date(Date.now() + 120_000);

    utimesSync(join(localRoot, 'src/styles.css'), oldTime, oldTime);
    utimesSync(join(localRoot, 'dist/styles.css'), future, future);
    expect(needsLocalFacetCssBuild(localRoot)).toBe(false);

    await rm(join(localRoot, 'dist/styles.css'), { force: true });
    expect(needsLocalFacetCssBuild(localRoot)).toBe(true);
  });

  it('removes a stale installed local package copy when package.json is unchanged', async () => {
    const localRoot = await writeLocalFacetPackage();
    process.env.FACET_PACKAGE_PATH = localRoot;
    const facetDir = newFacetDir();

    facetDir.generatePackageJson();

    const installedRoot = join(facetRoot, 'node_modules/@flanksource/facet');
    await mkdir(join(installedRoot, 'dist/components'), { recursive: true });
    await writeFile(join(installedRoot, 'package.json'), await readFile(join(localRoot, 'package.json'), 'utf-8'));
    await writeFile(join(installedRoot, 'dist/components/index.js'), 'export const Marker = "stale";\n');
    await writeFile(join(facetRoot, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');

    facetDir.generatePackageJson();

    expect(existsSync(installedRoot)).toBe(false);
    expect(existsSync(join(facetRoot, 'pnpm-lock.yaml'))).toBe(false);
  });
});

describe('serializeInjectedData', () => {
  it('escapes </script> so injected data cannot break out of the script tag', () => {
    const script = serializeInjectedData({ note: '</script><script>alert(1)</script>' });
    expect(script).not.toContain('</script>');
    expect(script).toContain('\\u003c/script>');
  });

  it('escapes U+2028 and U+2029 line separators', () => {
    const script = serializeInjectedData({ note: 'a\u2028b\u2029c' });
    expect(script).not.toContain('\u2028');
    expect(script).not.toContain('\u2029');
    expect(script).toContain('\\u2028');
    expect(script).toContain('\\u2029');
  });

  it('round-trips back to the original data', () => {
    const data = { a: 1, b: '</script>', c: ['x y'] };
    const script = serializeInjectedData(data);
    const json = script.replace(/^window\.__FACET_DATA__ = /, '').replace(/;\n$/, '');
    expect(JSON.parse(json)).toEqual(data);
  });
});
