/**
 * Resolve bundled runtime assets (the repo-root package.json, openapi.yaml,
 * styles.css, and Mermaid browser bundle) by name, returning an absolute path.
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
import { runtimePlatformName } from '../runtime/platform.js';

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
//     three levels up.
//   - built layout: the bundle sits at cli/dist/, with assets copied to
//     cli/dist/assets/ — so `assets/<name>` resolves beside the bundle.
// Paths are explicit (not a fuzzy multi-base walk) so package.json always
// resolves the repo-root @flanksource/facet manifest, never cli/package.json.
// `assets/` (shipped beside the bundle in the npm package) is checked first;
// the `../../../` source-tree fallback is only reached when running from source,
// where no `assets/` dir exists. Order matters: in an installed package the
// source-tree path would otherwise collide with the consumer's own package.json.
const ASSET_CANDIDATES = {
  'default-runtime.json': ['assets/default-runtime.json', `../../assets/runtimes/${runtimePlatformName()}/default-runtime.json`],
  'default-runtime.tgz': ['assets/default-runtime.tgz', `../../assets/runtimes/${runtimePlatformName()}/default-runtime.tgz`],
  'package.json': ['assets/package.json', '../../../package.json'],
  'openapi.yaml': ['assets/openapi.yaml', '../../../openapi.yaml'],
  'styles.css': ['assets/styles.css', '../../../dist/styles.css'],
  'page-sizes.json': ['assets/page-sizes.json', '../../../src/types/page-sizes.json'],
  // Copied into .facet/ rather than resolved from @flanksource/facet: .facet
  // pins whatever facet version the consumer declared, which may predate this
  // file, and a failed import in postcss.config.js fails the whole CSS build.
  'facet-font-scale.mjs': ['assets/facet-font-scale.mjs', '../../../postcss/facet-font-scale.mjs'],
  // Same reasoning as facet-font-scale.mjs, and the stakes are higher: a failed
  // import here would drop the redaction pass, so it is copied in rather than
  // resolved from the consumer's pinned @flanksource/facet.
  'facet-redact.mjs': ['assets/facet-redact.mjs', '../../../remark/facet-redact.mjs'],
  'facet-runtime.mjs': ['assets/facet-runtime.mjs', '../../assets/plugins/facet-runtime.mjs'],
  // The oxlint plugin is the root `@flanksource/facet/oxlint` export; the `.mjs` asset name makes
  // oxlint load it as ESM when it is materialised outside the package (SEA temp dir, npm assets/).
  'facet-diagrams.oxlint.mjs': ['assets/facet-diagrams.oxlint.mjs', '../../../oxlint-plugins/facet-diagrams.js'],
  'mermaid.min.js': ['assets/mermaid.min.js', '../../../node_modules/mermaid/dist/mermaid.min.js'],
  'review-diagram.prompt': ['assets/review-diagram.prompt', '../../../.agents/skills/diagram-designer/prompts/review-diagram.prompt'],
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
  if (name === 'default-runtime.json' || name === 'default-runtime.tgz') {
    try { return requireCjs.resolve(`@flanksource/facet-runtime-${runtimePlatformName()}/${name}`); }
    catch (cause) { throw new Error(`Missing installed runtime for ${runtimePlatformName()}; reinstall Facet with optional dependencies enabled or run make build in a source checkout`, { cause }); }
  }
  throw new Error(`Could not locate asset "${name}" relative to ${moduleDir}`);
}
