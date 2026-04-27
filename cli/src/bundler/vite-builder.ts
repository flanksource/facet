/**
 * Vite Builder for Dynamic Template Compilation
 *
 * Shells out to vite-ssr-loader.ts script (runs with Bun).
 * Vite is NOT embedded in CLI bundle - it runs from .facet/node_modules.
 * Errors will point to original .tsx files with full source maps.
 */

import { $ } from 'bun';
import { join } from 'path';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { Logger } from '../utils/logger.js';
import { FacetDirectory } from '../builders/facet-directory.js';
import { resolvePackageManager } from '../utils/package-manager.js';

export interface BuildResult {
  html: string;
  css: string;
  cleanup: () => Promise<void>;
}

export interface BuildOptions {
  templatePath: string;
  data: Record<string, unknown>;
  consumerRoot?: string;
  logger: Logger;
  sandbox?: string | boolean;
}

interface LoaderResult {
  html: string;
  css: string;
}

/**
 * Build template using Vite SSR mode (via external script)
 * Errors will point to original source files with full stack traces
 */
function srtPrefix(sandbox?: string | boolean): string {
  if (!sandbox) return '';
  const settings = typeof sandbox === 'string' ? sandbox : '/etc/facet/srt-settings.json';
  return `srt --settings ${settings} `;
}

async function pnpmInstall(facetRoot: string, logger: Logger): Promise<void> {
  // --ignore-workspace: when the consumer is a pnpm workspace whose globs
  //   absorb .facet/, pnpm runs across "all N workspace projects" and ignores
  //   .facet/.npmrc. Treating .facet/ as standalone restores our config.
  // --config.confirmModulesPurge=false + CI=true: pnpm aborts with
  //   ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY when it wants to purge a
  //   foreign node_modules under a non-TTY shell (Bun's $). Both signals
  //   override .npmrc so this works even when workspace config wins.
  const result = await $`cd ${facetRoot} && CI=true pnpm install --ignore-workspace --ignore-scripts --config.confirmModulesPurge=false 2>&1`.quiet();
  logger.debug(result.stdout.toString());
}

function errorOutput(err: any): string {
  return err?.stdout?.toString?.() || err?.stderr?.toString?.() || err?.message || String(err);
}

async function installWithRetry(facetDir: FacetDirectory, logger: Logger): Promise<void> {
  const facetRoot = facetDir.getFacetRoot();
  if (!facetDir.needsInstall()) {
    logger.debug('Dependencies up to date, skipping pnpm install');
    return;
  }
  // Pre-nuke when the install is detectably broken (legacy symlinked
  // node_modules, foreign lockfile). Saves a guaranteed-to-fail first attempt
  // and prevents pnpm's ENOENT-on-mkdir when it tries to materialize into a
  // dangling symlink.
  if (facetDir.isInstallBroken()) {
    logger.info('Detected stale .facet/ install state, cleaning before install');
    facetDir.nukeInstall();
  }
  const pm = await resolvePackageManager(facetRoot);
  logger.info(`pnpm install (pnpm ${pm.version})...`);
  const t0 = Date.now();
  try {
    await pnpmInstall(facetRoot, logger);
  } catch (firstErr: any) {
    logger.warn(`pnpm install failed; nuking .facet/ and retrying once. Reason:\n${errorOutput(firstErr)}`);
    facetDir.nukeInstall();
    try {
      await pnpmInstall(facetRoot, logger);
    } catch (secondErr: any) {
      throw new Error(`pnpm install failed twice in ${facetRoot}:\n${errorOutput(secondErr)}`);
    }
  }
  logger.info(`pnpm install completed in ${Date.now() - t0}ms`);
}

// Patterns that indicate the loader failed because a *package* (not a relative
// path) couldn't be resolved — i.e. node_modules looks broken. Relative-path
// resolve failures (`./foo.css`) are template bugs and would not be fixed by
// reinstalling, so isMissingDepError() filters those out.
const RUNTIME_REINSTALL_PATTERNS = [
  /Cannot find module ['"][^.\/][^'"]*['"]/i,
  /ERR_MODULE_NOT_FOUND/,
  /Failed to resolve import ['"][^.\/][^'"]*['"]/i,
  /Failed to resolve entry/i,
  /Could not resolve ['"][^.\/][^'"]*['"] from/i,
  /Rollup failed to resolve(?: import)? ['"][^.\/][^'"]*['"]/i,
];

export function isMissingDepError(stderr: string): boolean {
  return RUNTIME_REINSTALL_PATTERNS.some(rx => rx.test(stderr));
}

