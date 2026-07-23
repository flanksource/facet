import { createHash, randomUUID } from 'node:crypto';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type { Logger } from '../utils/logger.js';
import { resolvePackageManager } from '../utils/package-manager.js';
import { spawnLowPriority } from '../utils/subprocess-priority.js';

const REQUIRED_DEPENDENCIES = [
  'react',
  'react-dom',
  'vite',
  '@vitejs/plugin-react',
  '@mdx-js/rollup',
  'remark-gfm',
  'remark-frontmatter',
  'remark-github-blockquote-alert',
  'rehype-raw',
  'mermaid',
  'react-icons',
  'react-xarrows',
  '@flanksource/icons',
  '@iconify/react',
  'typescript',
  '@tailwindcss/typography',
  '@tailwindcss/postcss',
  '@tailwindcss/vite',
  'tailwindcss',
  'autoprefixer',
  'postcss',
  'source-map-support',
  'd3-array',
  'd3-format',
  'd3-interpolate',
  'd3-scale',
  'd3-shape',
  'd3-time',
  'd3-time-format',
] as const;

const SENTINEL_DEPENDENCIES = ['react', 'vite', '@vitejs/plugin-react', '@flanksource/facet'] as const;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const READY_FILE = '.ready.json';
const PROJECT_READY_FILE = '.modules-ready.json';

export interface EmbeddedFacetPackage {
  version?: string;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  pnpm?: Record<string, unknown>;
}

export interface DefaultModulePackageOptions {
  facetVersion: string;
  facetPackage: EmbeddedFacetPackage | Record<string, unknown>;
}

export interface ModuleCachePathOptions {
  cacheRoot?: string;
  facetVersion: string;
  platform?: NodeJS.Platform | string;
  arch?: string;
  nodeAbi?: string;
  /**
   * Store identity digest. When set, the path embeds its prefix so builds that
   * share a version but differ in embedded manifest coexist instead of
   * serially reinstalling over each other.
   */
  identity?: string;
}

export interface GlobalModuleStore {
  root: string;
  nodeModules: string;
  identity: string;
}

type InstallModules = (root: string) => Promise<string>;
type CloneDirectory = (source: string, target: string) => Promise<void>;

export interface EnsureGlobalModuleStoreOptions extends ModuleCachePathOptions, DefaultModulePackageOptions {
  logger: Logger;
  install?: InstallModules;
  facetTarball?: string;
}

export type InspectGlobalModuleStoreOptions = ModuleCachePathOptions & DefaultModulePackageOptions;

export interface PrepareProjectModulesOptions {
  consumerRoot: string;
  facetRoot: string;
  seed: GlobalModuleStore;
  logger: Logger;
  skipModules?: boolean;
  platform?: NodeJS.Platform | string;
  install?: InstallModules;
  clone?: CloneDirectory;
}

interface ReadyMarker {
  identity: string;
  facetVersion: string;
  platform: string;
  arch: string;
  nodeAbi: string;
  pnpmVersion: string;
}

export function createDefaultModulePackageJson(options: DefaultModulePackageOptions): Record<string, unknown> {
  const facetPackage = options.facetPackage as EmbeddedFacetPackage;
  if (facetPackage.version !== options.facetVersion) {
    throw new Error(
      `Facet CLI ${options.facetVersion} cannot seed modules from @flanksource/facet ${facetPackage.version ?? 'unknown'}`,
    );
  }
  if (!facetPackage.packageManager?.startsWith('pnpm@')) {
    throw new Error('The embedded @flanksource/facet package must pin packageManager to pnpm@<version>');
  }

  const available = { ...facetPackage.dependencies, ...facetPackage.devDependencies };
  const dependencies: Record<string, string> = { '@flanksource/facet': options.facetVersion };
  for (const dependency of REQUIRED_DEPENDENCIES) {
    const version = available[dependency];
    if (version) dependencies[dependency] = version;
  }
  dependencies.lightningcss = '^1.30.2';

  const manifest: Record<string, unknown> = {
    name: '.facet-default-modules',
    private: true,
    type: 'module',
    packageManager: facetPackage.packageManager,
    dependencies,
  };
  if (facetPackage.pnpm) manifest.pnpm = facetPackage.pnpm;
  return manifest;
}

