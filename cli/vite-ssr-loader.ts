#!/usr/bin/env bun

/**
 * Vite SSR Loader
 *
 * Standalone script that loads React components with Vite SSR mode.
 * Runs outside the CLI bundle to avoid embedding Vite.
 *
 * Usage:
 *   bun run vite-ssr-loader.ts --facet-root=/path/to/.facet --data='{"key":"value"}' [--verbose]
 */

import { build } from 'vite';
import { renderToString } from 'react-dom/server';
import { join } from 'path';
import { readFileSync, readdirSync, rmSync } from 'fs';

import { Console } from 'console';


interface LoaderArgs {
  facetRoot: string;
  data: Record<string, unknown>;
  verbose: boolean;
}

interface LoaderResult {
  html: string;
  css: string;
  error?: string;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): LoaderArgs {
  const args = process.argv.slice(2);
  let facetRoot = '';
  let data: Record<string, unknown> = {};
  let verbose = false;

  for (const arg of args) {
    if (arg.startsWith('--facet-root=')) {
      facetRoot = arg.substring('--facet-root='.length);
    } else if (arg.startsWith('--data=')) {
      const dataStr = arg.substring('--data='.length);
      try {
        data = JSON.parse(dataStr);
      } catch (error) {
        console.error('Failed to parse --data JSON:', error);
        process.exit(1);
      }
    } else if (arg === '--verbose') {
      verbose = true;
    }
  }

  if (!facetRoot) {
    console.error('Missing required argument: --facet-root');
    process.exit(1);
  }

  return { facetRoot, data, verbose };
}

/**
 * Extract CSS from Vite build output
 */
function extractCSS(distDir: string): string {
  try {
    const files = readdirSync(distDir);
    const cssFile = files.find(f => f.endsWith('.css'));

    if (cssFile) {
      const cssPath = join(distDir, cssFile);
      return readFileSync(cssPath, 'utf-8');
    }

    return '';
  } catch (error) {
    console.error('Warning: Failed to extract CSS from build output:', error);
    return '';
  }
}

/**
 * Main loader function
 */
async function load(args: LoaderArgs): Promise<LoaderResult> {
  const { facetRoot, data, verbose } = args;

  // Add facet's node_modules to NODE_PATH for proper module resolution
  const facetNodeModules = join(facetRoot, 'node_modules');
  const originalNodePath = process.env.NODE_PATH || '';
  process.env.NODE_PATH = originalNodePath ? `${facetNodeModules}:${originalNodePath}` : facetNodeModules;

  // Reload module resolution with new NODE_PATH
  require('module').Module._initPaths();

  const viteConfigPath = join(facetRoot, 'vite.config.ts');
  const distDir = join(facetRoot, 'dist');


  console = new Console(process.stderr, process.stderr);

  // Build the SSR bundle with Vite
  await build({
    configFile: viteConfigPath,
    root: facetRoot,
    logLevel: verbose ? 'info' : 'error',
    build: {
      ssr: true,
      outDir: distDir,
      emptyOutDir: true,
    },
  });

  try {
    // Find the built SSR bundle (could be bundle.cjs or entry.cjs)
    const files = readdirSync(distDir);
    const cjsFile = files.find(f => f.endsWith('.cjs'));

    if (!cjsFile) {
      throw new Error('No .cjs bundle found in build output');
    }

    const bundlePath = join(distDir, cjsFile);
    const module = require(bundlePath);

    // Handle both ESM default export and CommonJS module.exports
    const Component = module.default || module;

    if (typeof Component !== 'function') {
      throw new Error('Template must export a React component function');
    }

    // Render component to HTML string
    const html = renderToString(Component({ data }));

    // Extract CSS from build output
    const css = extractCSS(distDir);

    return { html, css };
  } finally {
    // Clean up build output
    try {
      rmSync(distDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Entry point
 */
async function main() {
  try {
    const args = parseArgs();
    const result = await load(args);

    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    // Print error directly to stderr for readability
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('\n❌ Vite SSR Error:');
    console.error(errorMessage);

    if (errorStack) {
      console.error('\nStack trace:');
      console.error(errorStack);
    }

    process.exit(1);
  }
}

main();
