import { createHash } from 'crypto';
import { existsSync, rmSync } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import { $ } from 'bun';
import type { RemoteRef, ResolvedTemplate } from '../types.js';
import { resolvePackageManager } from './package-manager.js';

function getBaseCacheDir(): string {
  return process.env['FACET_CACHE_DIR'] ?? join(homedir(), '.facet', 'cache');
}

interface CacheManifest {
  ref: string;
  resolvedSha: string;
  fetchedAt: string;
  repoUrl: string;
}

// --- Parsing ---

/**
 * Parses a template argument into a RemoteRef if it matches a known remote format.
 * Returns null for local paths.
 */
export function parseRemoteRef(input: string): RemoteRef | null {
  return (
    parseGithubShorthand(input) ??
    parseHttpsUrl(input) ??
    parseGitSsh(input) ??
    parseNpmPackage(input)
  );
}

function parseGithubShorthand(input: string): RemoteRef | null {
  // github:owner/repo/path/to/File.tsx[@ref]
  const match = input.match(/^github:([^/]+)\/([^/@]+)\/(.+?)(?:@(.+))?$/);
  if (!match) return null;
  const [, owner, repo, subPath, ref] = match;
  return {
    type: 'github',
    repoUrl: `https://github.com/${owner}/${repo}.git`,
    subPath,
    ref: ref ?? 'HEAD',
  };
}

function parseHttpsUrl(input: string): RemoteRef | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  // raw.githubusercontent.com/owner/repo/ref/path
  if (url.hostname === 'raw.githubusercontent.com') {
    const parts = url.pathname.slice(1).split('/');
    if (parts.length < 4) return null;
    const [owner, repo, ref, ...rest] = parts;
    return {
      type: 'https',
      repoUrl: `https://github.com/${owner}/${repo}.git`,
      subPath: rest.join('/'),
      ref,
    };
  }

  // github.com/owner/repo/blob/ref/path
  if (url.hostname === 'github.com') {
    const parts = url.pathname.slice(1).split('/');
    if (parts.length < 5) return null;
    const [owner, repo, , ref, ...rest] = parts; // skip "blob"
    return {
      type: 'https',
      repoUrl: `https://github.com/${owner}/${repo}.git`,
      subPath: rest.join('/'),
      ref,
    };
  }

  return null;
}

