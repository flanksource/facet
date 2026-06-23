/**
 * Resolve how to re-exec this CLI as a loader subprocess (FACET_LOADER set).
 *
 * A Node SEA binary runs its embedded entry directly; an interpreter (node/bun)
 * needs the CLI entry passed — resolved by path rather than process.argv[1],
 * which is the test file under a test runner, so the dispatch always loads.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const requireCjs = createRequire(import.meta.url);

export function selfExecBase(): string[] {
  try {
    const sea = requireCjs('node:sea');
    if (typeof sea.isSea === 'function' && sea.isSea()) return [process.execPath];
  } catch { /* not a Node SEA build */ }
  const here = fileURLToPath(import.meta.url);
  // Built bundle: re-run it directly. Source: re-run cli.ts beside this dir.
  const entry = /\.(mjs|cjs|js)$/.test(here) ? here : resolve(dirname(here), '..', 'cli.ts');
  // Preserve runtime flags (e.g. node's `--import tsx`) so the child can load
  // the same TypeScript entry; empty under bun and a built bundle.
  return [process.execPath, ...process.execArgv, entry];
}
