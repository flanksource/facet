import { execFile } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { readWorkspaceOverrides, snapshotPackageManifest } from '../builders/consumer-dependencies.js';
import { assetPath } from '../utils/assets.js';
import type { RuntimeBuildProgress } from './build-progress.js';
import { installModules } from './install.js';
import { createDefaultModulePackageJson, defaultModuleNpmrc, type EmbeddedFacetPackage } from './manifest.js';
import { publishNamedRuntime, type NamedRuntime } from './named.js';
import { toolPath } from './tools.js';
import { sharedRuntimeCacheRoot } from './workspace.js';
import { buildRuntimeBase, extendRuntimeBase, installRuntimePeers } from './build-layers.js';
import { readRuntimeLayers, unpackLayerManifest, type RuntimeCompiler } from './layers.js';
import { installedRuntime, installedRuntimePayload } from './installed.js';
import { readBuildGit } from './build-git.js';

const facet = '@flanksource/facet';
const clicky = '@flanksource/clicky-ui';
const compiler = '@flanksource/page-runtime-build';
const run = promisify(execFile);

interface ProjectPackage extends EmbeddedFacetPackage {
  name?: string;
  type?: string;
  main?: string;
  module?: string;
  exports?: Record<string, unknown> | string;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  pnpm?: { overrides?: Record<string, unknown> };
  overrides?: Record<string, unknown>;
  resolutions?: Record<string, unknown>;
}

async function snapshotLocalSpecs(options: { root: string; manifest: Record<string, unknown>; progress: RuntimeBuildProgress }): Promise<void> {
  const { root, manifest, progress } = options;
  const snapshots = new Map<string, string>();
  async function snapshot(value: unknown): Promise<unknown> {
    if (typeof value === 'string') {
      const local = /^(?:file|link|portal):(.+)$/.exec(value);
      if (!local) return value;
      const source = realpathSync(local[1]!);
      const existing = snapshots.get(source);
      if (existing) return existing;
      const archive = `package-snapshots/${snapshots.size}.tgz`;
      const target = join(root, archive);
      mkdirSync(dirname(target), { recursive: true });
      if (statSync(source).isDirectory()) {
        progress.detail(`Packing local package from ${source}`);
        await run('pnpm', ['--config.ignoreScripts=true', 'pack', '--out', target], { cwd: source });
      } else {
        progress.detail(`Copying local package archive ${source}`);
        copyFileSync(source, target);
      }
      const spec = `file:./${archive}`;
      snapshots.set(source, spec);
      return spec;
    }
    if (!value || typeof value !== 'object') return value;
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) result[key] = await snapshot(entry);
    return result;
  }
  for (const field of ['dependencies', 'pnpm', 'overrides', 'resolutions']) {
    if (manifest[field]) manifest[field] = await snapshot(manifest[field]);
  }
}

export async function buildNamedRuntime(options: { name: string; project: string; version?: string; progress: RuntimeBuildProgress }): Promise<NamedRuntime> {
  const { name, progress } = options;
  const start = performance.now();
  const project = resolve(options.project);
  const source = await snapshotPackageManifest(project);
  if (!source) throw new Error(`Missing ${join(project, 'package.json')}`);
  const pkg = JSON.parse(source) as ProjectPackage;
  const version = options.version ?? pkg.version;
  if (!version) throw new Error(`Missing project version in ${project}; pass --version`);
  const selector = `${name}@${version}`;
  progress.stage('prepare', `Preparing Facet runtime ${selector}`);
  progress.detail(`Project ${project}`);
  const git = await readBuildGit(project);
  const base = JSON.parse(readFileSync(assetPath('package.json'), 'utf8')) as ProjectPackage;
  const manifest = createDefaultModulePackageJson({ facetVersion: base.version!, facetPackage: base });
  const clickyVersion = base.peerDependencies?.[clicky];
  const oxcVersion = base.devDependencies?.['@oxc-node/core'];
  if (!clickyVersion || !oxcVersion) throw new Error('Embedded Facet package must declare Clicky UI and Oxc versions');
  const managedProject = pkg.name === facet || pkg.name === clicky;
  const facetOverride = process.env.FACET_PACKAGE_PATH;
  const installed = !managedProject && !facetOverride ? await installedRuntime() : undefined;
  const layers = installed && readRuntimeLayers(installed.root);
  if (installed && !layers) throw new Error('The installed Facet runtime is missing its dependency layers; reinstall Facet to build project runtimes');
  const dependencies: Record<string, string> = layers ? { ...pkg.dependencies } : { ...manifest.dependencies as Record<string, string>, [clicky]: clickyVersion, ...pkg.dependencies };
  if (managedProject) dependencies[pkg.name!] = `link:${project}`;
  if (facetOverride) dependencies[facet] = `file:${resolve(facetOverride)}`;
  progress.detail('Loading the Facet compiler');
  const compilerPath = await toolPath(`${compiler}/dependencies`);
  if (!layers) {
    dependencies[compiler] = `file:${dirname(compilerPath)}`;
    dependencies['@oxc-node/core'] = oxcVersion;
  }
  const pnpm = { ...manifest.pnpm as object, ...pkg.pnpm, overrides: { ...readWorkspaceOverrides(project), ...pkg.pnpm?.overrides } };
  const runtime = await publishNamedRuntime({ cache: sharedRuntimeCacheRoot(), name, version, git, prepare: async root => {
    const requested = { ...manifest, dependencies, pnpm, overrides: pkg.overrides, resolutions: pkg.resolutions };
    const install = layers ? unpackLayerManifest(requested, { ...installedRuntimePayload().versions, ...layers.versions }, progress.detail) : requested;
    const extras = Object.keys(install.dependencies as Record<string, string>);
    if (extras.length) await snapshotLocalSpecs({ root, manifest: install, progress });
    else for (const field of ['pnpm', 'overrides', 'resolutions'] as const) delete install[field];
    writeFileSync(join(root, 'package.json'), JSON.stringify(install));
    const npmrc = join(project, '.npmrc');
    const config = join(root, '.npmrc');
    const npmConfig = (existsSync(npmrc) ? readFileSync(npmrc, 'utf8') + '\n' : '') + defaultModuleNpmrc();
    writeFileSync(config, npmConfig, { mode: 0o600 });
    try {
      const apiPath = layers ? compilerPath : undefined;
      progress.stage('install', layers ? `Preparing ${extras.length} new project dependencies` : 'Installing Facet and Clicky UI dependencies');
      if (extras.length) await installModules(root, { progress: progress.output, ...(layers ? { nodeLinker: 'isolated' } : {}) });
      if (!layers) await installRuntimePeers(root, install, progress);
      const api = await import(pathToFileURL(apiPath ?? createRequire(join(root, 'package.json')).resolve(`${compiler}/dependencies`)).href) as RuntimeCompiler;
      if (typeof api.discoverRuntimeExports !== 'function') throw new Error('The installed Facet compiler lacks layered runtime support; reinstall Facet');
      const built = layers && installed
        ? await extendRuntimeBase({ root, api, progress, npmrc: npmConfig, base: layers, baseRoot: installed.root, extras })
        : await buildRuntimeBase({ root, api, progress, npmrc: npmConfig, ...(managedProject ? {} : { extras: Object.keys(pkg.dependencies ?? {}) }) });
      rmSync(join(root, '.runtime-pins'), { recursive: true, force: true });
      progress.stage('publish', `Publishing ${selector}`);
      return built.browserPackages;
    }
    finally { rmSync(config); }
  } });
  progress.done(`Built ${selector} in ${((performance.now() - start) / 1000).toFixed(1)}s`);
  return runtime;
}
