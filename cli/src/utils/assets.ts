/**
 * Resolve bundled runtime assets (the repo-root package.json, openapi.yaml,
 * styles.css, and the two vite loaders) by name, returning an absolute path.
 *
 * Replaces Bun's `import x from './f' with { type: 'file' }`, which is not a
 * Node feature. Works in the source tree (run via tsx) and in the built package
 * (assets copied beside the bundle into dist/assets/ by copy-assets.cjs).
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

// Candidate locations relative to this module, first existing wins:
//   - source layout: this module sits at cli/src/utils/, so repo-root files are
//     three levels up and the loaders two levels up (cli/).
//   - built layout: the bundle sits at cli/dist/, with assets copied to
//     cli/dist/assets/ — so `assets/<name>` resolves beside the bundle.
// Paths are explicit (not a fuzzy multi-base walk) so package.json always
// resolves the repo-root @flanksource/facet manifest, never cli/package.json.
const ASSET_CANDIDATES = {
  'package.json': ['../../../package.json', 'assets/package.json'],
  'openapi.yaml': ['../../../openapi.yaml', 'assets/openapi.yaml'],
  'styles.css': ['../../../src/styles.css', 'assets/styles.css'],
} satisfies Record<string, string[]>;

export type AssetName = keyof typeof ASSET_CANDIDATES;

/** Absolute path to a bundled asset. Throws if it cannot be located. */
export function assetPath(name: AssetName): string {
  const candidates = ASSET_CANDIDATES[name];
  if (!candidates) throw new Error(`Unknown asset: ${name}`);
  for (const rel of candidates) {
    const candidate = resolve(moduleDir, rel);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not locate asset "${name}" relative to ${moduleDir}`);
}
