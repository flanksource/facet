/**
 * Vite SSR loader, run as a self-exec subprocess (FACET_LOADER=ssr) from
 * inside .facet/. Builds the template's SSR bundle with Vite (resolved from
 * .facet/node_modules), renders it with React, and writes {html,css} JSON to
 * the --output-file. Kept out of the normal CLI path so Vite is never loaded
 * unless a render is in progress.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync, mkdirSync, renameSync, utimesSync } from 'node:fs';
import { Console } from 'node:console';
import { createInterface } from 'node:readline';

interface LoaderArgs {
  facetRoot: string;
  data: Record<string, unknown>;
  outputFile: string;
  /** 0 quiet (Vite warn), 1 Vite info, 2 + vite:* debug, 3 + profile. */
  verbosity: number;
  cacheKey?: string;
}

interface LoaderResult {
  html: string;
  css: string;
  error?: string;
}

function parseArgs(): LoaderArgs {
  const args = process.argv.slice(2);
  let facetRoot = '';
  let data: Record<string, unknown> = {};
  let outputFile = '';
  let verbosity = 0;
  let cacheKey: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--facet-root=')) {
      facetRoot = arg.substring('--facet-root='.length);
    } else if (arg.startsWith('--data-file=')) {
      const filePath = arg.substring('--data-file='.length);
      try {
        data = JSON.parse(readFileSync(filePath, 'utf-8'));
      } catch (error) {
        console.error(`Failed to parse data file ${filePath}:`, error);
        process.exit(1);
      }
    } else if (arg.startsWith('--data=')) {
      const dataStr = arg.substring('--data='.length);
      try {
        data = JSON.parse(dataStr);
      } catch (error) {
        console.error('Failed to parse --data JSON:', error);
        process.exit(1);
      }
    } else if (arg.startsWith('--output-file=')) {
      outputFile = arg.substring('--output-file='.length);
    } else if (arg === '--verbose') {
      verbosity = Math.max(verbosity, 1);
    } else if (arg.startsWith('--verbosity=')) {
      const parsed = Number(arg.substring('--verbosity='.length));
      if (Number.isInteger(parsed) && parsed >= 0) verbosity = parsed;
    } else if (arg.startsWith('--cache-key=')) {
      cacheKey = arg.substring('--cache-key='.length);
    }
  }

  if (!facetRoot) {
    console.error('Missing required argument: --facet-root');
    process.exit(1);
  }

  return { facetRoot, data, outputFile, verbosity, cacheKey };
}

function extractCSS(distDir: string): string {
  try {
    const files = readdirSync(distDir);
    const cssFile = files.find(f => f.endsWith('.css'));
    if (cssFile) {
      return readFileSync(join(distDir, cssFile), 'utf-8');
    }
    return '';
  } catch (error) {
    console.error('Warning: Failed to extract CSS from build output:', error);
    return '';
  }
}

