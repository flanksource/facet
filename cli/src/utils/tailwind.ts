import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { runPersistentCssBuild } from '../bundler/ssr-pool.js';
import type { Logger } from './logger.js';
import { selfExecBase } from './self-exec.js';
import { spawnLowPriority } from './subprocess-priority.js';

export interface CachedTailwindOptions {
  facetRoot: string;
  html: string;
  buildCacheKey: string;
  logger?: Logger;
  /**
   * CSS the SSR bundle already emitted. With Tailwind v3 and no `@tailwind`
   * directive anywhere in the post-process inputs (facet.css ships
   * pre-expanded), the post-process pass is content-independent
   * autoprefix-over-prebuilt CSS, so this is returned directly instead of
   * running a second Vite build that recomputes the same stylesheet.
   */
  ssrCss?: string;
  /** Route cache misses through the persistent SSR daemon's warm Vite. */
  persistentLoader?: boolean;
}

const tailwindLocks = new Map<string, Promise<string>>();

export function resolveTailwindMajor(facetRoot: string): number {
  const facetRequire = createRequire(join(facetRoot, 'package.json'));
  const version = JSON.parse(readFileSync(facetRequire.resolve('tailwindcss/package.json'), 'utf-8')).version as string;
  const major = Number(version.split('.')[0]);
  if (major !== 3 && major !== 4) {
    throw new Error(`Unsupported Tailwind CSS version ${version}; expected major version 3 or 4`);
  }
  return major;
}

async function pruneTailwindCache(cacheDir: string): Promise<void> {
  const maxEntries = Math.max(1, parseInt(process.env['FACET_TAILWIND_CACHE_ENTRIES'] ?? '50', 10));
  let entries: Array<{ path: string; mtimeMs: number }>;
  try {
    const names = (await readdir(cacheDir)).filter((name) => name.endsWith('.css'));
    if (names.length <= maxEntries) return;
    entries = await Promise.all(names.map(async (name) => {
      const path = join(cacheDir, name);
      return { path, mtimeMs: (await stat(path)).mtimeMs };
    }));
  } catch {
    return;
  }
  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  await Promise.all(entries.slice(maxEntries).map((entry) =>
    rm(entry.path, { force: true }).catch(() => undefined),
  ));
}

export function renderedClassKey(html: string): { key: string; content: string; classCount: number } {
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
    classCount: sorted.length,
  };
}

async function runViteCssBuild(
  facetRoot: string,
  outputFile: string,
  contentFile: string,
): Promise<void> {
  const [command, ...baseArgs] = selfExecBase();
  const args = [...baseArgs, `--facet-root=${facetRoot}`, `--output-file=${outputFile}`, `--content-file=${contentFile}`];
  await new Promise<void>((resolve, reject) => {
    const child = spawnLowPriority({
      command,
      args,
      options: {
        cwd: facetRoot,
        env: { ...process.env, FACET_LOADER: 'css', FACET_POST_PROCESS: '1' },
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    });
    // Tee live so a slow build is never silent; keep capturing for the error.
    const stderr: Buffer[] = [];
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr.push(chunk);
      process.stderr.write(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Vite CSS post-processing failed with exit code ${code}:\n${Buffer.concat(stderr).toString()}`));
    });
  });
}

/**
 * True when a v3 post-process build could depend on the rendered class set:
 * some CSS input carries a `@tailwind` directive (utilities generation scans
 * content), or an import cannot be statically inspected. Relative imports are
 * followed; URL imports never carry directives; anything else is assumed live.
 */
export function tailwindDirectivesPresent(facetRoot: string): boolean {
  const stack = [join(facetRoot, 'post-process.css')];
  const seen = new Set<string>();
  try {
    while (stack.length > 0) {
      const file = stack.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const css = readFileSync(file, 'utf-8');
      if (/@tailwind\b/.test(css)) return true;
      for (const match of css.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) {
        const specifier = match[1];
        if (/^(https?:)?\/\//.test(specifier)) continue;
        if (!specifier.startsWith('.')) return true;
        stack.push(resolve(dirname(file), specifier));
      }
    }
    return false;
  } catch {
    return true;
  }
}

export async function runTailwindCached(opts: CachedTailwindOptions): Promise<string> {
  if (
    opts.ssrCss != null
    && resolveTailwindMajor(opts.facetRoot) === 3
    && !tailwindDirectivesPresent(opts.facetRoot)
  ) {
    opts.logger?.debug('Tailwind CSS reused from SSR build (Tailwind v3, no @tailwind directives in post-process inputs)');
    return opts.ssrCss;
  }

  const classSet = renderedClassKey(opts.html);
  const cacheDir = join(opts.facetRoot, 'tailwind-cache');
  const cachePath = join(cacheDir, `${opts.buildCacheKey}-${classSet.key}.css`);
  const existing = tailwindLocks.get(cachePath);
  if (existing) return existing;

  const operation = (async () => {
    try {
      const css = await readFile(cachePath, 'utf-8');
      const now = new Date();
      try { await utimes(cachePath, now, now); } catch { /* cache may be pruned concurrently */ }
      opts.logger?.debug(`Tailwind CSS cache hit (${classSet.classCount} classes, key ${opts.buildCacheKey}-${classSet.key})`);
      return css;
    } catch { /* cache miss */ }

    await mkdir(cacheDir, { recursive: true });
    const outputPath = join(cacheDir, `${process.pid}-${randomUUID()}.css`);
    const buildStartedAt = performance.now();
    try {
      let css: string | undefined;
      let via = 'daemon';
      if (opts.persistentLoader && opts.logger) {
        try {
          css = await runPersistentCssBuild({ facetRoot: opts.facetRoot, content: classSet.content }, opts.logger);
          await writeFile(outputPath, css, 'utf-8');
        } catch (error) {
          opts.logger.warn(`Persistent CSS build failed; falling back to one-shot loader: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (css == null) {
        via = 'subprocess';
        const contentPath = join(opts.facetRoot, `rendered-content-${randomUUID()}.html`);
        await writeFile(contentPath, classSet.content, 'utf-8');
        try {
          await runViteCssBuild(opts.facetRoot, outputPath, contentPath);
          css = await readFile(outputPath, 'utf-8');
        } finally {
          await rm(contentPath, { force: true });
        }
      }
      opts.logger?.info(`Tailwind CSS built in ${(performance.now() - buildStartedAt).toFixed(0)}ms (cache miss, ${via}, ${classSet.classCount} classes, key ${opts.buildCacheKey}-${classSet.key})`);
      try {
        await rename(outputPath, cachePath);
      } catch {
        await rm(outputPath, { force: true });
      }
      await pruneTailwindCache(cacheDir);
      return css;
    } finally {
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