function resolveCacheRoot(options: Pick<ModuleCachePathOptions, 'cacheRoot'>): string {
  return options.cacheRoot ?? process.env['FACET_CACHE_DIR'] ?? join(homedir(), '.facet', 'cache');
}

export function moduleCachePath(options: ModuleCachePathOptions): string {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const nodeAbi = options.nodeAbi ?? process.versions.modules;
  if (!nodeAbi) throw new Error('Node did not report a module ABI; cannot select the Facet module cache');
  const identitySuffix = options.identity ? `-${options.identity.slice(0, 8)}` : '';
  return join(resolveCacheRoot(options), 'modules', options.facetVersion, `${platform}-${arch}-node${nodeAbi}${identitySuffix}`);
}

export function defaultModuleNpmrc(): string {
  return [
    'node-linker=hoisted',
    'auto-install-peers=true',
    'strict-peer-dependencies=false',
    'frozen-lockfile=false',
    'prefer-frozen-lockfile=false',
    'verify-store-integrity=false',
    'engine-strict=false',
    'confirm-modules-purge=false',
    '',
  ].join('\n');
}

export async function ensureGlobalModuleStore(
  options: EnsureGlobalModuleStoreOptions,
): Promise<GlobalModuleStore> {
  const { manifest, canonicalManifest, runtime, store } = describeGlobalModuleStore(options);
  const { root, identity } = store;
  const staleReason = storeStaleReason(store, options.facetVersion);
  if (!staleReason) return store;

  mkdirSync(dirname(root), { recursive: true });
  const release = await acquireLock(`${root}.lock`);
  try {
    if (!storeStaleReason(store, options.facetVersion)) return store;
    removePath(root);
    const staging = `${root}.tmp-${process.pid}-${randomUUID()}`;
    mkdirSync(staging, { recursive: true });
    try {
      const installManifest = options.facetTarball
        ? withFacetTarball(manifest, options.facetTarball)
        : manifest;
      writeFileSync(join(staging, 'package.json'), JSON.stringify(installManifest, null, 2));
      writePrivateFile(join(staging, '.npmrc'), defaultModuleNpmrc());
      options.logger.info(`Installing shared Facet modules for ${options.facetVersion} (${staleReason})...`);
      const installStartedAt = performance.now();
      const pnpmVersion = await (options.install ?? ((installRoot: string) => installModules(installRoot, options.logger)))(staging);
      verifySentinels(staging, options.facetVersion);
      writeFileSync(join(staging, 'package.json'), canonicalManifest);
      if (options.facetTarball) removePath(join(staging, 'pnpm-lock.yaml'));
      const marker: ReadyMarker = { identity, facetVersion: options.facetVersion, ...runtime, pnpmVersion };
      writeFileSync(join(staging, READY_FILE), JSON.stringify(marker, null, 2));
      renameSync(staging, root);
      options.logger.success(`Shared Facet modules ready at ${root} in ${((performance.now() - installStartedAt) / 1000).toFixed(1)}s`);
      pruneModuleStores(resolveCacheRoot(options), root, options.logger);
    } catch (error) {
      removePath(staging);
      throw error;
    }
    return store;
  } finally {
    release();
  }
}

export function inspectGlobalModuleStore(options: InspectGlobalModuleStoreOptions): GlobalModuleStore {
  const { store } = describeGlobalModuleStore(options);
  const staleReason = storeStaleReason(store, options.facetVersion);
  if (staleReason) {
    throw new Error(`Shared Facet modules are missing or invalid at ${store.root}: ${staleReason}`);
  }
  return store;
}

