import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, renameSync, statSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Dot-directories (.git, .facet, .tmp, .gavel, .vitest, …) are skipped wholesale
// in the walk; this set only needs the non-dot build-output/tool dirs.
const EXCLUDED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', 'npm-dist', 'dist-sea', 'dist-playground', 'out',
]);
const INCLUDED_METADATA = new Set([
  'package.json', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock',
  'tsconfig.json', 'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
]);
const MODULE_METADATA = new Set(['package.json', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock']);
const SOURCE_EXTENSIONS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts', '.md', '.mdx',
  '.css', '.scss', '.sass', '.less', '.json', '.yaml', '.yml', '.svg',
]);

function extension(name: string): string {
  const index = name.lastIndexOf('.');
  return index < 0 ? '' : name.slice(index).toLowerCase();
}

interface TreeDigestCacheEntry {
  metadataDigest: string;
  contentDigest: string;
}

const treeDigestCache = new Map<string, TreeDigestCacheEntry>();

// Second-level digest memo persisted under .facet/ so CLI invocations (fresh
// processes) skip re-reading unchanged source bytes. Correctness is guarded by
// the metadata digest, so a stale or lost file only costs a re-hash.
const PERSISTED_DIGEST_FILE = 'build-key-cache.json';
const PERSISTED_DIGEST_LIMIT = 64;

function persistedDigestPath(consumerRoot: string): string {
  return join(consumerRoot, '.facet', PERSISTED_DIGEST_FILE);
}

function readPersistedDigest(consumerRoot: string, entryKey: string): TreeDigestCacheEntry | undefined {
  try {
    const entries = JSON.parse(readFileSync(persistedDigestPath(consumerRoot), 'utf-8')).entries;
    const entry = entries?.[entryKey];
    return typeof entry?.metadataDigest === 'string' && typeof entry?.contentDigest === 'string'
      ? entry
      : undefined;
  } catch {
    return undefined;
  }
}

function writePersistedDigest(consumerRoot: string, entryKey: string, entry: TreeDigestCacheEntry): void {
  // Never create .facet/ as a side effect — this also runs against pristine
  // template source dirs (workspace keying) that must stay untouched.
  if (!existsSync(join(consumerRoot, '.facet'))) return;
  const path = persistedDigestPath(consumerRoot);
  let entries: Record<string, TreeDigestCacheEntry> = {};
  try {
    const existing = JSON.parse(readFileSync(path, 'utf-8')).entries;
    if (existing && typeof existing === 'object') entries = existing;
  } catch { /* first write or unreadable file — start fresh */ }
  delete entries[entryKey];
  entries[entryKey] = entry;
  const keys = Object.keys(entries);
  for (const stale of keys.slice(0, Math.max(0, keys.length - PERSISTED_DIGEST_LIMIT))) delete entries[stale];
  const staging = `${path}.tmp-${process.pid}-${randomUUID()}`;
  try {
    writeFileSync(staging, JSON.stringify({ version: 1, entries }));
    renameSync(staging, path);
  } catch {
    try { rmSync(staging, { force: true }); } catch { /* best effort */ }
  }
}

/** Digest cost breakdown, reported via TemplateBuildKeyOptions.onStats. */
export interface BuildKeyStats {
  fileCount: number;
  walkMs: number;
  contentReused: boolean;
  contentBytes: number;
  totalMs: number;
}

/** Hash template sources and build metadata, intentionally excluding render data. */
export interface TemplateBuildKeyOptions {
  consumerRoot: string;
  facetVersion: string;
  templatePath?: string;
  skipModules?: boolean;
  /**
   * Digest of build inputs outside the consumer tree — the generated .facet/
   * configs. Without it, a config change at an unchanged facet version (dev
   * builds, tuning flags) silently reuses stale SSR bundles.
   */
  extraDigest?: string;
  onStats?: (stats: BuildKeyStats) => void;
}

