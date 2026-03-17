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
import { depHash, linkCachedNodeModules, promoteToCacheAfterInstall } from '../server/facet-cache.js';

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

  // Try to reuse cached node_modules based on dependency hash
  let pkgDeps: Record<string, string> | undefined;
  try {
    const pkg = JSON.parse(readFileSync(join(facetRoot, 'package.json'), 'utf-8'));
    pkgDeps = pkg.dependencies;
  } catch {}
  const hash = depHash(pkgDeps);

  if (!linkCachedNodeModules(facetRoot, hash, logger) && facetDir.needsInstall()) {
    logger.info('npm install...');
    const npmStart = Date.now();
    try {
      const npmResult = await $`cd ${facetRoot} && npm install --ignore-scripts 2>&1`.quiet();
      logger.debug(npmResult.stdout.toString());
    } catch (error: any) {
      const output = error?.stdout?.toString?.() || error?.stderr?.toString?.() || error?.message || String(error);
      throw new Error(`npm install failed in ${facetRoot}:\n${output}`);
    }
    logger.info(`npm install completed in ${Date.now() - npmStart}ms`);
    promoteToCacheAfterInstall(facetRoot, hash, logger);
  } else {
    logger.debug('Dependencies up to date, skipping npm install');
  }

  // Shell out to vite-ssr-loader.ts script
  logger.info('Loading template with Vite SSR...');
  const loaderPath = join(facetRoot, 'vite-ssr-loader.ts');
  const tmpDir = mkdtempSync(join(tmpdir(), 'facet-'));
  const dataFilePath = join(tmpDir, 'data.json');
  const resultFilePath = join(tmpDir, 'result.json');
  writeFileSync(dataFilePath, JSON.stringify(data));
  let result;
  try {
    const prefix = srtPrefix(options.sandbox);
    result = await $`${{ raw: prefix }}bun run ${loaderPath} --facet-root=${facetRoot} --data-file=${dataFilePath} --output-file=${resultFilePath}`.quiet();

    if (result.stderr != null && result.stderr.length > 0) {
      console.error(result.stderr.toString());
    }

    const loaderResult: LoaderResult = JSON.parse(readFileSync(resultFilePath, 'utf-8'));

    logger.debug(`Rendered HTML: ${loaderResult.html.length} bytes, CSS: ${loaderResult.css.length} bytes`);

    return {
      html: loaderResult.html,
      css: loaderResult.css,
      cleanup: async () => {
        // No cleanup needed - script has already exited
        logger.debug('Cleanup complete');
      },
    };
  } catch (error: any) {
    const stderr = result?.stderr?.toString() || error?.stderr?.toString() || '';
    const stdout = result?.stdout?.toString() || error?.stdout?.toString() || '';
    const exitCode = result?.exitCode ?? error?.exitCode;
    if (stderr) logger.error(stderr);
    if (stdout) logger.debug(`stdout: ${stdout.length} bytes`);
    if (exitCode != null) logger.debug(`exit: ${exitCode}`);
    const raw = stderr || (error instanceof Error ? error.message : String(error));
    throw new Error(`Vite SSR build failed:\n${deduplicateOutput(raw)}`);
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
