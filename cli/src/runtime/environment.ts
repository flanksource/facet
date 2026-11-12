import type { Logger } from '../utils/logger.js';
export interface RuntimeEnvironment { root: string; nodeModules: string; identity: string }
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { dependencyManifest } from './dependencies.js';

export interface EnvironmentOptions {
  cacheRoot: string;
  manifest: Record<string, unknown>;
  npmrc: string;
  logger: Logger;
  install: (root: string) => Promise<string>;
  invalidate?: boolean;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

function registrySettings(npmrc: string): string {
  return npmrc.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#') && !/auth|password|username|cert|keyfile/i.test(line)).sort().join('\n');
}

function verify(root: string, dependencies: Record<string, string>): void {
  for (const name of Object.keys(dependencies)) {
    if (!existsSync(join(root, 'node_modules', name, 'package.json'))) throw new Error(`Runtime environment ${root} is missing ${name}; use --clear-cache to prepare it again`);
  }
}

async function lock(path: string): Promise<() => void> {
  const deadline = Date.now() + 300_000;
  while (true) {
    try {
      const descriptor = openSync(path, 'wx', 0o600);
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid }));
      return () => { closeSync(descriptor); unlinkSync(path); };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for runtime environment lock ${path}; inspect its owner before removing a stale lock`);
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }
}

export async function ensureEnvironment(options: EnvironmentOptions): Promise<RuntimeEnvironment> {
  const manifest = dependencyManifest(options.manifest);
  const identity = createHash('sha256').update(canonical({ schema: 3, manifest, registry: registrySettings(options.npmrc), platform: process.platform, arch: process.arch, abi: process.versions.modules })).digest('hex');
  const parent = join(options.cacheRoot, 'environments');
  const base = join(parent, identity);
  const dependencies = manifest.dependencies as Record<string, string>;
  if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies) || Object.entries(dependencies).some(([name, spec]) => !/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/i.test(name) || typeof spec !== 'string' || !spec)) throw new Error('Runtime dependencies must map valid package names to nonempty version strings');
  mkdirSync(parent, { recursive: true });
  const release = await lock(`${base}.lock`);
  try {
    const pointer = `${base}.current.json`;
    const generation = existsSync(pointer) ? JSON.parse(readFileSync(pointer, 'utf8')).generation as string : identity;
    if (!new RegExp(`^${identity}(?:-[a-f0-9-]+)?$`).test(generation)) throw new Error(`Invalid runtime generation at ${pointer}`);
    const root = options.invalidate ? `${base}-${randomUUID()}` : join(parent, generation);
    if (existsSync(root)) {
      const ready = JSON.parse(readFileSync(join(root, '.ready.json'), 'utf8'));
      if (ready.identity !== identity) throw new Error(`Runtime identity mismatch at ${root}`);
      verify(root, dependencies);
      options.logger.debug(`Runtime environment cache hit: ${identity}`);
    } else {
      await installEnvironment({ ...options, manifest, identity, root, dependencies });
    }
    if (options.invalidate) {
      const pending = `${pointer}.tmp-${randomUUID()}`;
      writeFileSync(pending, JSON.stringify({ generation: basename(root) }));
      renameSync(pending, pointer);
    }
    return { root, nodeModules: join(root, 'node_modules'), identity };
  } finally { release(); }
}

async function installEnvironment(options: EnvironmentOptions & { identity: string; root: string; dependencies: Record<string, string> }): Promise<void> {
  const staging = `${options.root}.tmp-${randomUUID()}`;
  mkdirSync(staging);
  try {
    writeFileSync(join(staging, 'package.json'), JSON.stringify({ ...options.manifest, name: 'facet-runtime', private: true, type: 'module' }));
    writeFileSync(join(staging, '.npmrc'), options.npmrc, { mode: 0o600 });
    options.logger.info(`Preparing shared runtime environment ${options.identity}...`);
    const packageManager = await options.install(staging);
    verify(staging, options.dependencies);
    if (!existsSync(join(staging, 'pnpm-lock.yaml'))) throw new Error(`Runtime install did not produce a lockfile at ${staging}`);
    unlinkSync(join(staging, '.npmrc'));
    writeFileSync(join(staging, '.ready.json'), JSON.stringify({ identity: options.identity, packageManager }));
    renameSync(staging, options.root);
  } finally { rmSync(staging, { recursive: true, force: true }); }
}
