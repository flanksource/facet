import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activateDevRuntime, devRuntime, devRuntimeManifest, resolveDevRuntime } from './dev.js';
import { compilationWorkspace, runtimeCacheRoot, serverCacheDirectory } from './workspace.js';
import { toolPath } from './tools.js';
import { checkGlobalModuleStore, fixGlobalModuleStore } from '../commands/doctor-runtime.js';

let scratch: string;
let facet: string;
let ui: string;
let compiler: string;

beforeEach(() => {
  mkdirSync(resolve('../.tmp'), { recursive: true });
  scratch = mkdtempSync(resolve('../.tmp/dev-runtime-'));
  facet = join(scratch, 'facet');
  ui = join(scratch, 'clicky-ui/packages/ui');
  compiler = join(scratch, 'clicky-ui/packages/page-runtime/dist/build/dependencies.mjs');
  for (const dir of [join(facet, 'cli/src'), join(facet, 'dist/runtime'), join(facet, 'node_modules/@flanksource'), join(ui, 'dist/runtime'), join(scratch, 'clicky-ui/packages/page-runtime/dist/build')]) mkdirSync(dir, { recursive: true });
  writeFileSync(join(facet, 'package.json'), JSON.stringify({ name: '@flanksource/facet', version: '1.0.0' }));
  writeFileSync(join(facet, 'cli/src/cli.ts'), '');
  writeFileSync(join(facet, 'dist/runtime/importmap.json'), '{}');
  writeFileSync(join(ui, 'package.json'), JSON.stringify({ name: '@flanksource/clicky-ui', version: '1.0.0' }));
  writeFileSync(join(ui, 'dist/runtime/importmap.json'), '{}');
  writeFileSync(join(scratch, 'clicky-ui/packages/page-runtime/package.json'), JSON.stringify({ name: '@flanksource/page-runtime', exports: { './build/dependencies': './dist/build/dependencies.mjs' } }));
  writeFileSync(compiler, 'export const marker = "local compiler";');
  symlinkSync(ui, join(facet, 'node_modules/@flanksource/clicky-ui'), 'junction');
  symlinkSync(join(scratch, 'clicky-ui/packages/page-runtime'), join(facet, 'node_modules/@flanksource/page-runtime'), 'junction');
  vi.stubEnv('FACET_DEV_ROOT', '');
  vi.stubEnv('FACET_PACKAGE_PATH', '');
  vi.stubEnv('FACET_CACHE_DIR', join(scratch, 'cache'));
});

afterEach(() => { vi.unstubAllEnvs(); rmSync(scratch, { recursive: true, force: true }); });

describe('local rendering runtime', () => {
  it('uses linked Clicky UI and compiler builds from a Facet checkout', async () => {
    expect(resolveDevRuntime(facet)).toEqual({ facetRoot: realpathSync(facet), clickyUiRoot: realpathSync(ui), compiler: realpathSync(compiler) });
    vi.stubEnv('FACET_DEV_ROOT', facet);
    expect(await toolPath('@flanksource/page-runtime-build/dependencies')).toBe(realpathSync(compiler));
  });

  it('discovers the sibling checkout from a consumer and propagates it to loader processes', () => {
    const consumer = join(scratch, 'consumer/nested');
    mkdirSync(consumer, { recursive: true });
    activateDevRuntime(consumer);
    expect(process.env.FACET_DEV_ROOT).toBe(realpathSync(facet));
    expect(process.env.FACET_PACKAGE_PATH).toBe(realpathSync(facet));
    expect(devRuntime()?.clickyUiRoot).toBe(realpathSync(ui));
  });

  it('keeps consumer dependencies while forcing both local libraries over registry overrides', () => {
    vi.stubEnv('FACET_DEV_ROOT', facet);
    const manifest = devRuntimeManifest({ dependencies: { 'example-kit': '1.2.3', '@flanksource/facet': '^1' }, pnpm: { overrides: { '@flanksource/clicky-ui': '^1', 'example-kit': '1.2.4' } } });
    const links = { '@flanksource/facet': `link:${realpathSync(facet)}`, '@flanksource/clicky-ui': `link:${realpathSync(ui)}` };
    expect(manifest).toEqual({ dependencies: { 'example-kit': '1.2.3', ...links }, pnpm: { overrides: { 'example-kit': '1.2.4', ...links } } });
  });

  it('separates development runtime and compilation caches from the installed runtime', () => {
    const options = { consumerRoot: scratch, templatePath: 'Report.tsx' };
    const normal = { cache: runtimeCacheRoot(), compilation: compilationWorkspace(options) };
    const serverOptions = { cacheDir: join(scratch, 'server-cache'), templatesDir: scratch };
    const normalServer = serverCacheDirectory(serverOptions);
    vi.stubEnv('FACET_DEV_ROOT', facet);
    expect(runtimeCacheRoot()).not.toBe(normal.cache);
    expect(compilationWorkspace(options)).not.toBe(normal.compilation);
    expect(serverCacheDirectory(serverOptions)).not.toBe(normalServer);
  });

  it('fails instead of selecting a published UI when the local checkout is missing', () => {
    rmSync(join(facet, 'node_modules/@flanksource/clicky-ui'));
    expect(() => resolveDevRuntime(facet)).toThrow(/local.*clicky-ui/i);
  });

  it('reports the rebuild command when compiler output is missing', () => {
    rmSync(compiler);
    expect(() => resolveDevRuntime(facet)).toThrow(/build:builder/);
  });

  it('rejects an explicitly configured path that is not a Facet checkout', () => {
    vi.stubEnv('FACET_PACKAGE_PATH', ui);
    expect(() => activateDevRuntime(scratch)).toThrow(/Facet checkout/);
  });

  it('reports local runtime health without reading or extracting an installed archive', async () => {
    vi.stubEnv('FACET_DEV_ROOT', facet);
    expect(checkGlobalModuleStore()).toMatchObject({ status: 'pass', name: 'Local page runtime', message: expect.stringContaining(realpathSync(facet)) });
    expect(await fixGlobalModuleStore()).toMatchObject({ status: 'pass', name: 'Local page runtime' });
  });
});
