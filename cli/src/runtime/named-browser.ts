import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { RuntimeBuildProgress } from './build-progress.js';
import { installModules } from './install.js';
import type { NamedRuntime } from './named.js';
import { catalogPackage, catalogPath, catalogVersion, type BrowserExports } from './layers.js';

const libraries = ['@flanksource/facet', '@flanksource/clicky-ui'];
const reference = /^((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)@([a-z0-9][a-z0-9.+_-]*)\/(.+)$/i;

interface BrowserFragment {
  name: string;
  integrity: Record<string, string>;
}

function packageReference(path: string) {
  const match = reference.exec(path);
  if (!match) return undefined;
  const name = match[1]!;
  const version = match[2]!;
  const file = match[3]!;
  if (file.includes('\\') || file.split('/').some(segment => !segment || segment === '.' || segment === '..')) throw new Error(`Invalid browser runtime path ${path}`);
  return { name, version, file, id: `${name}@${version}` };
}

export function readBrowserFragments(root: string): BrowserFragment[] {
  return libraries.map(name => {
    const directory = join(root, 'node_modules', name, 'dist/runtime');
    for (const file of ['importmap.json', 'barrels.json']) {
      if (!existsSync(join(directory, file))) throw new Error(`${name} is missing ${file}; build its runtime artifacts and retry`);
    }
    const fragment = JSON.parse(readFileSync(join(directory, 'importmap.json'), 'utf8')) as BrowserFragment;
    if (fragment.name !== name || !fragment.integrity) throw new Error(`Invalid browser runtime fragment in ${directory}`);
    return fragment;
  });
}

interface PackageMetadata {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function metadata(root: string): PackageMetadata {
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageMetadata;
}

export function runtimeLibraryPeers(root: string): Record<string, string> {
  const peers: Record<string, string> = {};
  for (const fragment of readBrowserFragments(root)) {
    const declared = metadata(join(root, 'node_modules', fragment.name)).peerDependencies ?? {};
    for (const key of Object.keys(fragment.integrity)) {
      const ref = packageReference(key);
      if (ref && Object.hasOwn(declared, ref.name) && !existsSync(join(root, 'node_modules', ref.name, 'package.json'))) {
        peers[ref.name] = ref.version;
      }
    }
  }
  return peers;
}

function installedPackages(root: string): Map<string, string> {
  const seen = new Set<string>();
  const packages = new Map<string, string>();
  function visit(directory: string): void {
    if (!existsSync(directory)) return;
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      if ((!item.isDirectory() && !item.isSymbolicLink()) || item.name.startsWith('.')) continue;
      const path = realpathSync(join(directory, item.name));
      if (seen.has(path)) continue;
      seen.add(path);
      if (item.name.startsWith('@')) { visit(path); continue; }
      if (existsSync(join(path, 'package.json'))) {
        const { name, version } = metadata(path);
        if (!packages.has(`${name}@${version}`)) packages.set(`${name}@${version}`, path);
      }
      visit(join(path, 'node_modules'));
    }
  }
  visit(join(root, 'node_modules'));
  return packages;
}

function fragmentFiles(root: string): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();
  for (const fragment of readBrowserFragments(root)) {
    for (const [path, integrity] of Object.entries(fragment.integrity)) {
      const ref = packageReference(path);
      if (!ref) throw new Error(`Invalid browser runtime integrity reference ${path}`);
      const files = result.get(ref.id) ?? new Map<string, string>();
      const previous = files.get(ref.file);
      if (previous && previous !== integrity) throw new Error(`Conflicting browser runtime integrity for ${path}`);
      files.set(ref.file, integrity);
      result.set(ref.id, files);
    }
  }
  return result;
}

