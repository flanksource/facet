import { mkdir, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import type { GenerateOptions } from '../types.js';
import { Logger } from '../utils/logger.js';
import { DataLoader } from '../utils/data-loader.js';
import { DataValidator } from '../utils/validator.js';
import { buildTemplate } from '../bundler/vite-builder.js';
import { combineHTMLAndCSS } from '../bundler/renderer.js';
import { scopeHTML } from '../utils/css-scoper.js';

export async function generateWebComponent(options: GenerateOptions): Promise<void> {
  const logger = new Logger(options.verbose);

  logger.debug('Starting WebComponent generation');

  // Load data
  const dataLoader = new DataLoader(logger);
  const { data, outputName } = await dataLoader.load(options);

  // Validate data if schema provided
  if (options.validate && options.schema) {
    const validator = new DataValidator(logger);
    await validator.validate(data, options.schema);
  }

  // Build template with Vite (includes rendering)
  logger.info('Compiling and rendering template...');
  const buildResult = await buildTemplate({
    templatePath: options.template,
    data,
    logger,
  });

  try {
    // Combine HTML and CSS (buildResult already has rendered HTML)
    const combinedHTML = combineHTMLAndCSS(buildResult.html, buildResult.css);

    // Apply CSS scoping
    logger.info('Applying CSS scoping...');
    const scopedHTML = scopeHTML(combinedHTML, {
      scopeClass: options.cssScope,
    });

    // Ensure output directory exists
    const outputDir = resolve(process.cwd(), options.outputDir);
    await mkdir(outputDir, { recursive: true });

    // Write output file with -wc suffix
    const outputPath = join(outputDir, `${outputName}-wc.html`);
    await writeFile(outputPath, scopedHTML, 'utf-8');

    logger.success(`WebComponent generated: ${outputPath}`);

    // Get file size
    const sizeKB = (Buffer.byteLength(scopedHTML, 'utf-8') / 1024).toFixed(2);
    logger.info(`File size: ${sizeKB} KB`);

    if (options.cssScope) {
      logger.info(`CSS scoped with class: ${options.cssScope}`);
    }
  } finally {
    // Cleanup Vite server
    await buildResult.cleanup();
  }
}