export function computeTemplateBuildKey(options: TemplateBuildKeyOptions): string {
  const { consumerRoot, facetVersion, templatePath, skipModules = false } = options;
  const startedAt = performance.now();
  const files: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !EXCLUDED_DIRS.has(entry.name)) visit(join(dir, entry.name));
        continue;
      }
      if (skipModules && MODULE_METADATA.has(entry.name)) continue;
      if (entry.isFile() && (INCLUDED_METADATA.has(entry.name) || SOURCE_EXTENSIONS.has(extension(entry.name)))) {
        files.push(join(dir, entry.name));
      }
    }
  };

  visit(consumerRoot);
  files.sort();
  const selectedEntry = templatePath ? join(consumerRoot, templatePath) : undefined;
  const metadataHash = createHash('sha256');
  if (selectedEntry) {
    try {
      const stats = statSync(selectedEntry, { bigint: true });
      metadataHash.update(`entry:${templatePath}\0${stats.size}:${stats.mtimeNs}\0`);
    } catch { /* the normal source traversal will report/build missing entries */ }
  }
  for (const file of files) {
    const stats = statSync(file, { bigint: true });
    metadataHash.update(relative(consumerRoot, file));
    metadataHash.update(`\0${stats.size}:${stats.mtimeNs}\0`);
  }

  const moduleMode = skipModules ? 'skip' : 'project';
  const entryKey = `${templatePath ?? ''}\0${moduleMode}`;
  const cacheKey = `${consumerRoot}\0${entryKey}`;
  const metadataDigest = metadataHash.digest('hex');
  const walkMs = performance.now() - startedAt;
  let contentBytes = 0;
  let contentDigest = treeDigestCache.get(cacheKey)?.metadataDigest === metadataDigest
    ? treeDigestCache.get(cacheKey)!.contentDigest
    : undefined;
  if (!contentDigest) {
    const persisted = readPersistedDigest(consumerRoot, entryKey);
    if (persisted?.metadataDigest === metadataDigest) {
      contentDigest = persisted.contentDigest;
      treeDigestCache.set(cacheKey, persisted);
    }
  }
  const contentReused = contentDigest != null;
  if (!contentDigest) {
    const contentHash = createHash('sha256');
    if (selectedEntry) {
      try {
        contentHash.update(`entry:${templatePath}\0`);
        const entryContent = readFileSync(selectedEntry);
        contentBytes += entryContent.length;
        contentHash.update(entryContent);
        contentHash.update('\0');
      } catch { /* the normal source traversal will report/build missing entries */ }
    }
    for (const file of files) {
      contentHash.update(relative(consumerRoot, file));
      contentHash.update('\0');
      const content = readFileSync(file);
      contentBytes += content.length;
      contentHash.update(content);
      contentHash.update('\0');
    }
    contentDigest = contentHash.digest('hex');
    treeDigestCache.set(cacheKey, { metadataDigest, contentDigest });
    if (treeDigestCache.size > 100) treeDigestCache.delete(treeDigestCache.keys().next().value!);
    writePersistedDigest(consumerRoot, entryKey, { metadataDigest, contentDigest });
  }

  options.onStats?.({
    fileCount: files.length,
    walkMs: Number(walkMs.toFixed(1)),
    contentReused,
    contentBytes,
    totalMs: Number((performance.now() - startedAt).toFixed(1)),
  });
  return createHash('sha256')
    .update(`facet:${facetVersion}\0modules:${moduleMode}\0entry:${templatePath ?? ''}\0extra:${options.extraDigest ?? ''}\0${contentDigest}`)
    .digest('hex').slice(0, 24);
}

/** Keep the newest cache entries within a configurable count. */
export function pruneBuildCache(cacheRoot: string): void {
  const maxEntries = Math.max(1, parseInt(process.env['FACET_BUILD_CACHE_ENTRIES'] ?? '10', 10));
  let entries: Array<{ path: string; mtimeMs: number }>;
  try {
    entries = readdirSync(cacheRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.includes('.tmp-'))
      .map((entry) => {
        const path = join(cacheRoot, entry.name);
        return { path, mtimeMs: statSync(path).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return;
  }
  for (const entry of entries.slice(maxEntries)) {
    rmSync(entry.path, { recursive: true, force: true });
  }
}