export async function prepareProjectModules(options: PrepareProjectModulesOptions): Promise<void> {
  const nodeModules = join(options.facetRoot, 'node_modules');
  if (options.skipModules) {
    removePath(nodeModules);
    symlinkSync(options.seed.nodeModules, nodeModules, 'junction');
    removeManagedConsumerLink(options.consumerRoot, nodeModules);
    writeFileSync(join(options.facetRoot, PROJECT_READY_FILE), JSON.stringify({
      mode: 'skip',
      seedIdentity: options.seed.identity,
    }, null, 2));
    options.logger.debug(`Using shared Facet modules at ${options.seed.nodeModules}`);
    return;
  }

  const manifest = readFileSync(join(options.facetRoot, 'package.json'), 'utf-8');
  const projectIdentity = digest(`${manifest}\0${options.seed.identity}`);
  const staleReason = projectModulesStaleReason(options.facetRoot, projectIdentity);
  if (!staleReason) {
    options.logger.debug('Project modules match the generated manifest; skipping pnpm install');
    return;
  }

  const staging = join(options.consumerRoot, `.facet-install-${process.pid}-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });
  try {
    await seedProjectInstall({ ...options, staging });
    writeFileSync(join(staging, 'package.json'), manifest);
    const npmrc = readFileSync(join(options.facetRoot, '.npmrc'), 'utf-8');
    writePrivateFile(join(staging, '.npmrc'), npmrc);
    options.logger.info(`Reconciling project modules with pnpm (${staleReason})...`);
    const installStartedAt = performance.now();
    await (options.install ?? ((installRoot: string) => installModules(installRoot, options.logger)))(staging);
    verifySentinels(staging);
    promoteProjectInstall(staging, options.facetRoot);
    writeFileSync(join(options.facetRoot, PROJECT_READY_FILE), JSON.stringify({
      mode: 'project',
      projectIdentity,
      seedIdentity: options.seed.identity,
    }, null, 2));
    options.logger.success(`Project modules reconciled in ${((performance.now() - installStartedAt) / 1000).toFixed(1)}s`);
  } finally {
    removePath(staging);
  }
}

async function seedProjectInstall(
  options: PrepareProjectModulesOptions & { staging: string },
): Promise<void> {
  const platform = options.platform ?? process.platform;
  if (platform !== 'darwin') {
    options.logger.info(`APFS module cloning is unavailable on ${platform}; using a fresh project install`);
    return;
  }
  try {
    await (options.clone ?? cloneDirectory)(options.seed.nodeModules, join(options.staging, 'node_modules'));
    const seedLock = join(options.seed.root, 'pnpm-lock.yaml');
    if (existsSync(seedLock)) copyFileSync(seedLock, join(options.staging, 'pnpm-lock.yaml'));
    options.logger.debug('Cloned shared node_modules into the project install staging directory');
  } catch (error) {
    if (!isCloneUnavailable(error)) throw error;
    removePath(join(options.staging, 'node_modules'));
    removePath(join(options.staging, 'pnpm-lock.yaml'));
    options.logger.warn(`APFS module cloning is unavailable; using a fresh project install: ${errorMessage(error)}`);
  }
}

function promoteProjectInstall(staging: string, facetRoot: string): void {
  const stagedModules = join(staging, 'node_modules');
  if (!existsSync(stagedModules)) throw new Error(`pnpm completed without creating ${stagedModules}`);
  removePath(join(facetRoot, 'node_modules'));
  renameSync(stagedModules, join(facetRoot, 'node_modules'));
  const stagedLock = join(staging, 'pnpm-lock.yaml');
  if (existsSync(stagedLock)) copyFileSync(stagedLock, join(facetRoot, 'pnpm-lock.yaml'));
}

/** Why the project install must run, or undefined when the marker is valid. */
function projectModulesStaleReason(facetRoot: string, projectIdentity: string): string | undefined {
  let marker: { mode?: string; projectIdentity?: string };
  try {
    marker = JSON.parse(readFileSync(join(facetRoot, PROJECT_READY_FILE), 'utf-8'));
  } catch (error) {
    return `no readable ${PROJECT_READY_FILE} marker: ${errorMessage(error)}`;
  }
  if (marker.mode !== 'project') return `ready marker mode is ${marker.mode ?? 'unset'}, expected project`;
  if (marker.projectIdentity !== projectIdentity) return 'generated manifest changed since the last install';
  try {
    verifySentinels(facetRoot);
  } catch (error) {
    return errorMessage(error);
  }
  try {
    if (lstatSync(join(facetRoot, 'node_modules')).isSymbolicLink()) return 'node_modules is a skip-modules symlink';
  } catch (error) {
    return `node_modules is missing: ${errorMessage(error)}`;
  }
  return undefined;
}

/**
 * Keep the newest FACET_MODULE_STORE_ENTRIES stores (default 4) across all
 * versions, never touching the just-installed root, staging dirs, or stores
 * another process holds a lock on. Runs only after an install, so the ordinary
 * warm path never pays the scan.
 */
function pruneModuleStores(cacheRoot: string, keepRoot: string, logger: Logger): void {
  const modulesRoot = join(cacheRoot, 'modules');
  const maxEntries = Math.max(1, parseInt(process.env['FACET_MODULE_STORE_ENTRIES'] ?? '4', 10));
  const stores: Array<{ path: string; mtimeMs: number }> = [];
  let versionDirs: string[];
  try {
    versionDirs = readdirSync(modulesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(modulesRoot, entry.name));
    for (const versionDir of versionDirs) {
      for (const entry of readdirSync(versionDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.includes('.tmp-')) continue;
        const path = join(versionDir, entry.name);
        if (path === keepRoot || existsSync(`${path}.lock`)) continue;
        stores.push({ path, mtimeMs: statSync(path).mtimeMs });
      }
    }
  } catch {
    return;
  }
  stores.sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const stale of stores.slice(Math.max(0, maxEntries - 1))) {
    try {
      rmSync(stale.path, { recursive: true, force: true });
      logger.debug(`Pruned stale module store ${stale.path}`);
    } catch { /* another process may be racing the same prune */ }
  }
  for (const versionDir of versionDirs) {
    try {
      if (readdirSync(versionDir).length === 0) rmSync(versionDir, { recursive: true, force: true });
    } catch { /* best effort */ }
  }
}

/** Why the global store must be (re)installed, or undefined when it is ready. */
function storeStaleReason(store: GlobalModuleStore, facetVersion: string): string | undefined {
  let marker: ReadyMarker;
  try {
    marker = JSON.parse(readFileSync(join(store.root, READY_FILE), 'utf-8')) as ReadyMarker;
  } catch (error) {
    return `no readable ${READY_FILE} marker: ${errorMessage(error)}`;
  }
  if (marker.facetVersion !== facetVersion) return `store holds facet ${marker.facetVersion}, expected ${facetVersion}`;
  if (marker.identity !== store.identity) return 'store identity changed (manifest or runtime)';
  try {
    verifySentinels(store.root, facetVersion);
  } catch (error) {
    return errorMessage(error);
  }
  try {
    if (lstatSync(store.nodeModules).isSymbolicLink()) return 'store node_modules is a symlink';
  } catch (error) {
    return `store node_modules is missing: ${errorMessage(error)}`;
  }
  return undefined;
}

function describeGlobalModuleStore(options: InspectGlobalModuleStoreOptions): {
  manifest: Record<string, unknown>;
  canonicalManifest: string;
  runtime: Pick<ReadyMarker, 'platform' | 'arch' | 'nodeAbi'>;
  store: GlobalModuleStore;
} {
  const manifest = createDefaultModulePackageJson(options);
  const canonicalManifest = JSON.stringify(manifest, null, 2);
  const runtime = runtimeIdentity(options);
  const identity = digest(`${canonicalManifest}\0${runtime.platform}\0${runtime.arch}\0${runtime.nodeAbi}`);
  const root = moduleCachePath({ ...options, identity });
  return { manifest, canonicalManifest, runtime, store: { root, nodeModules: join(root, 'node_modules'), identity } };
}

function verifySentinels(root: string, facetVersion?: string): void {
  for (const dependency of SENTINEL_DEPENDENCIES) {
    const packagePath = join(root, 'node_modules', ...dependency.split('/'), 'package.json');
    if (!existsSync(packagePath)) throw new Error(`Module install is missing required package ${dependency}`);
    if (dependency === '@flanksource/facet' && facetVersion) {
      const installed = JSON.parse(readFileSync(packagePath, 'utf-8'));
      if (installed.version !== facetVersion) {
        throw new Error(`Shared modules contain @flanksource/facet ${installed.version ?? 'unknown'}, expected ${facetVersion}`);
      }
    }
  }
}

/**
 * pnpm's ERR_PNPM_ENOENT during importPackage/reflink means the content store
 * index references files that no longer exist — verify-store-integrity=false
 * (which we set for speed) lets that go undetected until link time.
 */
export function isStoreCorruptionError(output: string): boolean {
  return /ERR_PNPM_ENOENT/.test(output) && /(importPackage|reflink)/.test(output);
}

async function installModules(root: string, logger?: Logger): Promise<string> {
  const manager = await resolvePackageManager(root);
  const baseArgs = [
    'install',
    '--prefer-offline',
    '--ignore-workspace',
    '--ignore-scripts',
    '--config.confirmModulesPurge=false',
  ];
  try {
    await runProcess(manager.cmd, baseArgs, root, { ...process.env, CI: 'true' });
  } catch (error) {
    const output = errorMessage(error);
    if (!isStoreCorruptionError(output)) throw error;
    const corruptLine = output.split('\n').find((line) => line.includes('ERR_PNPM_ENOENT'))?.trim() ?? 'ERR_PNPM_ENOENT';
    logger?.warn(`pnpm content store looks corrupted (${corruptLine}); retrying with store integrity verification`);
    try {
      await runProcess(manager.cmd, [...baseArgs, '--config.verifyStoreIntegrity=true'], root, { ...process.env, CI: 'true' });
    } catch (retryError) {
      throw new Error(
        `pnpm install failed even with store integrity verification — the pnpm content store is corrupted. ` +
        `Inspect it with \`corepack pnpm@${manager.version} store status\` and re-add the affected packages, ` +
        `or remove the store directory to force a clean re-download.\n${errorMessage(retryError)}`,
      );
    }
  }
  return manager.version;
}

