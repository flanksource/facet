/**
 * Resolve bundled assets (package.json, openapi.yaml, styles.css, the vite
 * loaders) by path, working both when running from source via tsx and from the
 * built bundle in the published package.
 *
 * Replaces Bun's `import x from './f' with { type: 'file' }`, which is not a
 * Node feature. Assets are looked up relative to this module by walking up to
 * the nearest directory that contains them — the cli package root in source
 * layout, or the package root in the published tarball.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

/**
 * Asset locations relative to a base directory. The first candidate that exists
 * wins, so the same call works in the `cli/` source tree (assets at repo root /
 * cli root) and in the built/published package (assets copied beside the bundle).
 */
const ASSET_CANDIDATES: Record<string, string[]> = {
  'package.json': ['../package.json', 'package.json', 'assets/package.json'],
  'openapi.yaml': ['../openapi.yaml', 'openapi.yaml', 'assets/openapi.yaml'],
  'styles.css': ['../src/styles.css', 'styles.css', 'assets/styles.css'],
  'vite-ssr-loader.ts': ['../vite-ssr-loader.ts', 'vite-ssr-loader.ts', 'assets/vite-ssr-loader.ts'],
  'vite-dev-loader.ts': ['../vite-dev-loader.ts', 'vite-dev-loader.ts', 'assets/vite-dev-loader.ts'],
};

export type AssetName = keyof typeof ASSET_CANDIDATES;

// Populated only inside a bun-compiled binary (see assets.bun.ts), where the
// fs search below fails because the module lives in the virtual /$bunfs root.
// Each value is a path bun's fs can read for an embedded `with { type: 'file' }`
// import; the npm/Node build leaves this empty and uses the fs search.
const embedded: Partial<Record<AssetName, string>> = {};

/** Register embedded asset paths. Called once by the bun entry shim. */
export function registerEmbeddedAssets(map: Partial<Record<AssetName, string>>): void {
  Object.assign(embedded, map);
}

/** Absolute path to a bundled asset. Throws if it cannot be located. */
export function assetPath(name: AssetName): string {
  const fromEmbed = embedded[name];
  if (fromEmbed) return fromEmbed;

  const candidates = ASSET_CANDIDATES[name];
  if (!candidates) throw new Error(`Unknown asset: ${name}`);

  // Search from the module dir and the two parents above it to tolerate the
  // src/<subdir>/ vs dist/ layout differences without hardcoding depth.
  const bases = [moduleDir, join(moduleDir, '..'), join(moduleDir, '..', '..')];
  for (const base of bases) {
    for (const rel of candidates) {
      const candidate = resolve(base, rel);
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error(`Could not locate asset "${name}" relative to ${moduleDir}`);
}
