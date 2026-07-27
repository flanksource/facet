import { mkdir, writeFile } from 'fs/promises';
import { resolve, join, basename, extname, dirname } from 'path';
import { existsSync, rmSync } from 'fs';
import type { GenerateOptions } from '../types.js';
import { Logger } from '../utils/logger.js';
import { DataLoader } from '../utils/data-loader.js';
import { DataValidator } from '../utils/validator.js';
import { buildTemplate } from '../bundler/vite-builder.js';
import { startViteServer } from '../bundler/vite-server.js';
import { snapshotHTML } from '../bundler/live-snapshot.js';
import { combineHTMLAndCSS } from '../bundler/renderer.js';
import { scopeHTML } from '../utils/css-scoper.js';
import { resolveTemplateSource } from '../utils/template-source.js';
import { runTailwindCached } from '../utils/tailwind.js';
import { shouldPostProcessTemplateCSS, shouldUseLiveRendering } from '../utils/live-template.js';
import { RenderTimings } from '../utils/performance.js';
import { renderBrowserHTML } from '../utils/browser-html.js';

export async function generateHTML(options: GenerateOptions): Promise<string> {
  const logger = new Logger(options.verbose);
  const timings = options.timings ?? new RenderTimings();
  const ownsTimings = options.timings == null;

  logger.debug('Starting HTML generation');

  const source = await resolveTemplateSource(options.template, {
    refresh: options.refresh,
    verbose: Boolean(options.verbose),
  });
  const { consumerRoot, templatePath } = source;
  if (source.resolvedSha) logger.info(`Resolved to ${source.resolvedSha}`);
  if (consumerRoot) logger.debug(`Using project root: ${consumerRoot}`);

  if (options.clearCache) {
    const root = consumerRoot || resolve(dirname(options.template));
    const facetDir = join(root, '.facet');
    if (existsSync(facetDir)) {
      rmSync(facetDir, { recursive: true, force: true });
      logger.info(`Cleared .facet/ cache: ${facetDir}`);
    }
  }

  // Load data
  const dataLoader = new DataLoader(logger);
  const { data } = await dataLoader.load(options);

  // Validate data if schema provided
  if (options.validate && options.schema) {
    const validator = new DataValidator(logger);
    await validator.validate(data, options.schema);
  }

  const outputName = options.outputName ?? basename(options.template, extname(options.template));

  // Live render path: boot a Vite dev server, render in a real browser, snapshot
  // the settled DOM. Required for DOM-measuring components (diagrams).
  if (shouldUseLiveRendering(options.live, resolve(consumerRoot ?? process.cwd(), templatePath))) {
    logger.info('Live rendering template in browser...');
    const server = await startViteServer({
      templatePath,
      data,
      consumerRoot,
      logger,
      timings,
      skipModules: options.skipModules,
    });
    try {
      const snapshot = await snapshotHTML(server.url, logger);
      const html = options.cssScope ? scopeHTML(snapshot, { scopeClass: options.cssScope }) : snapshot;
      if (options.cssScope) logger.info(`CSS scoped with class: ${options.cssScope}`);
      const outputDir = resolve(process.cwd(), options.outputDir);
      await mkdir(outputDir, { recursive: true });
      const outputPath = join(outputDir, `${outputName}.html`);
      await writeFile(outputPath, html, 'utf-8');
      logger.success(`HTML generated: ${outputPath}`);
      logger.info(`File size: ${(Buffer.byteLength(html, 'utf-8') / 1024).toFixed(2)} KB`);
      if (ownsTimings) timings.log(logger);
      return outputName;
    } finally {
      await server.close();
    }
  }

  // Build template with Vite (includes rendering)
  logger.info('Compiling and rendering template...');
  const buildResult = await buildTemplate({
    templatePath,
    data,
    consumerRoot,
    logger,
    sandbox: options.sandbox,
    timings,
    skipModules: options.skipModules,
  });

  logger.debug(`Using output filename: ${outputName}`);

  try {
    // Ensure output directory exists
    const outputDir = resolve(process.cwd(), options.outputDir);
    await mkdir(outputDir, { recursive: true });

    const htmlWithoutCSS = buildResult.html;
    logger.info('Post-processing CSS with Vite...');

    const postProcessCss = shouldPostProcessTemplateCSS(
      options.postProcessCss,
      resolve(consumerRoot ?? process.cwd(), templatePath),
    );
    const generatedCSS = await timings.measure('tailwind', () => runTailwindCached({
      facetRoot: buildResult.facetRoot,
      html: postProcessCss ? htmlWithoutCSS : '',
      buildCacheKey: buildResult.buildCacheKey,
      logger,
      ssrCss: buildResult.css,
    }));
    logger.debug(postProcessCss
      ? 'CSS generated from source and rendered class names'
      : 'CSS generated from source; rendered-HTML post-processing disabled');

    // Combine generated CSS with the static HTML.

    const combinedHTML = await renderBrowserHTML({
      html: combineHTMLAndCSS(htmlWithoutCSS, generatedCSS),
    });
    const finalHTML = options.cssScope
      ? scopeHTML(combinedHTML, { scopeClass: options.cssScope })
      : combinedHTML;
    if (options.cssScope) logger.info(`CSS scoped with class: ${options.cssScope}`);

    // Step 4: Write final HTML file
    const outputPath = join(outputDir, `${outputName}.html`);
    await writeFile(outputPath, finalHTML, 'utf-8');

    logger.success(`HTML generated: ${outputPath}`);

    // Get file size
    const sizeKB = (Buffer.byteLength(finalHTML, 'utf-8') / 1024).toFixed(2);
    logger.info(`File size: ${sizeKB} KB`);

    if (ownsTimings) timings.log(logger);

    return outputName;
  } finally {
    // Cleanup Vite server
    await buildResult.cleanup();
  }
}