async function load(args: LoaderArgs): Promise<LoaderResult> {
  const { facetRoot, data, verbosity, cacheKey } = args;
  const profileEnabled = process.env.FACET_PROFILE === '1' || verbosity >= 3;
  const startedAt = performance.now();
  const stages: Record<string, number> = {};
  const stageMark = (stage: string, since: number): number => {
    const now = performance.now();
    stages[stage] = Number((now - since).toFixed(1));
    return now;
  };

  // Resolve React from .facet/node_modules, not the CLI's own deps. ESM
  // import() resolves via file URLs, so resolve explicitly relative to .facet — using
  // the CLI's Vite/React would produce a bundle incompatible with .facet's React.
  // react-dom resolves to a CJS build; under Node the API lands on `.default`
  // (Bun hoists the named exports), so fall back to it. Vite itself is imported
  // lazily below — a bundle-cache hit never needs it.
  const facetRequire = createRequire(join(facetRoot, 'package.json'));
  const rdsMod = await import(pathToFileURL(facetRequire.resolve('react-dom/server')).href);
  const renderToString = rdsMod.renderToString ?? rdsMod.default?.renderToString;
  let stageStart = stageMark('import-react', startedAt);

  const viteConfigPath = join(facetRoot, 'vite.config.ts');
  const cacheRoot = join(facetRoot, 'build-cache');
  const outDir = cacheKey
    ? join(cacheRoot, cacheKey)
    : join(facetRoot, `dist-${crypto.randomUUID()}`);

  // Route Vite's stdout logging to stderr so it can't corrupt the result JSON.
  console = new Console(process.stderr, process.stderr);

  const cachedBundle = cacheKey && existsSync(outDir) && readdirSync(outDir).some((file) => file.endsWith('.cjs'));
  if (!cachedBundle) {
    console.error(`[facet] SSR bundle cache miss for key ${cacheKey ?? '<uncached>'}; running vite build`);
    // The debug package snapshots DEBUG at import time, so -vv must set it
    // before Vite (and its plugins) are loaded.
    if (verbosity >= 2 && !process.env.DEBUG) process.env.DEBUG = 'vite:*';
    const viteMod = await import(pathToFileURL(facetRequire.resolve('vite')).href);
    const build = (viteMod.build ?? viteMod.default?.build) as typeof import('vite').build;
    stageStart = stageMark('import-vite', stageStart);
    const buildDir = cacheKey ? `${outDir}.tmp-${crypto.randomUUID()}` : outDir;
    if (cacheKey) mkdirSync(cacheRoot, { recursive: true });
    try {
      await build({
        configFile: viteConfigPath,
        root: facetRoot,
        logLevel: verbosity >= 1 ? 'info' : 'warn',
        build: { ssr: true, outDir: buildDir, emptyOutDir: true },
      });
      if (cacheKey) {
        try {
          renameSync(buildDir, outDir);
        } catch (error) {
          // Another process may have completed the same content-addressed build.
          try { rmSync(buildDir, { recursive: true, force: true }); } catch { /* best effort */ }
          if (!existsSync(outDir)) throw error;
        }
      }
    } catch (error) {
      if (cacheKey) {
        try { rmSync(buildDir, { recursive: true, force: true }); } catch { /* preserve build error */ }
      }
      throw error;
    }
    stageStart = stageMark('vite-build', stageStart);
  } else {
    const now = new Date();
    try { utimesSync(outDir, now, now); } catch { /* best effort */ }
  }

  // Uncached bundles are temporary. Content-addressed bundles remain reusable.
  const keepOnSuccess = cacheKey != null || process.env.FACET_KEEP_BUNDLE === '1';
  try {
    const files = readdirSync(outDir);
    const cjsFile = files.find(f => f.endsWith('.cjs'));
    if (!cjsFile) {
      throw new Error('No .cjs bundle found in build output');
    }

    // Load the bundle with a .facet-rooted require so its externalized
    // react/react-dom (and react/jsx-dev-runtime) resolve from .facet, not the CLI.
    const module = facetRequire(join(outDir, cjsFile));
    const Component = module.default || module;
    if (typeof Component !== 'function') {
      throw new Error('Template must export a React component function');
    }

    stageStart = stageMark('require-bundle', stageStart);
    const html = renderToString(Component({ data }));
    const css = extractCSS(outDir);
    stageMark('react-render', stageStart);

    if (!keepOnSuccess) {
      try { rmSync(outDir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
    if (profileEnabled) {
      console.error(`[FACET_PROFILE] ${JSON.stringify({
        operation: 'ssr-loader',
        pid: process.pid,
        cacheKey: cacheKey ?? null,
        bundleCache: cachedBundle ? 'hit' : 'miss',
        totalDurationMs: Number((performance.now() - startedAt).toFixed(1)),
        stages,
      })}`);
    }
    return { html, css };
  } catch (err) {
    console.error(`[facet] SSR build preserved at ${outDir} for debugging.`);
    throw err;
  }
}

/**
 * Format a Vite/Rollup/MDX build error so the user sees the failing file,
 * line:col, source frame, and plugin name — not just the bare message.
 */
function formatBuildError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const e = error as Error & {
    id?: string;
    loc?: { file?: string; line?: number; column?: number };
    frame?: string;
    plugin?: string;
    code?: string;
  };
  const parts: string[] = [];
  if (e.plugin) parts.push(`Plugin: ${e.plugin}`);
  if (e.code) parts.push(`Code:   ${e.code}`);
  const file = e.loc?.file ?? e.id;
  if (file) {
    const at = e.loc?.line != null
      ? `${file}:${e.loc.line}${e.loc.column != null ? `:${e.loc.column}` : ''}`
      : file;
    parts.push(`File:   ${at}`);
  }
  parts.push(`Error:  ${e.message}`);
  if (e.frame) parts.push(`\n${e.frame}`);
  return parts.join('\n');
}

interface DaemonRequest {
  id: number;
  kind?: 'render' | 'css';
  data?: Record<string, unknown>;
  cacheKey?: string;
  content?: string;
  verbosity?: number;
}

/** Persistent newline-delimited JSON loader used by server workspaces. */
export async function runSsrDaemon(): Promise<void> {
  const base = parseArgs();
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    let request: DaemonRequest | undefined;
    try {
      request = JSON.parse(line) as DaemonRequest;
      if (request.kind === 'css') {
        // The generated postcss.config.js reads FACET_POST_PROCESS at first
        // import and is module-cached, so in-daemon CSS builds see the render
        // config. Safe: with Tailwind v3 the config choice only changes inert
        // content globs (facet.css ships pre-expanded), and v4 ignores the env.
        const { buildPostProcessCss } = await import('./css.js');
        const css = await buildPostProcessCss(base.facetRoot, { content: request.content });
        process.stdout.write(`${JSON.stringify({ id: request.id, result: { html: '', css } })}\n`);
        continue;
      }
      const result = await load({
        ...base,
        data: request.data ?? {},
        cacheKey: request.cacheKey,
        verbosity: request.verbosity ?? 0,
      });
      process.stdout.write(`${JSON.stringify({ id: request.id, result })}\n`);
    } catch (error) {
      const message = formatBuildError(error);
      process.stdout.write(`${JSON.stringify({ id: request?.id ?? -1, error: message })}\n`);
    }
  }
}

export async function runSsrLoader(): Promise<void> {
  try {
    const args = parseArgs();
    const result = await load(args);
    const json = JSON.stringify(result);
    if (args.outputFile) {
      writeFileSync(args.outputFile, json);
    } else {
      process.stdout.write(json);
    }
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Vite SSR Error:');
    console.error(formatBuildError(error));
    if (process.env.FACET_DEBUG_STACK === '1' && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}