export async function prepareBrowserPackages(options: { root: string; extras: string[]; npmrc: string; progress: RuntimeBuildProgress; supplemental: BrowserExports[]; inherited?: NamedRuntime['browserPackages'] }): Promise<NamedRuntime['browserPackages']> {
  const { root, extras, npmrc, progress, supplemental, inherited } = options;
  progress.stage('packages', 'Preparing pinned browser packages');
  const files = inherited ? new Map<string, Map<string, string>>() : fragmentFiles(root);
  const available = installedPackages(root);
  const explicitFiles = new Map<string, string>();
  const catalogId = `${catalogPackage}@${catalogVersion}`;
  if (supplemental.length) {
    mkdirSync(join(root, catalogPath), { recursive: true });
    const manifest = join(root, catalogPath, 'package.json');
    if (!existsSync(manifest)) writeFileSync(manifest, JSON.stringify({ name: catalogPackage, version: catalogVersion, type: 'module' }));
    available.set(catalogId, join(root, catalogPath));
  }
  for (const item of supplemental) for (const [id, source] of Object.entries(item.packages)) {
    if (!available.has(id)) available.set(id, source);
    if (!files.has(id) && !inherited?.[id]) files.set(id, new Map());
  }
  for (const item of supplemental) for (const [url, source] of Object.entries(item.files)) {
    const ref = packageReference(url)!;
    const integrity = item.fragment.integrity[url]!;
    const subset = files.get(ref.id) ?? new Map<string, string>();
    const previous = subset.get(ref.file);
    if (previous && previous !== integrity) throw new Error(`Conflicting browser runtime integrity for ${url}`);
    subset.set(ref.file, integrity);
    files.set(ref.id, subset);
    explicitFiles.set(url, source);
    if (!available.has(ref.id)) available.set(ref.id, source.slice(0, -(ref.file.length + 1)));
  }
  const scratch = join(root, '.browser-install');
  const missing = [...files.keys()].filter(id => !available.has(id));
  const result: NamedRuntime['browserPackages'] = { ...inherited };
  try {
    if (missing.length) {
      progress.detail(`Installing ${missing.length} pinned browser packages`);
      mkdirSync(scratch);
      const dependencies = Object.fromEntries(missing.map((id, i) => [`browser-package-${i}`, `npm:${id}`]));
      const { packageManager } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      writeFileSync(join(scratch, 'package.json'), JSON.stringify({ private: true, packageManager, dependencies }));
      writeFileSync(join(scratch, '.npmrc'), npmrc, { mode: 0o600 });
      await installModules(scratch, { progress: progress.output });
      for (const [id, path] of installedPackages(scratch)) if (!available.has(id)) available.set(id, path);
    }
    const fileCount = [...files.values()].reduce((count, subset) => count + subset.size, 0);
    progress.detail(`Verifying and saving ${fileCount} files across ${files.size} browser packages`);
    const updateInterval = Math.max(1, Math.ceil(fileCount / 4));
    let verifiedFiles = 0;
    for (const [id, subset] of files) {
      const source = available.get(id);
      if (!source) throw new Error(`Missing pinned browser package ${id}`);
      const path = result[id]?.path ?? (id === catalogId ? catalogPath : `browser-packages/${createHash('sha256').update(id).digest('hex')}`);
      const destination = join(root, path);
      for (const [file, integrity] of subset) {
        const data = readFileSync(explicitFiles.get(`${id}/${file}`) ?? join(source, file));
        if (`sha384-${createHash('sha384').update(data).digest('base64')}` !== integrity) throw new Error(`Browser runtime integrity mismatch for ${id}/${file}`);
        const output = join(destination, file);
        if (!existsSync(output)) {
          mkdirSync(dirname(output), { recursive: true });
          writeFileSync(output, data);
        } else if (`sha384-${createHash('sha384').update(readFileSync(output)).digest('base64')}` !== integrity) {
          throw new Error(`Inherited browser integrity mismatch for ${id}/${file}`);
        }
        verifiedFiles++;
        if (verifiedFiles % updateInterval === 0 || verifiedFiles === fileCount) {
          progress.detail(`Verified ${verifiedFiles}/${fileCount} browser files`);
        }
      }
      const { name, version } = metadata(source);
      if (!result[id]) {
        if (!existsSync(destination)) mkdirSync(destination, { recursive: true });
        if (source !== destination) cpSync(join(source, 'package.json'), join(destination, 'package.json'));
        if (libraries.includes(name)) {
          mkdirSync(join(destination, 'dist/runtime'), { recursive: true });
          for (const file of ['importmap.json', 'barrels.json']) cpSync(join(source, 'dist/runtime', file), join(destination, 'dist/runtime', file));
        }
        result[id] = { name, version, path, ...(libraries.includes(name) || extras.includes(name) ? { direct: true } : {}) };
      }
    }
    return result;
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}
