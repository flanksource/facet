import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';

const EXCLUDED_DIRS = new Set([
  '.git', '.facet', '.facet-fragments', 'node_modules', 'dist', 'build', 'coverage', '.next', '.turbo',
]);
const INCLUDED_METADATA = new Set([
  'package.json', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock',
  'tsconfig.json', 'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
]);
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

/** Hash template sources and build metadata, intentionally excluding render data. */
export function computeTemplateBuildKey(
  consumerRoot: string,
  facetVersion: string,
  templatePath?: string,
): string {
  const files: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) visit(join(dir, entry.name));
        continue;
      }
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

  const cacheKey = `${consumerRoot}\0${templatePath ?? ''}`;
  const metadataDigest = metadataHash.digest('hex');
  let contentDigest = treeDigestCache.get(cacheKey)?.metadataDigest === metadataDigest
    ? treeDigestCache.get(cacheKey)!.contentDigest
    : undefined;
  if (!contentDigest) {
    const contentHash = createHash('sha256');
    if (selectedEntry) {
      try {
        contentHash.update(`entry:${templatePath}\0`);
        contentHash.update(readFileSync(selectedEntry));
        contentHash.update('\0');
      } catch { /* the normal source traversal will report/build missing entries */ }
    }
    for (const file of files) {
      contentHash.update(relative(consumerRoot, file));
      contentHash.update('\0');
      contentHash.update(readFileSync(file));
      contentHash.update('\0');
    }
    contentDigest = contentHash.digest('hex');
    treeDigestCache.set(cacheKey, { metadataDigest, contentDigest });
    if (treeDigestCache.size > 100) treeDigestCache.delete(treeDigestCache.keys().next().value!);
  }

  return createHash('sha256')
    .update(`facet:${facetVersion}\0entry:${templatePath ?? ''}\0${contentDigest}`)
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