interface LoaderArgs {
  loaderPath: string;
  facetRoot: string;
  dataFilePath: string;
  resultFilePath: string;
  sandbox?: string | boolean;
}

async function runLoaderOnce(args: LoaderArgs): Promise<{ stderr?: Buffer | string; }> {
  const prefix = srtPrefix(args.sandbox);
  return await $`${{ raw: prefix }}bun run ${args.loaderPath} --facet-root=${args.facetRoot} --data-file=${args.dataFilePath} --output-file=${args.resultFilePath}`.quiet();
}

async function runLoaderWithRetry(
  facetDir: FacetDirectory,
  args: LoaderArgs,
  logger: Logger,
): Promise<LoaderResult> {
  try {
    const r = await runLoaderOnce(args);
    if (r.stderr != null && r.stderr.length > 0) console.error(r.stderr.toString());
    return JSON.parse(readFileSync(args.resultFilePath, 'utf-8'));
  } catch (firstErr: any) {
    const stderr = firstErr?.stderr?.toString?.() || '';
    if (!isMissingDepError(stderr)) {
      const raw = stderr || (firstErr instanceof Error ? firstErr.message : String(firstErr));
      throw new Error(`Vite SSR build failed:\n${deduplicateOutput(raw)}`);
    }
    logger.warn('Loader failed with missing-dep signature; rebuilding .facet/ once.');
    facetDir.nukeInstall();
    await installWithRetry(facetDir, logger);
    try {
      const r = await runLoaderOnce(args);
      if (r.stderr != null && r.stderr.length > 0) console.error(r.stderr.toString());
      return JSON.parse(readFileSync(args.resultFilePath, 'utf-8'));
    } catch (secondErr: any) {
      const out = secondErr?.stderr?.toString?.() || String(secondErr);
      throw new Error(`Vite SSR build failed after .facet/ rebuild:\n${deduplicateOutput(out)}`);
    }
  }
}

export async function buildTemplate(options: BuildOptions): Promise<BuildResult> {
  const { templatePath, data, consumerRoot = process.cwd(), logger } = options;

  logger.debug(`Building template: ${templatePath}`);

  // Setup .facet/ directory
  const facetDir = new FacetDirectory({
    consumerRoot,
    templateFile: templatePath,
    logger,
  });

  facetDir.create();
  facetDir.generatePackageJson();

  const facetRoot = facetDir.getFacetRoot();

  facetDir.symlinkConsumerFiles();
  facetDir.copyStylesCss();
  facetDir.copyViteSsrLoader(); // Copy the loader script
  facetDir.generateEntryWrapper();
  facetDir.generateTsConfig();
  facetDir.generateViteConfig();
  facetDir.generatePostCSSConfig();
  facetDir.generateTailwindConfig();

  // Install dependencies with pnpm. pnpm's content-addressable store gives
  // us fast reuse across renders — no facet-side cache needed.
  await installWithRetry(facetDir, logger);

  // Shell out to vite-ssr-loader.ts script
  logger.info('Loading template with Vite SSR...');
  const loaderPath = join(facetRoot, 'vite-ssr-loader.ts');
  const tmpDir = mkdtempSync(join(tmpdir(), 'facet-'));
  const dataFilePath = join(tmpDir, 'data.json');
  const resultFilePath = join(tmpDir, 'result.json');
  writeFileSync(dataFilePath, JSON.stringify(data));
  try {
    const loaderResult = await runLoaderWithRetry(
      facetDir,
      { loaderPath, facetRoot, dataFilePath, resultFilePath, sandbox: options.sandbox },
      logger,
    );
    logger.debug(`Rendered HTML: ${loaderResult.html.length} bytes, CSS: ${loaderResult.css.length} bytes`);
    return {
      html: loaderResult.html,
      css: loaderResult.css,
      cleanup: async () => {
        logger.debug('Cleanup complete');
      },
    };
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function deduplicateOutput(text: string): string {
  // Bun shell errors sometimes contain stderr twice back-to-back.
  // Check if the output is two identical halves and return just one.
  const trimmed = text.trim();
  const len = trimmed.length;
  if (len < 40) return trimmed;
  const mid = Math.ceil(len / 2);
  // Try splitting at a newline near the midpoint
  for (let i = mid - 5; i <= mid + 5 && i < len; i++) {
    if (trimmed[i] === '\n') {
      const first = trimmed.substring(0, i).trim();
      const second = trimmed.substring(i + 1).trim();
      if (first === second) return first;
    }
  }
  return trimmed;
}
