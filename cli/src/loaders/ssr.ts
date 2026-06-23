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
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { Console } from 'node:console';

const require = createRequire(import.meta.url);

interface LoaderArgs {
  facetRoot: string;
  data: Record<string, unknown>;
  outputFile: string;
  verbose: boolean;
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
  let verbose = false;

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
      verbose = true;
    }
  }

  if (!facetRoot) {
    console.error('Missing required argument: --facet-root');
    process.exit(1);
  }

  return { facetRoot, data, outputFile, verbose };
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
  const { facetRoot, data, verbose } = args;

  // Add facet's node_modules to NODE_PATH for proper module resolution.
  const facetNodeModules = join(facetRoot, 'node_modules');
  const originalNodePath = process.env.NODE_PATH || '';
  process.env.NODE_PATH = originalNodePath ? `${facetNodeModules}:${originalNodePath}` : facetNodeModules;
  require('module').Module._initPaths();

  // Resolve Vite + React from .facet/node_modules, not the CLI's own deps. ESM
  // import() ignores NODE_PATH, so resolve explicitly relative to .facet — using
  // the CLI's Vite/React would produce a bundle incompatible with .facet's React.
  const facetRequire = createRequire(join(facetRoot, 'package.json'));
  // Vite/react-dom resolve to CJS builds; under Node the API lands on `.default`
  // (Bun hoists the named exports), so fall back to it.
  const viteMod = await import(pathToFileURL(facetRequire.resolve('vite')).href);
  const build = (viteMod.build ?? viteMod.default?.build) as typeof import('vite').build;
  const rdsMod = await import(pathToFileURL(facetRequire.resolve('react-dom/server')).href);
  const renderToString = rdsMod.renderToString ?? rdsMod.default?.renderToString;

  const viteConfigPath = join(facetRoot, 'vite.config.ts');
  const outDir = join(facetRoot, `dist-${crypto.randomUUID()}`);

  // @ts-expect-error node's Console and Bun's augmented Console differ; at runtime
  // the assignment only needs to provide the log/info/error/warn methods Vite uses.
  console = new Console(process.stderr, process.stderr);

  await build({
    configFile: viteConfigPath,
    root: facetRoot,
    logLevel: verbose ? 'info' : 'error',
    build: { ssr: true, outDir, emptyOutDir: true },
  });

  // On success clean the bundle up; on failure preserve it so the stack trace
  // (which names entry.cjs:<line>) stays resolvable. FACET_KEEP_BUNDLE=1 keeps it.
  const keepOnSuccess = process.env.FACET_KEEP_BUNDLE === '1';
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

    const html = renderToString(Component({ data }));
    const css = extractCSS(outDir);

    if (!keepOnSuccess) {
      try { rmSync(outDir, { recursive: true, force: true }); } catch { /* best effort */ }
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
