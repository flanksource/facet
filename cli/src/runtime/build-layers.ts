import { join } from 'node:path';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { satisfies } from 'semver';
import { installModules } from './install.js';
import { prepareBrowserPackages, runtimeLibraryPeers } from './named-browser.js';
import { buildLayer, clicky, compileRuntimeLayer, facet, inheritCompiledLayers, inheritModules, layersFile, snapshotTree, checkProjectPeers, type BrowserExports, type RuntimeCompiler, type RuntimeLayers } from './layers.js';
import type { RuntimeBuildProgress } from './build-progress.js';

type BuildOptions = { root: string; api: RuntimeCompiler; npmrc: string; progress: RuntimeBuildProgress };

function mergeCatalog(layers: BrowserExports[], inherited?: RuntimeLayers): RuntimeLayers['browserCatalog'] {
  const catalog: RuntimeLayers['browserCatalog'] = structuredClone(inherited?.browserCatalog ?? { imports: {}, scopes: {}, remaps: {}, integrity: {}, versions: {} });
  for (const { fragment, versions } of layers) {
    for (const field of ['imports', 'remaps', 'integrity'] as const) for (const [key, value] of Object.entries(fragment[field])) catalog[field][key] ??= value;
    for (const [scope, entries] of Object.entries(fragment.scopes)) {
      const base = catalog.scopes[scope] ??= {};
      for (const [name, path] of Object.entries(entries)) base[name] ??= path;
    }
    Object.assign(catalog.versions, versions);
  }
  return catalog;
}

export async function installRuntimePeers(root: string, manifest: Record<string, unknown>, progress: RuntimeBuildProgress): Promise<void> {
  const peers = runtimeLibraryPeers(root);
  if (!Object.keys(peers).length) return;
  progress.detail(`Installing ${Object.keys(peers).length} browser runtime peers`);
  rmSync(join(root, 'node_modules'), { recursive: true });
  rmSync(join(root, 'pnpm-lock.yaml'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ ...manifest, dependencies: { ...peers, ...manifest.dependencies as Record<string, string> } }));
  await installModules(root, { progress: progress.output });
}

async function installRuntimePins(options: BuildOptions & { name: string; pins: Record<string, string> }): Promise<string | undefined> {
  const { root, name, pins, npmrc, progress } = options;
  if (!Object.keys(pins).length) return undefined;
  const directory = join(root, '.runtime-pins', name);
  mkdirSync(directory, { recursive: true });
  const { packageManager } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const react = JSON.parse(readFileSync(join(root, 'node_modules/react/package.json'), 'utf8')).version;
  const reactDOM = JSON.parse(readFileSync(join(root, 'node_modules/react-dom/package.json'), 'utf8')).version;
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ private: true, packageManager, dependencies: { react, 'react-dom': reactDOM, ...pins } }));
  const config = join(directory, '.npmrc');
  writeFileSync(config, npmrc, { mode: 0o600 });
  try {
    progress.detail(`Installing ${Object.keys(pins).length} exact browser dependency versions for ${name}`);
    await installModules(directory, { progress: progress.output, nodeLinker: 'isolated' });
  } finally { rmSync(config); }
  return directory;
}

export async function buildRuntimeBase(options: BuildOptions & { extras?: string[] }): Promise<RuntimeLayers> {
  const { root, api, progress } = options;
  const read = (name: string) => JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'));
  const facetPackage = read(facet);
  const clickyPackage = read(clicky);
  const range = facetPackage.dependencies?.[clicky] ?? facetPackage.peerDependencies?.[clicky];
  if (!range || !satisfies(clickyPackage.version, range)) throw new Error(`Facet ${facetPackage.version} requires Clicky UI ${range ?? '(missing peer declaration)'}, but the runtime has ${clickyPackage.version}`);
  const versions: Record<string, string> = {};
  progress.stage('node', 'Building Clicky UI and Facet dependency layers');
  const supplemental = [];
  for (const [library, name] of [[clicky, 'clicky-ui'], [facet, 'facet']] as const) {
    progress.detail(`Discovering ${library} exports`);
    const pins = api.runtimeExportPins({ root, library, inherited: versions });
    const pinnedRoot = await installRuntimePins({ ...options, name, pins });
    const discovered = api.discoverRuntimeExports({ root, library, pins, ...(pinnedRoot ? { pinnedRoot } : {}) });
    supplemental.push(await buildLayer({ root, api, name, discovered, versions, progress }));
  }
  const extras = (options.extras ?? []).filter(name => !Object.hasOwn(versions, name));
  if (extras.length) {
    checkProjectPeers(root, extras, versions);
    supplemental.push(await buildLayer({ root, api, name: 'project', discovered: api.discoverRuntimeExports({ root, packages: extras }), versions, progress }));
  }
  return saveRuntimeLayers({ ...options, versions, supplemental, extras });
}

export async function extendRuntimeBase(options: BuildOptions & { baseRoot: string; base: RuntimeLayers; extras: string[] }): Promise<RuntimeLayers> {
  const { root, api, progress, baseRoot, base, extras } = options;
  inheritCompiledLayers(baseRoot, root);
  inheritModules(baseRoot, root);
  snapshotTree(join(baseRoot, 'browser-packages'), join(root, 'browser-packages'));
  checkProjectPeers(root, extras, base.versions);
  const versions = { ...base.versions };
  progress.stage('node', 'Building project dependency layer');
  if (!extras.length) await compileRuntimeLayer({ root, api, name: 'project', discovered: {}, versions, progress });
  const supplemental = extras.length ? [await buildLayer({ root, api, name: 'project', discovered: api.discoverRuntimeExports({ root, packages: extras }), versions, progress })] : [];
  return saveRuntimeLayers({ ...options, versions, supplemental, inherited: base });
}

async function saveRuntimeLayers(options: BuildOptions & { versions: Record<string, string>; supplemental: BrowserExports[]; extras: string[]; inherited?: RuntimeLayers }): Promise<RuntimeLayers> {
  const { root, versions, supplemental, inherited } = options;
  const browserCatalog = mergeCatalog(supplemental, inherited);
  options.progress.stage('browser', 'Finalizing the browser import catalog');
  const browserPackages = await prepareBrowserPackages({ ...options, inherited: inherited?.browserPackages, extras: options.extras.filter(name => Object.hasOwn(browserCatalog.versions, name)) });
  const layers = { versions, browserCatalog, browserPackages };
  writeFileSync(join(root, layersFile), JSON.stringify(layers, null, 2));
  return layers;
}
