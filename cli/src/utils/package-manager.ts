/**
 * Package manager resolution.
 *
 * facet requires pnpm for all install operations. pnpm's content-addressable
 * store gives us fast, correct reuse across renders without a bespoke cache.
 *
 * This module fails fast when pnpm is missing or when a project pins a
 * different package manager via the `packageManager` field.
 */

import { $ } from 'bun';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

export interface PackageManager {
  /** Command to invoke the package manager (e.g. `pnpm`). */
  cmd: 'pnpm';
  /** Command prefix for running a dependency binary (e.g. `pnpm exec`). */
  exec: string;
  /** Resolved version string from `pnpm --version`. */
  version: string;
}

let cached: PackageManager | undefined;

/**
 * Verify pnpm is usable and honor any `packageManager` pin in the project tree.
 * Throws with an actionable message if pnpm is missing or a foreign manager is pinned.
 *
 * Result is memoized per process — the check is cheap but not free.
 */
export async function resolvePackageManager(cwd: string): Promise<PackageManager> {
  if (cached) return cached;

  const pin = findPackageManagerPin(cwd);
  if (pin && pin.name !== 'pnpm') {
    throw new Error(
      `facet requires pnpm, but ${pin.source} pins packageManager="${pin.raw}". ` +
      `Change it to pnpm@<version> (and run \`corepack enable\`), or remove the field.`
    );
  }

  let version: string;
  try {
    const result = await $`pnpm --version`.quiet();
    version = result.stdout.toString().trim();
  } catch (err) {
    throw new Error(
      `facet requires pnpm, but it was not found on PATH. ` +
      `Install it with \`npm i -g pnpm\` or \`corepack enable\`. ` +
      `(underlying error: ${err instanceof Error ? err.message : String(err)})`
    );
  }

  cached = { cmd: 'pnpm', exec: 'pnpm exec', version };
  return cached;
}

/** Reset the memoized resolution. Test-only. */
export function _resetPackageManagerCache(): void {
  cached = undefined;
}

interface PackageManagerPin {
  name: string;
  raw: string;
  source: string;
}

function findPackageManagerPin(cwd: string): PackageManagerPin | null {
  let dir = cwd;
  while (true) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (typeof pkg.packageManager === 'string' && pkg.packageManager.length > 0) {
          const raw = pkg.packageManager as string;
          const name = raw.split('@')[0] ?? raw;
          return { name, raw, source: pkgPath };
        }
      } catch {
        // ignore malformed package.json — just keep walking up
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
