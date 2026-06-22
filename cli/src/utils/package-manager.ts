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

// Memoize only the `pnpm --version` probe — it's process-stable.
// The pin check must run for every cwd, otherwise long-lived processes
// (e.g. `facet serve`) could reuse a cwd-specific result for a project
// tree that pins a different package manager.
let cachedVersion: string | undefined;

/**
 * Verify pnpm is usable and honor any `packageManager` pin in the project tree.
 * If pnpm is missing and a pnpm pin exists, attempts `corepack enable pnpm`
 * before failing. Throws with an actionable message on unrecoverable failure.
 */
export async function resolvePackageManager(cwd: string): Promise<PackageManager> {
  const pin = findPackageManagerPin(cwd);
  if (pin && pin.name !== 'pnpm') {
    throw new Error(
      `facet requires pnpm, but ${pin.source} pins packageManager="${pin.raw}". ` +
      `Change it to pnpm@<version> (and run \`corepack enable\`), or remove the field.`
    );
  }

  if (cachedVersion === undefined) {
    cachedVersion = await probePnpmVersionWithBootstrap(pin);
  }

  return { cmd: 'pnpm', exec: 'pnpm exec', version: cachedVersion };
}

async function probePnpmVersionWithBootstrap(pin: PackageManagerPin | null): Promise<string> {
  const first = await tryProbePnpmVersion();
  if (first.ok) return first.version;

  // pnpm missing. If the project pins pnpm, corepack can install/activate it
  // automatically (Node ships with corepack since v16). Otherwise corepack
  // refuses without a pin, so don't bother trying.
  if (pin && pin.name === 'pnpm') {
    const enabled = await tryCorepackEnablePnpm();
    if (enabled) {
      const second = await tryProbePnpmVersion();
      if (second.ok) return second.version;
    }
  }

  const baseHint = pin && pin.name === 'pnpm'
    ? `Tried \`corepack enable pnpm\` (your ${pin.source} pins ${pin.raw}) but it did not produce a working pnpm. ` +
      `Install pnpm manually: \`npm i -g pnpm\`, or ensure corepack is on PATH.`
    : `Add \`"packageManager": "pnpm@<version>"\` to your package.json (corepack will then auto-install pnpm), ` +
      `or install pnpm globally: \`npm i -g pnpm\` / \`corepack enable\`.`;

  throw new Error(
    `facet requires pnpm, but it was not found on PATH. ${baseHint} ` +
    `(underlying error: ${first.error})`
  );
}

type ProbeResult = { ok: true; version: string } | { ok: false; error: string };

async function tryProbePnpmVersion(): Promise<ProbeResult> {
  try {
    const result = await $`pnpm --version`.quiet();
    return { ok: true, version: result.stdout.toString().trim() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function tryCorepackEnablePnpm(): Promise<boolean> {
  try {
    await $`corepack enable pnpm`.quiet();
    return true;
  } catch {
    return false;
  }
}

/** Reset the memoized resolution. Test-only. */
export function _resetPackageManagerCache(): void {
  cachedVersion = undefined;
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
          const name = raw.split('@')[0];
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
