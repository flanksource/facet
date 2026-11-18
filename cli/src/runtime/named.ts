import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { runtimePlatformName } from './platform.js';
import { sharedRuntimeCacheRoot } from './workspace.js';

const namePattern = /^[a-z0-9][a-z0-9._-]*$/;
const versionPattern = /^[a-zA-Z0-9][a-zA-Z0-9.+_-]*$/;
const idPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const manifestFile = 'facet-runtime.json';

export interface RuntimeBuildGit {
  commit?: string;
  dirty: boolean;
}

interface RuntimeBuild {
  id: string;
  version: string;
  builtAt: string;
  git?: RuntimeBuildGit;
}

interface RuntimeManifest extends RuntimeBuild {
  schema: 1;
  name: string;
  platform: string;
  abi: string;
  browserPackages: Record<string, { name: string; version: string; path: string; direct?: boolean }>;
}

export interface NamedRuntime extends RuntimeManifest { root: string }

let selected: NamedRuntime | undefined;

export function selectedRuntime(): NamedRuntime | undefined { return selected; }

export async function selectRuntime(selector: string): Promise<void> {
  const runtime = await openNamedRuntime({ selector });
  selected = runtime;
  process.once('exit', runtime.close);
}

function parseName(selector: string): { name: string; version?: string } {
  const [name, version, extra] = selector.split('@');
  if (!name || !namePattern.test(name) || (version !== undefined && !versionPattern.test(version)) || extra !== undefined) {
    throw new Error(`Invalid runtime name or name@version: ${selector}`);
  }
  return { name, version };
}

function pathSelector(selector: string): boolean {
  return selector === '.' || selector === '..' || /[/\\]/.test(selector) || isAbsolute(selector);
}

function nameRoot(store: string, name: string): string {
  const root = join(store, name);
  if (existsSync(root) && realpathSync(root) !== root) throw new Error(`Invalid runtime registry directory: ${root}`);
  return root;
}

