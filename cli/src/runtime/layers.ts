import { copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, readdirSync, readlinkSync, renameSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { satisfies } from 'semver';
import type { DependencyRuntime, RuntimeExport } from '@flanksource/page-runtime/build/dependencies';
import type { RuntimeBuildProgress } from './build-progress.js';

export type RuntimeCompiler = typeof import('@flanksource/page-runtime/build/dependencies');
export const facet = '@flanksource/facet';
export const clicky = '@flanksource/clicky-ui';
export const catalogPackage = '@flanksource/facet-template-runtime';
export const catalogVersion = '0.0.0';
export const catalogPath = `browser-packages/template-runtime`;
export const layersFile = 'runtime-layers.json';

export type BrowserExports = Awaited<ReturnType<RuntimeCompiler['buildBrowserRuntimeExports']>>;
export type BrowserCatalog = Omit<BrowserExports['fragment'], 'fragment' | 'name' | 'aliases' | 'inherits' | 'compiler'> & { versions: Record<string, string> };
export interface RuntimeLayers {
  versions: Record<string, string>;
  browserPackages: import('./named.js').NamedRuntime['browserPackages'];
  browserCatalog: BrowserCatalog;
}

export function readRuntimeLayers(root: string): RuntimeLayers | undefined {
  const path = join(root, layersFile);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as RuntimeLayers : undefined;
}

const owner = (name: string) => name.split('/').slice(0, name.startsWith('@') ? 2 : 1).join('/');

export function unpackLayerManifest(input: Record<string, unknown>, versions: Record<string, string>, report?: (line: string) => void): Record<string, unknown> {
  const dependencies = input.dependencies as Record<string, string>;
  const extra = Object.fromEntries(Object.entries(dependencies).filter(([name]) => {
    if (!Object.hasOwn(versions, name)) return true;
    report?.(`Using ${name}@${versions[name]} from the runtime (project requested ${dependencies[name]})`);
    return false;
  }));
  const filter = (rules: Record<string, unknown> = {}) => Object.fromEntries(Object.entries(rules).filter(([key]) => {
    const target = key.split('>').at(-1)!.trim().replace(/(?<=.)@[^/]*$/, '');
    return !Object.hasOwn(versions, target);
  }));
  const { pnpm, overrides, resolutions, ...manifest } = input;
  const pnpmConfig = pnpm as { overrides?: Record<string, unknown> } | undefined;
  return { ...manifest, dependencies: extra, ...(pnpmConfig ? { pnpm: { ...pnpmConfig, overrides: filter(pnpmConfig.overrides) } } : {}), ...(overrides ? { overrides: filter(overrides as Record<string, unknown>) } : {}), ...(resolutions ? { resolutions: filter(resolutions as Record<string, unknown>) } : {}) };
}

export function snapshotTree(source: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) snapshotTree(from, to);
    else if (entry.isSymbolicLink()) symlinkSync(readlinkSync(from), to);
    else if (entry.isFile()) {
      try { linkSync(from, to); }
      catch (error) {
        if (!['EXDEV', 'ENOTSUP', 'EMLINK', 'EPERM'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
        copyFileSync(from, to);
      }
    }
  }
}

export function inheritModules(baseRoot: string, root: string): void {
  const source = join(baseRoot, 'node_modules');
  const base = join(root, '.facet-base', 'node_modules');
  const modules = join(root, 'node_modules');
  snapshotTree(source, base);
  const compiled = existsSync(join(root, 'page-runtime')) ? join(root, 'page-runtime') : join(baseRoot, 'page-runtime');
  symlinkSync(relative(dirname(base), compiled), join(dirname(base), 'page-runtime'), 'dir');
  mkdirSync(modules, { recursive: true });
  const link = (name: string) => {
    const target = join(modules, name);
    if (existsSync(target)) return;
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(relative(dirname(target), join(base, name)), target, 'dir');
  };
  for (const name of readdirSync(source).filter(name => !name.startsWith('.'))) {
    if (name.startsWith('@')) for (const scoped of readdirSync(join(source, name))) link(`${name}/${scoped}`);
    else link(name);
  }
}

export async function compileRuntimeLayer(options: {
  root: string; name: string; api: RuntimeCompiler; discovered: Record<string, RuntimeExport>;
  versions: Record<string, string>; progress: Pick<RuntimeBuildProgress, 'detail'>;
}): Promise<void> {
  const { root, name, api, discovered, versions, progress } = options;
  for (const target of ['node', 'browser'] as const) {
    const directory = join(root, 'page-runtime', target);
    const path = join(directory, 'runtime.json');
    const base: DependencyRuntime = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { schema: 1, target, imports: {}, styles: [], integrity: {}, inputs: {} };
    const entries = Object.keys(discovered).filter(specifier => !Object.hasOwn(base.imports, specifier));
    progress.detail(`${name} ${target}: ${Object.keys(base.imports).length} inherited, ${entries.length} new entries`);
    if (!entries.length) continue;
    const outDir = join(directory, 'layers', name);
    const compiled = await api.buildInstalledDependencyRuntime({
      root, target, outDir, entries, resolvedEntries: Object.fromEntries(entries.map(entry => [entry, discovered[entry]![target]])),
      external: Object.fromEntries(Object.entries(base.imports).map(([key, value]) => [key, join(directory, value)])), externalVersions: versions,
    });
    const prefix = (file: string) => `layers/${name}/${file}`;
    Object.assign(base.imports, Object.fromEntries(Object.entries(compiled.imports).map(([key, value]) => [key, prefix(value)])));
    Object.assign(base.integrity, Object.fromEntries(Object.entries(compiled.integrity).map(([key, value]) => [prefix(key), value])));
    Object.assign(base.inputs, compiled.inputs);
    base.styles.push(...compiled.styles.map(prefix));
    writeFileSync(`${path}.new`, JSON.stringify(base, null, 2));
    renameSync(`${path}.new`, path);
  }
}

export function checkProjectPeers(root: string, names: string[], inherited: Record<string, string>): void {
  for (const name of names) {
    const pkg = JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')) as { peerDependencies?: Record<string, string> };
    for (const [peer, range] of Object.entries(pkg.peerDependencies ?? {})) {
      const version = inherited[peer];
      if (version && !satisfies(version, range)) throw new Error(`${name} requires ${peer}@${range}; the Facet runtime provides ${peer}@${version}`);
    }
  }
}

export async function buildLayer(options: {
  root: string; name: string; api: RuntimeCompiler; discovered: Record<string, RuntimeExport>;
  versions: Record<string, string>; progress: Pick<RuntimeBuildProgress, 'detail'>;
}): Promise<BrowserExports> {
  const { root, name, api, discovered, versions } = options;
  const entries = Object.fromEntries(Object.entries(discovered).filter(([specifier]) => !Object.hasOwn(versions, owner(specifier))));
  const supplemental = Object.fromEntries(Object.entries(entries).filter(([specifier]) => ![clicky, facet, 'react', 'react-dom', 'scheduler', 'jotai', '@tanstack/react-query'].includes(owner(specifier))));
  options.progress.detail(`${name}: checking ${Object.keys(supplemental).length} public browser exports`);
  const browser = await api.buildBrowserRuntimeExports({ root, entries: supplemental, inherited: [clicky, facet], outDir: join(root, catalogPath, name), runtimeBase: `${catalogPackage}@${catalogVersion}/${name}/` });
  for (const specifier of Object.keys(supplemental)) if (!Object.hasOwn(browser.fragment.imports, specifier)) delete entries[specifier];
  await compileRuntimeLayer({ ...options, discovered: entries });
  Object.assign(versions, Object.fromEntries(Object.entries(entries).map(([specifier, entry]) => [owner(specifier), entry.version])));
  return browser;
}

export function inheritCompiledLayers(source: string, root: string): void {
  snapshotTree(join(source, 'page-runtime'), join(root, 'page-runtime'));
}
