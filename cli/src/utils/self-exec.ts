/**
 * Resolve how to re-exec this CLI as a loader subprocess (FACET_LOADER set).
 *
 * A Node SEA binary runs its embedded entry directly; an interpreter (node/bun)
 * needs the CLI entry passed — resolved by path rather than process.argv[1],
 * which is the test file under a test runner, so the dispatch always loads.
 */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  const isBun = !!process.versions.bun;
  // A TypeScript entry under Node needs tsx to load it. Pass tsx's absolute
  // path (not the bare specifier) so it resolves regardless of the subprocess
  // cwd (which is the consumer project, not the CLI's node_modules). Bun runs
  // .ts natively; a built .js/.mjs entry needs neither.
  if (entry.endsWith('.ts') && !isBun) {
    let tsxArg = 'tsx';
    try { tsxArg = pathToFileURL(requireCjs.resolve('tsx')).href; } catch { /* fall back to bare specifier */ }
    return [process.execPath, '--import', tsxArg, entry];
  }
  return [process.execPath, entry];
}
