import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { satisfies } from 'semver';
import type { RuntimeEnvironment } from './environment.js';
import { runtimePlatformName, type RuntimePlatform } from './platform.js';

export interface RuntimePayload {
  schema: 1;
  facetVersion: string;
  target: RuntimePlatform;
  sha256: string;
  versions: Record<string, string>;
}

export function readRuntimePayload(path: string): RuntimePayload {
  const payload = JSON.parse(readFileSync(path, 'utf8')) as RuntimePayload;
  if (payload.schema !== 1 || !payload.facetVersion || !payload.target?.platform || !payload.target.arch || !/^[a-f0-9]{64}$/.test(payload.sha256) || !payload.versions || Object.values(payload.versions).some(version => typeof version !== 'string')) throw new Error(`Invalid installed runtime manifest at ${path}`);
  return payload;
}

export function payloadSatisfies(payload: RuntimePayload, manifest: Record<string, unknown>): boolean {
  if (['pnpm', 'overrides', 'resolutions', 'facetLocalOverride'].some(key => manifest[key] !== undefined)) return false;
  const dependencies = manifest.dependencies as Record<string, string>;
  return !!dependencies && Object.entries(dependencies).every(([name, range]) => !!payload.versions[name] && satisfies(payload.versions[name], range));
}

const run = promisify(execFile);
const pending = new Map<string, Promise<RuntimeEnvironment>>();

export async function materializeRuntime(options: { payload: RuntimePayload; archive: string | (() => string); cacheRoot: string; facetVersion: string }): Promise<RuntimeEnvironment> {
  if (options.payload.facetVersion !== options.facetVersion) throw new Error(`Installed runtime ${options.payload.facetVersion} does not match Facet ${options.facetVersion}`);
  if (runtimePlatformName(options.payload.target) !== runtimePlatformName()) throw new Error(`Installed runtime targets ${runtimePlatformName(options.payload.target)}; this machine needs ${runtimePlatformName()}`);
  const root = join(options.cacheRoot, 'runtimes', options.payload.sha256);
  const active = pending.get(root);
  if (active) return active;
  const task = extractRuntime({ ...options, root });
  pending.set(root, task);
  try { return await task; } finally { pending.delete(root); }
}

async function extractRuntime(options: { payload: RuntimePayload; archive: string | (() => string); root: string }): Promise<RuntimeEnvironment> {
  const { root, payload } = options;
  if (!existsSync(join(root, '.runtime-ready.json'))) {
    const archive = typeof options.archive === 'function' ? options.archive() : options.archive;
    const bytes = readFileSync(archive);
    if (createHash('sha256').update(bytes).digest('hex') !== payload.sha256) throw new Error(`Installed runtime archive failed integrity verification: ${archive}`);
    const { stdout } = await run('tar', ['-tzf', archive], { maxBuffer: 32 * 1024 * 1024 });
    if (stdout.split('\n').some(path => path.startsWith('/') || path.includes('\\') || path.split('/').includes('..'))) throw new Error('Installed runtime archive contains an invalid path');
    const staging = `${root}.tmp-${randomUUID()}`;
    mkdirSync(staging, { recursive: true });
    try {
      await run('tar', ['-xzf', archive, '-C', staging]);
      verifyRuntime(staging, payload);
      writeFileSync(join(staging, '.runtime-ready.json'), JSON.stringify({ sha256: payload.sha256 }));
      try { renameSync(staging, root); }
      catch (error) { if (!existsSync(join(root, '.runtime-ready.json'))) throw error; }
    } finally { rmSync(staging, { recursive: true, force: true }); }
  }
  verifyRuntime(root, payload);
  return { root, nodeModules: join(root, 'node_modules'), identity: payload.sha256 };
}

function verifyRuntime(root: string, payload: RuntimePayload): void {
  for (const [name, version] of Object.entries(payload.versions)) {
    const manifest = JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'));
    if (manifest.version !== version) throw new Error(`Installed runtime package ${name} has version ${manifest.version}; expected ${version}`);
  }
}