async function withRuntimeLock<T>(root: string, run: () => T): Promise<T> {
  const path = join(root, '.lock');
  const deadline = Date.now() + 10_000;
  for (;;) {
    let fd: number;
    try { fd = openSync(path, 'wx', 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for runtime lock ${path}`);
      await setTimeout(25);
      continue;
    }
    try { return run(); }
    finally { closeSync(fd); rmSync(path); }
  }
}

function readIndex(root: string): RuntimeBuild[] {
  const path = join(root, 'index.json');
  if (!existsSync(path)) return [];
  const entries = JSON.parse(readFileSync(path, 'utf8')) as RuntimeBuild[];
  if (!Array.isArray(entries) || entries.some(entry => !idPattern.test(entry.id) || !versionPattern.test(entry.version) || !Number.isFinite(Date.parse(entry.builtAt)))) {
    throw new Error(`Invalid runtime index at ${path}`);
  }
  return entries;
}

function writeIndex(root: string, entries: RuntimeBuild[]): void {
  const pending = join(root, `.index-${randomUUID()}`);
  try {
    writeFileSync(pending, JSON.stringify(entries));
    renameSync(pending, join(root, 'index.json'));
  } finally { rmSync(pending, { force: true }); }
}

function readBuild(root: string): NamedRuntime {
  const path = join(root, manifestFile);
  if (!existsSync(path)) throw new Error(`Missing built Facet runtime at ${root}; run facet runtime build first`);
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as RuntimeManifest;
  if (manifest.schema !== 1 || !namePattern.test(manifest.name) || !versionPattern.test(manifest.version) || !idPattern.test(manifest.id) || !manifest.browserPackages) {
    throw new Error(`Invalid Facet runtime manifest at ${path}`);
  }
  return { ...manifest, root };
}

function indexedBuild(root: string, selector: string, version?: string): RuntimeBuild {
  const entries = readIndex(root);
  const build = version === undefined ? entries[0] : entries.find(entry => entry.version === version);
  if (!build) throw new Error(`Facet runtime ${selector} is not installed; run facet runtime build first`);
  return build;
}

function canonicalStore(cache: string): string {
  const store = join(cache, 'named-runtimes');
  return existsSync(store) ? realpathSync(store) : store;
}

export function listNamedRuntimes(cache = sharedRuntimeCacheRoot()): Array<RuntimeBuild & { name: string; root: string }> {
  const store = canonicalStore(cache);
  if (!existsSync(store)) return [];
  return readdirSync(store, { withFileTypes: true }).filter(entry => entry.isDirectory() && namePattern.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name)).flatMap(({ name }) => {
      const root = nameRoot(store, name);
      return readIndex(root).map(build => ({ ...build, name, root: join(root, build.version, build.id) }));
    });
}

export async function publishNamedRuntime(options: {
  cache: string;
  name: string;
  version: string;
  git?: RuntimeBuildGit | undefined;
  prepare: (root: string) => Promise<RuntimeManifest['browserPackages']>;
}): Promise<NamedRuntime> {
  const { cache, name, version, git, prepare } = options;
  if (parseName(`${name}@${version}`).name !== name) throw new Error(`Invalid runtime name ${name}`);
  mkdirSync(join(cache, 'named-runtimes'), { recursive: true });
  const root = nameRoot(canonicalStore(cache), name);
  mkdirSync(root, { recursive: true });
  const staging = mkdtempSync(join(root, '.build-'));
  try {
    const browserPackages = await prepare(staging);
    return await withRuntimeLock(root, () => {
      const build: RuntimeBuild = { id: randomUUID(), version, builtAt: new Date().toISOString(), ...(git && { git }) };
      const manifest: RuntimeManifest = { schema: 1, ...build, name, platform: runtimePlatformName(), abi: process.versions.modules, browserPackages };
      const versions = readIndex(root).filter(entry => entry.version !== version);
      const versionRoot = join(root, version);
      mkdirSync(versionRoot, { recursive: true });
      if (realpathSync(versionRoot) !== versionRoot) throw new Error(`Invalid runtime version directory: ${versionRoot}`);
      const destination = join(versionRoot, build.id);
      writeFileSync(join(staging, manifestFile), JSON.stringify(manifest, null, 2));
      renameSync(staging, destination);
      try { writeIndex(root, [build, ...versions]); }
      catch (error) { rmSync(destination, { recursive: true }); throw error; }
      return { ...manifest, root: destination };
    });
  } finally { rmSync(staging, { recursive: true, force: true }); }
}

function openBuild(root: string, managed: boolean): NamedRuntime & { close(): void } {
  const runtime = readBuild(root);
  if (runtime.platform !== runtimePlatformName() || runtime.abi !== process.versions.modules) {
    throw new Error(`Facet runtime ${runtime.name}@${runtime.version} targets ${runtime.platform} / Node ABI ${runtime.abi}; rebuild it for ${runtimePlatformName()} / ${process.versions.modules}`);
  }
  if (!managed) return { ...runtime, close() {} };
  const leases = join(root, '.leases');
  mkdirSync(leases, { recursive: true });
  const path = join(leases, `${process.pid}-${randomUUID()}`);
  writeFileSync(path, '', { flag: 'wx' });
  return { ...runtime, close: () => rmSync(path, { force: true }) };
}

export async function openNamedRuntime(options: { selector: string; cache?: string }): Promise<NamedRuntime & { close(): void }> {
  const { selector, cache = sharedRuntimeCacheRoot() } = options;
  const store = canonicalStore(cache);
  if (pathSelector(selector)) {
    const path = resolve(selector);
    const root = existsSync(path) ? realpathSync(path) : path;
    const [name, version, id, extra] = relative(store, root).split(sep);
    const managed = !!name && !!version && !!id && !extra && namePattern.test(name) && versionPattern.test(version) && idPattern.test(id);
    return managed ? withRuntimeLock(nameRoot(store, name), () => openBuild(root, true)) : Promise.resolve(openBuild(root, false));
  }
  const { name, version } = parseName(selector);
  const root = nameRoot(store, name);
  if (!existsSync(root)) indexedBuild(root, selector, version);
  return withRuntimeLock(root, () => {
    const build = indexedBuild(root, selector, version);
    const path = join(root, build.version, build.id);
    if (existsSync(path) && realpathSync(path) !== path) throw new Error(`Invalid runtime build directory: ${path}`);
    return openBuild(path, true);
  });
}

function hasReaders(root: string): boolean {
  const leases = join(root, '.leases');
  if (!existsSync(leases)) return false;
  return readdirSync(leases).some(lease => {
    const match = /^(\d+)-/.exec(lease);
    if (!match || Number(match[1]) <= 0) return true;
    try { process.kill(Number(match[1]), 0); return true; }
    catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
  });
}

export async function deleteNamedRuntime(cache: string, selector: string): Promise<RuntimeBuild> {
  const { name, version } = parseName(selector);
  const root = nameRoot(canonicalStore(cache), name);
  if (!existsSync(root)) indexedBuild(root, selector, version);
  return withRuntimeLock(root, () => {
    const build = indexedBuild(root, selector, version);
    const directory = join(root, build.version);
    if (realpathSync(directory) !== directory) throw new Error(`Invalid runtime version directory: ${directory}`);
    if (readdirSync(directory, { withFileTypes: true }).some(entry => entry.isDirectory() && hasReaders(join(directory, entry.name)))) {
      throw new Error(`Facet runtime ${name}@${build.version} is in use; close its renders or editor sessions before deleting it`);
    }
    writeIndex(root, readIndex(root).filter(entry => entry.version !== build.version));
    rmSync(directory, { recursive: true });
    return build;
  });
}