function parseGitSsh(input: string): RemoteRef | null {
  // git+ssh://git@github.com/owner/repo.git#ref/path/File.tsx
  const match = input.match(/^git\+ssh:\/\/[^/]+\/(.+?)\.git(?:#(.+))?$/);
  if (!match) return null;
  const [, repoPath, fragment] = match;
  const [ref, ...pathParts] = (fragment ?? 'HEAD').split('/');
  return {
    type: 'git+ssh',
    repoUrl: `git+ssh://git@github.com/${repoPath}.git`,
    subPath: pathParts.join('/'),
    ref: ref || 'HEAD',
  };
}

function parseNpmPackage(input: string): RemoteRef | null {
  // @scope/pkg:relative/path[@version]  or  pkg:relative/path[@version]
  // Must start with @ (scoped) or a valid npm name char (not a URL protocol like http/https/git)
  const match = input.match(/^(@[^/]+\/[^:]+|[a-z0-9][^:]*):(.+?)(?:@([^@]+))?$/i);
  if (!match) return null;
  const [, pkg, subPath, version] = match;
  // Reject URL-like package names (e.g. "http", "https", "git+ssh")
  if (/^https?$|^git/.test(pkg)) return null;
  // Sanity-check: must look like a valid npm package name
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(pkg)) return null;
  return {
    type: 'npm',
    repoUrl: pkg,
    subPath,
    ref: version ?? 'latest',
  };
}

// --- Cache helpers ---

export function cacheKey(repoUrl: string, ref: string): string {
  return createHash('sha256').update(`${repoUrl}@${ref}`).digest('hex').slice(0, 32);
}

export function cacheDir(key: string, baseDir?: string): string {
  return join(baseDir ?? getBaseCacheDir(), key);
}

async function readManifest(dir: string): Promise<CacheManifest | null> {
  try {
    const raw = await readFile(join(dir, 'facet-cache.json'), 'utf-8');
    return JSON.parse(raw) as CacheManifest;
  } catch {
    return null;
  }
}

async function writeManifest(dir: string, manifest: CacheManifest): Promise<void> {
  await writeFile(join(dir, 'facet-cache.json'), JSON.stringify(manifest, null, 2), 'utf-8');
}

// --- Git resolver ---

async function resolveGitRef(ref: RemoteRef, targetDir: string): Promise<string> {
  const { repoUrl, ref: gitRef, subPath } = ref;

  const cloneArgs = ['--depth=1', '--filter=blob:none', '--sparse'];
  if (gitRef !== 'HEAD') {
    cloneArgs.push('--branch', gitRef);
  }

  const env: Record<string, string> = { ...process.env as Record<string, string> };
  if (process.env['GIT_TOKEN']) {
    // Inject token into HTTPS URL
    const authedUrl = repoUrl.replace('https://', `https://oauth2:${process.env['GIT_TOKEN']}@`);
    env['GIT_ASKPASS'] = 'echo';
    await $`git clone ${cloneArgs} ${authedUrl} ${targetDir}`.env(env).quiet();
  } else {
    await $`git clone ${cloneArgs} ${repoUrl} ${targetDir}`.env(env).quiet();
  }

  // Sparse checkout the required directory
  const sparseDir = dirname(subPath) === '.' ? subPath : dirname(subPath);
  await $`git -C ${targetDir} sparse-checkout set ${sparseDir}`.quiet();
  await $`git -C ${targetDir} checkout`.quiet();

  // Resolve the SHA
  const sha = (await $`git -C ${targetDir} rev-parse HEAD`.quiet()).stdout.toString().trim();
  return sha;
}

// WORKAROUND(pnpm-tolerance): match .facet/.npmrc; this is also an ephemeral
// install dir, and pnpm's strict defaults abort fetches that we'd otherwise
// recover from by rebuilding. Correct fix: pnpm distinguishes ephemeral build
// dirs from real workspaces. Ref: discussed with user 2026-04-26.
const REMOTE_NPMRC = [
  'node-linker=hoisted',
  'auto-install-peers=true',
  'strict-peer-dependencies=false',
  'frozen-lockfile=false',
  'prefer-frozen-lockfile=false',
  'verify-store-integrity=false',
  'engine-strict=false',
  // Bun's $ is non-interactive; without this, pnpm aborts with
  // ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY when it wants to purge a
  // node_modules dir it considers foreign.
  'confirm-modules-purge=false',
].join('\n') + '\n';

function nukeRemoteInstall(targetDir: string): void {
  for (const p of ['node_modules', 'pnpm-lock.yaml']) {
    const target = join(targetDir, p);
    if (existsSync(target)) {
      try { rmSync(target, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}

async function resolveNpmRef(ref: RemoteRef, targetDir: string): Promise<string> {
  const { repoUrl: pkg, ref: version } = ref;
  const packageSpec = `${pkg}@${version}`;

  await mkdir(targetDir, { recursive: true });
  // pnpm requires a manifest in --prefix dir; write a minimal one so `pnpm add`
  // records the dep there (not in any parent package.json via workspace lookup).
  await writeFile(
    join(targetDir, 'package.json'),
    JSON.stringify({ name: 'facet-remote-template', private: true, version: '0.0.0' }, null, 2),
    'utf-8',
  );
  await writeFile(join(targetDir, '.npmrc'), REMOTE_NPMRC, 'utf-8');

  await resolvePackageManager(targetDir);

  // CI=true + --config.confirmModulesPurge=false: prevents
  // ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY under Bun's non-interactive $.
  const runAdd = () =>
    $`CI=true pnpm -C ${targetDir} --ignore-workspace add --ignore-scripts --config.confirmModulesPurge=false ${packageSpec}`.quiet();
  try {
    await runAdd();
  } catch (firstErr: any) {
    nukeRemoteInstall(targetDir);
    try {
      await runAdd();
    } catch (secondErr: any) {
      const out = secondErr?.stderr?.toString?.() || secondErr?.message || String(secondErr);
      throw new Error(`pnpm add ${packageSpec} failed twice in ${targetDir}:\n${out}`);
    }
  }

  // Determine installed version
  const pkgJsonPath = join(targetDir, 'node_modules', ...pkg.split('/'), 'package.json');
  const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8'));
  return pkgJson.version as string;
}

// --- Public API ---

export interface ResolveOptions {
  refresh?: boolean;
  verbose?: boolean;
}

/**
 * Resolves a RemoteRef to a local path, using the cache when possible.
 * Prints progress to stdout.
 */
export async function resolveRemoteRef(
  ref: RemoteRef,
  options: ResolveOptions = {}
): Promise<ResolvedTemplate> {
  const key = cacheKey(ref.repoUrl, ref.ref);
  const dir = cacheDir(key);

  // Check cache
  if (!options.refresh) {
    const manifest = await readManifest(dir);
    if (manifest && existsSync(join(dir, ref.subPath))) {
      console.log(`ℹ Using cached ${ref.repoUrl}@${ref.ref} (sha: ${manifest.resolvedSha.slice(0, 8)})`);
      return {
        consumerRoot: dirname(join(dir, ref.subPath)),
        templateFile: basename(ref.subPath),
        resolvedSha: manifest.resolvedSha,
      };
    }
  }

  // Clear stale cache
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
  await mkdir(dir, { recursive: true });

  let resolvedSha: string;

  if (ref.type === 'npm') {
    console.log(`ℹ Installing npm package: ${ref.repoUrl}@${ref.ref}...`);
    resolvedSha = await resolveNpmRef(ref, dir);
    console.log(`  Resolved to version ${resolvedSha}`);
    const packageDir = join(dir, 'node_modules', ...ref.repoUrl.split('/'));
    await writeManifest(dir, {
      ref: ref.repoUrl,
      resolvedSha,
      fetchedAt: new Date().toISOString(),
      repoUrl: ref.repoUrl,
    });
    return {
      consumerRoot: dirname(join(packageDir, ref.subPath)),
      templateFile: basename(ref.subPath),
      resolvedSha,
    };
  }

  // Git-based (github, https, git+ssh)
  console.log(`ℹ Fetching remote template: ${ref.repoUrl}@${ref.ref}...`);
  const start = Date.now();
  resolvedSha = await resolveGitRef(ref, dir);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  Cloned in ${elapsed}s`);
  console.log(`  Resolved to ${resolvedSha}`);

  await writeManifest(dir, {
    ref: `${ref.repoUrl}/${ref.subPath}@${ref.ref}`,
    resolvedSha,
    fetchedAt: new Date().toISOString(),
    repoUrl: ref.repoUrl,
  });

  return {
    consumerRoot: dirname(join(dir, ref.subPath)),
    templateFile: basename(ref.subPath),
    resolvedSha,
  };
}
