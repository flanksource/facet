import { mkdir, writeFile, readFile } from 'fs/promises';
import { resolve, join } from 'path';
import { $ } from 'bun';
import type { GenerateOptions } from '../types.js';
import { Logger } from '../utils/logger.js';
import { DataLoader } from '../utils/data-loader.js';
import { DataValidator } from '../utils/validator.js';
import { buildTemplate } from '../bundler/vite-builder.js';
import { combineHTMLAndCSS } from '../bundler/renderer.js';
import { extractTitleFromHTML } from '../utils/extract-title.js';

export async function generateHTML(options: GenerateOptions): Promise<string> {
  const logger = new Logger(options.verbose);

  logger.debug('Starting HTML generation');

  // Load data
  const dataLoader = new DataLoader(logger);
  const { data } = await dataLoader.load(options);

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

  // Extract title from rendered HTML to use as output filename
  const outputName = extractTitleFromHTML(buildResult.html);
  logger.debug(`Using filename from HTML title: ${outputName}`);

  try {
    // Ensure output directory exists
    const outputDir = resolve(process.cwd(), options.outputDir);
    await mkdir(outputDir, { recursive: true });

    // Step 1: Write HTML without CSS to temporary file
    const tempHtmlPath = join(outputDir, `${outputName}.temp.html`);
    const htmlWithoutCSS = buildResult.html;
    await writeFile(tempHtmlPath, htmlWithoutCSS, 'utf-8');
    logger.debug(`Saved temporary HTML (no CSS): ${tempHtmlPath}`);

    // Step 2: Run Tailwind CLI to generate CSS from the HTML
    logger.info('Generating CSS with Tailwind CLI...');
    const outputCssPath = join(outputDir, `${outputName}.css`);
    const facetRoot = join(process.cwd(), '.facet');
    const stylesInput = join(facetRoot, 'src/styles.css');

    try {
      // Run tailwindcss CLI: -i input.css --content "output.html" -o output.css
      const tailwindCmd = $`cd ${facetRoot} && npx tailwindcss -i ${stylesInput} --content ${tempHtmlPath} -o ${outputCssPath}`;
      if (options.verbose) {
        await tailwindCmd;
      } else {
        await tailwindCmd.quiet(true);
      }
      logger.debug('Tailwind CSS generated successfully');
    } catch (error) {
      logger.warn(`Tailwind CSS generation failed: ${error instanceof Error ? error.message : String(error)}`);
      // Fallback to Vite CSS if Tailwind fails
      await writeFile(outputCssPath, buildResult.css, 'utf-8');
      logger.debug('Using Vite-generated CSS as fallback');
    }

    // Step 3: Read generated CSS and combine with HTML
    const generatedCSS = await readFile(outputCssPath, 'utf-8');
    const finalHTML = combineHTMLAndCSS(htmlWithoutCSS, generatedCSS);

    // Step 4: Write final HTML file
    const outputPath = join(outputDir, `${outputName}.html`);
    await writeFile(outputPath, finalHTML, 'utf-8');

    logger.success(`HTML generated: ${outputPath}`);

    // Get file size
    const sizeKB = (Buffer.byteLength(finalHTML, 'utf-8') / 1024).toFixed(2);
    logger.info(`File size: ${sizeKB} KB`);

    return outputName;
  } finally {
    // Cleanup Vite server
    await buildResult.cleanup();
  }
}