async function cloneDirectory(source: string, target: string): Promise<void> {
  await runProcess('/bin/cp', ['-cR', source, target], dirname(target));
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawnLowPriority<ChildProcessWithoutNullStreams>({
      command,
      args,
      options: { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] },
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      const output = Buffer.concat([...stdout, ...stderr]).toString().trim();
      const error = new Error(`${command} ${args.join(' ')} failed with exit ${code}: ${output}`) as NodeJS.ErrnoException;
      reject(error);
    });
  });
}

async function acquireLock(path: string): Promise<() => void> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (true) {
    let descriptor: number;
    try {
      descriptor = openSync(path, 'wx');
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid }));
      return () => {
        closeSync(descriptor);
        try { unlinkSync(path); } catch { /* another process already cleaned a stale lock */ }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (!lockOwnerIsAlive(path)) {
        try { unlinkSync(path); } catch { /* another waiter won the race */ }
        continue;
      }
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for Facet module cache lock ${path}`);
      await new Promise<void>((resolveWait) => setTimeout(resolveWait, 100));
    }
  }
}

function lockOwnerIsAlive(path: string): boolean {
  try {
    const pid = Number(JSON.parse(readFileSync(path, 'utf-8')).pid);
    if (!Number.isSafeInteger(pid) || pid <= 0) return false;
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function withFacetTarball(manifest: Record<string, unknown>, tarball: string): Record<string, unknown> {
  const dependencies = { ...(manifest.dependencies as Record<string, string>) };
  dependencies['@flanksource/facet'] = `file:${resolve(tarball)}`;
  return { ...manifest, dependencies };
}

function runtimeIdentity(options: ModuleCachePathOptions): Pick<ReadyMarker, 'platform' | 'arch' | 'nodeAbi'> {
  const nodeAbi = options.nodeAbi ?? process.versions.modules;
  if (!nodeAbi) throw new Error('Node did not report a module ABI; cannot identify the Facet module cache');
  return { platform: options.platform ?? process.platform, arch: options.arch ?? process.arch, nodeAbi };
}

function removeManagedConsumerLink(consumerRoot: string, nodeModules: string): void {
  const link = join(consumerRoot, 'node_modules');
  try {
    if (lstatSync(link).isSymbolicLink() && readlinkSync(link) === nodeModules) unlinkSync(link);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

function removePath(path: string): void {
  try {
    if (lstatSync(path).isSymbolicLink()) unlinkSync(path);
    else rmSync(path, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

function isCloneUnavailable(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  if (code && ['EXDEV', 'ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'].includes(code)) return true;
  return /operation not supported|not supported|cross-device|clonefile/i.test(errorMessage(error));
}

function writePrivateFile(path: string, content: string): void {
  writeFileSync(path, content, { encoding: 'utf-8', mode: 0o600 });
  chmodSync(path, 0o600);
}

function digest(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
