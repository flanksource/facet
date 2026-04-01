/**
 * Caches .facet/node_modules/ directories keyed by dependency hash.
 *
 * The expensive part of each render is `npm install` inside .facet/.
 * This cache maintains warmed node_modules/ directories and symlinks
 * them into each render's .facet/ dir, so FacetDirectory.needsInstall()
 * returns false and npm install is skipped entirely.
 *
 * Template source files in .facet/src/ are symlinked before each render
 * and cleaned up after, so the cached node_modules stays clean.
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync, readlinkSync, renameSync, cpSync, lstatSync, realpathSync } from 'fs';
import { join, isAbsolute, basename } from 'path';
import { tmpdir } from 'os';
import { Logger } from '../utils/logger.js';

const CACHE_ROOT = join(tmpdir(), 'facet-cache');
const MAX_CACHE_ENTRIES = 10;

/** Compute a short hash from the dependency map for cache keying. */
export function depHash(deps: Record<string, string> | undefined): string {
  const key = deps ? JSON.stringify(deps, Object.keys(deps).sort()) : '{}';
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

function cacheDir(hash: string): string {
  return join(CACHE_ROOT, hash);
}

/**
 * If a cached node_modules exists for this dep hash, symlink it into
 * facetRoot so npm install is skipped. Returns true if cache was used.
 */
export function linkCachedNodeModules(facetRoot: string, hash: string, logger: Logger): boolean {
  const cached = join(cacheDir(hash), 'node_modules');
  if (!existsSync(cached)) return false;

  const target = join(facetRoot, 'node_modules');
  if (existsSync(target)) {
    try {
      if (readlinkSync(target) === cached) return true;
      rmSync(target, { force: true });
    } catch {
      // Not a symlink — real dir from a prior in-place install; remove it.
      rmSync(target, { recursive: true, force: true });
    }
  }

  symlinkSync(cached, target, 'junction');
  logger.debug(`Linked cached node_modules (${hash})`);
  // Touch the cache dir so LRU eviction works
  try { statSync(cacheDir(hash)); } catch {}
  return true;
}

/**
 * After a fresh npm install, move the newly-created node_modules into
 * the cache and symlink it back so subsequent renders reuse it.
 */
export function promoteToCacheAfterInstall(facetRoot: string, hash: string, logger: Logger): void {
  const nmPath = join(facetRoot, 'node_modules');
  if (!existsSync(nmPath)) return;

  // Don't promote if it's already a symlink (already cached)
  try { readlinkSync(nmPath); return; } catch { /* real dir — promote it */ }

  // Resolve relative symlinks before moving — they won't resolve from the cache dir
  resolveRelativeSymlinks(nmPath, logger);

  ensureCacheDir();
  const dest = join(cacheDir(hash), 'node_modules');
  mkdirSync(cacheDir(hash), { recursive: true });

  // Move node_modules → cache, then symlink back
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });

  // Use rename for atomic move (same filesystem)
  try {
    renameSync(nmPath, dest);
  } catch {
    // Cross-device: fall back to copy + delete
    cpSync(nmPath, dest, { recursive: true });
    rmSync(nmPath, { recursive: true, force: true });
  }
  symlinkSync(dest, nmPath, 'junction');
  logger.debug(`Promoted node_modules to cache (${hash})`);
  evictCache(logger);
}

/**
 * Resolve relative symlinks (from npm `file:` deps) to absolute paths.
 * After moving node_modules to cache, relative symlinks no longer resolve.
 */
function resolveRelativeSymlinks(nodeModulesPath: string, logger: Logger): void {
  const check = (pkgPath: string) => {
    try {
      if (!lstatSync(pkgPath).isSymbolicLink()) return;
      const target = readlinkSync(pkgPath);
      if (isAbsolute(target)) return;
      const resolved = realpathSync(pkgPath);
      rmSync(pkgPath, { force: true });
      symlinkSync(resolved, pkgPath, 'junction');
      logger.debug(`Resolved relative symlink: ${basename(pkgPath)} -> ${resolved}`);
    } catch { /* skip unresolvable */ }
  };

  for (const entry of readdirSync(nodeModulesPath)) {
    if (entry.startsWith('@')) {
      const scopePath = join(nodeModulesPath, entry);
      try {
        for (const pkg of readdirSync(scopePath)) check(join(scopePath, pkg));
      } catch { /* skip */ }
    } else if (!entry.startsWith('.')) {
      check(join(nodeModulesPath, entry));
    }
  }
}

function ensureCacheDir(): void {
  mkdirSync(CACHE_ROOT, { recursive: true });
}

/** Evict oldest cache entries when the cache grows too large. */
function evictCache(logger: Logger): void {
  if (!existsSync(CACHE_ROOT)) return;

  const entries = readdirSync(CACHE_ROOT)
    .map(name => {
      const full = join(CACHE_ROOT, name);
      try { return { name, full, mtime: statSync(full).mtimeMs }; } catch { return null; }
    })
    .filter((e): e is { name: string; full: string; mtime: number } => e !== null)
    .sort((a, b) => b.mtime - a.mtime);

  for (const entry of entries.slice(MAX_CACHE_ENTRIES)) {
    logger.debug(`Evicting facet cache: ${entry.name}`);
    rmSync(entry.full, { recursive: true, force: true });
  }
}
