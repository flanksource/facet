/**
 * Tailwind CSS invocation.
 *
 * `tailwindcss` is installed into `.facet/node_modules/.bin/` by the facet-directory
 * builder. We invoke that binary directly instead of going through `pnpm exec`, so a
 * render does not need pnpm on PATH at runtime — only at install time.
 */

import { $ } from './shell.js';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'path';

export class TailwindBinNotFoundError extends Error {
  constructor(public readonly expectedPath: string) {
    super(
      `tailwindcss binary not found at ${expectedPath}. ` +
      `Run a render to populate \`.facet/node_modules\`, or \`cd .facet && pnpm install\`.`
    );
    this.name = 'TailwindBinNotFoundError';
  }
}

/**
 * Resolve the tailwindcss binary path inside a `.facet/` directory.
 * Does not check existence — call `tailwindBinExists()` for that.
 */
export function resolveTailwindBin(facetRoot: string): string {
  const name = process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss';
  return join(facetRoot, 'node_modules', '.bin', name);
}

export function tailwindBinExists(facetRoot: string): boolean {
  return existsSync(resolveTailwindBin(facetRoot));
}

export interface RunTailwindOptions {
  facetRoot: string;
  stylesInput: string;
  contentPath: string;
  outputCssPath: string;
  verbose?: boolean;
}

/**
 * Invoke the locally-installed tailwindcss CLI.
 *
 * Throws `TailwindBinNotFoundError` if the binary is missing; throws other errors
 * verbatim from the subprocess. Callers should catch and decide whether to fall
 * back (e.g. to Vite-generated CSS) or surface the failure.
 */
export async function runTailwind(opts: RunTailwindOptions): Promise<void> {
  const bin = resolveTailwindBin(opts.facetRoot);
  if (!existsSync(bin)) {
    throw new TailwindBinNotFoundError(bin);
  }
  const cmd = $`${bin} -i ${opts.stylesInput} --content ${opts.contentPath} -o ${opts.outputCssPath}`;
  if (opts.verbose) {
    const result = await cmd;
    if (result.stdout.length) process.stdout.write(result.stdout);
    if (result.stderr.length) process.stderr.write(result.stderr);
  } else {
    await cmd.quiet();
  }
}

export interface CachedTailwindOptions {
  facetRoot: string;
  stylesInput: string;
  html: string;
  buildCacheKey: string;
  verbose?: boolean;
}

const tailwindLocks = new Map<string, Promise<string>>();

async function pruneTailwindCache(cacheDir: string): Promise<void> {
  const maxEntries = Math.max(1, parseInt(process.env['FACET_TAILWIND_CACHE_ENTRIES'] ?? '50', 10));
  const names = (await readdir(cacheDir)).filter((name) => name.endsWith('.css'));
  if (names.length <= maxEntries) return;
  const entries = await Promise.all(names.map(async (name) => {
    const path = join(cacheDir, name);
    return { path, mtimeMs: (await stat(path)).mtimeMs };
  }));
  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  await Promise.all(entries.slice(maxEntries).map((entry) => rm(entry.path, { force: true })));
}

/** Extract the data-dependent class set without including unrelated text. */
export function renderedClassKey(html: string): { key: string; content: string } {
  const classes = new Set<string>();
  const pattern = /\bclass=(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of html.matchAll(pattern)) {
    for (const name of (match[1] ?? match[2] ?? '').split(/\s+/)) {
      if (name) classes.add(name);
    }
  }
  const sorted = [...classes].sort();
  return {
    key: createHash('sha256').update(sorted.join('\0')).digest('hex').slice(0, 16),
    content: `<div class="${sorted.join(' ')}"></div>`,
  };
}

/** Generate Tailwind once per template and rendered class set. */
export async function runTailwindCached(opts: CachedTailwindOptions): Promise<string> {
  const classSet = renderedClassKey(opts.html);
  const cacheDir = join(opts.facetRoot, 'tailwind-cache');
  const cachePath = join(cacheDir, `${opts.buildCacheKey}-${classSet.key}.css`);
  const existing = tailwindLocks.get(cachePath);
  if (existing) return existing;

  const operation = (async () => {
    try {
      return await readFile(cachePath, 'utf-8');
    } catch { /* cache miss */ }

    await mkdir(cacheDir, { recursive: true });
    const nonce = `${process.pid}-${randomUUID()}`;
    const contentPath = join(cacheDir, `${nonce}.html`);
    const outputPath = join(cacheDir, `${nonce}.css`);
    try {
      await writeFile(contentPath, classSet.content, 'utf-8');
      await runTailwind({
        facetRoot: opts.facetRoot,
        stylesInput: opts.stylesInput,
        contentPath,
        outputCssPath: outputPath,
        verbose: opts.verbose,
      });
      const css = await readFile(outputPath, 'utf-8');
      try {
        await rename(outputPath, cachePath);
      } catch {
        // A separate process may have populated the same content-addressed key.
        await rm(outputPath, { force: true });
      }
      await pruneTailwindCache(cacheDir);
      return css;
    } finally {
      await rm(contentPath, { force: true });
      await rm(outputPath, { force: true });
    }
  })();

  tailwindLocks.set(cachePath, operation);
  try {
    return await operation;
  } finally {
    if (tailwindLocks.get(cachePath) === operation) tailwindLocks.delete(cachePath);
  }
}
