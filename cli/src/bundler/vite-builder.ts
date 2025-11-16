/**
 * Vite Builder for Dynamic Template Compilation
 *
 * Shells out to vite-ssr-loader.ts script (runs with Bun).
 * Vite is NOT embedded in CLI bundle - it runs from .facet/node_modules.
 * Errors will point to original .tsx files with full source maps.
 */

import { $ } from 'bun';
import { join } from 'path';
import { Logger } from '../utils/logger.js';
import { FacetDirectory } from '../builders/facet-directory.js';

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
}

interface LoaderResult {
  html: string;
  css: string;
}

/**
 * Build template using Vite SSR mode (via external script)
 * Errors will point to original source files with full stack traces
 */
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

  // Install dependencies after all config is generated
  logger.debug('Installing dependencies...');
  try {
    await $`cd ${facetRoot} && npm install --silent`.quiet(!logger.verbose);
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${error instanceof Error ? error.message : String(error)}`);
  }
  logger.debug('Dependencies installed');

  // Shell out to vite-ssr-loader.ts script
  logger.info('Loading template with Vite SSR...');
  const loaderPath = join(facetRoot, 'vite-ssr-loader.ts');
  const dataJson = JSON.stringify(data);
  let result;
  try {
    // Run the loader script with Bun
    // Errors are printed directly to stderr, so we don't need to parse them
    result = await $`npx bun run ${loaderPath} --facet-root=${facetRoot} --data=${dataJson}`.quiet(!logger.verbose);

    if (result.stderr != null && result.stderr.length > 0) {
      console.error(result.stderr.toString());
    }
    const stdout = result.stdout.toString();
    logger.debug(`Loader output (${stdout.length} chars): ${stdout.substring(0, 200)}...`);

    // Parse result JSON from stdout
    const loaderResult: LoaderResult = JSON.parse(stdout);

    logger.debug(`Rendered HTML: ${loaderResult.html.length} bytes`);
    logger.debug(`Collected CSS: ${loaderResult.css.length} bytes`);

    return {
      html: loaderResult.html,
      css: loaderResult.css,
      cleanup: async () => {
        // No cleanup needed - script has already exited
        logger.debug('Cleanup complete');
      },
    };
  } catch (error) {
    logger.error("result.stderr:", result.stderr?.toString());
    logger.error("result.stdout:", result.stdout?.toString());
    logger.error("exit:", result.exitCode);
    logger.error(error.stderr?.toString() || (error instanceof Error ? error.message : String(error)));
    // Error details are already printed to stderr by vite-ssr-loader
    throw new Error(`Vite SSR loader failed (see error above)`);
  }
}
