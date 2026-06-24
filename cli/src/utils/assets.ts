/**
 * Resolve bundled runtime assets (the repo-root package.json, openapi.yaml,
 * styles.css, and the two vite loaders) by name, returning an absolute path.
 *
 * Replaces Bun's `import x from './f' with { type: 'file' }`, which is not a
 * Node feature. Works in the source tree (run via tsx) and in the built package
 * (assets copied beside the bundle into dist/assets/ by copy-assets.cjs).
 */
import { existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const requireCjs = createRequire(import.meta.url);

// Inside a Node SEA binary there is no asset on disk beside this module; the
// files are embedded in the executable. Materialize them to a temp file once so
// the path-based readFileSync consumers keep working.
let seaTempDir: string | undefined;
const seaAssetCache = new Map<string, string>();

function seaAssetPath(name: string): string | undefined {
  let sea: { isSea?: () => boolean; getRawAsset?: (n: string) => ArrayBuffer };
  try { sea = requireCjs('node:sea'); } catch { return undefined; }
  if (!sea.isSea?.() || !sea.getRawAsset) return undefined;
  const cached = seaAssetCache.get(name);
  if (cached) return cached;
  seaTempDir ??= mkdtempSync(join(tmpdir(), 'facet-assets-'));
  const out = join(seaTempDir, name);
  writeFileSync(out, Buffer.from(sea.getRawAsset(name)));
  seaAssetCache.set(name, out);
  return out;
}

// Candidate locations relative to this module, first existing wins:
//   - source layout: this module sits at cli/src/utils/, so repo-root files are
//     three levels up and the loaders two levels up (cli/).
//   - built layout: the bundle sits at cli/dist/, with assets copied to
//     cli/dist/assets/ — so `assets/<name>` resolves beside the bundle.
// Paths are explicit (not a fuzzy multi-base walk) so package.json always
// resolves the repo-root @flanksource/facet manifest, never cli/package.json.
// `assets/` (shipped beside the bundle in the npm package) is checked first;
// the `../../../` source-tree fallback is only reached when running from source,
// where no `assets/` dir exists. Order matters: in an installed package the
// source-tree path would otherwise collide with the consumer's own package.json.
const ASSET_CANDIDATES = {
  'package.json': ['assets/package.json', '../../../package.json'],
  'openapi.yaml': ['assets/openapi.yaml', '../../../openapi.yaml'],
  'styles.css': ['assets/styles.css', '../../../src/styles.css'],
} satisfies Record<string, string[]>;

export type AssetName = keyof typeof ASSET_CANDIDATES;

/** Absolute path to a bundled asset. Throws if it cannot be located. */
export function assetPath(name: AssetName): string {
  const fromSea = seaAssetPath(name);
  if (fromSea) return fromSea;

  const candidates = ASSET_CANDIDATES[name];
  if (!candidates) throw new Error(`Unknown asset: ${name}`);
  for (const rel of candidates) {
    const candidate = resolve(moduleDir, rel);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not locate asset "${name}" relative to ${moduleDir}`);
}
