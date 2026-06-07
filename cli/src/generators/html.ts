import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { resolve, join, basename, extname, relative, dirname } from 'path';
import { existsSync, rmSync } from 'fs';
import type { GenerateOptions } from '../types.js';
import { Logger } from '../utils/logger.js';
import { DataLoader } from '../utils/data-loader.js';
import { DataValidator } from '../utils/validator.js';
import { buildTemplate } from '../bundler/vite-builder.js';
import { startViteServer } from '../bundler/vite-server.js';
import { snapshotHTML } from '../bundler/live-snapshot.js';
import { combineHTMLAndCSS } from '../bundler/renderer.js';
import { parseRemoteRef, resolveRemoteRef } from '../utils/remote-resolver.js';
import { runTailwind } from '../utils/tailwind.js';

function findProjectRoot(templatePath: string): string | undefined {
  const absTemplate = resolve(templatePath);
  const gitRoot = findGitRoot(dirname(absTemplate));
  const stopAt = gitRoot ?? process.cwd();
  let dir = dirname(absTemplate);
  while (dir.length >= stopAt.length) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

function findGitRoot(from: string): string | undefined {
  let dir = from;
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

export async function generateHTML(options: GenerateOptions): Promise<string> {
  const logger = new Logger(options.verbose);

  logger.debug('Starting HTML generation');

  // Resolve remote template if needed
  let templatePath = options.template;
  let consumerRoot: string | undefined;
  const remoteRef = parseRemoteRef(options.template);
  if (remoteRef) {
    const resolved = await resolveRemoteRef(remoteRef, { refresh: options.refresh, verbose: options.verbose });
    consumerRoot = resolved.consumerRoot;
    templatePath = resolved.templateFile;
    if (resolved.resolvedSha) {
      logger.info(`Resolved to ${resolved.resolvedSha}`);
    }
  } else {
    const projectRoot = findProjectRoot(templatePath);
    if (projectRoot) {
      consumerRoot = projectRoot;
      templatePath = relative(projectRoot, resolve(templatePath));
      logger.debug(`Using project root: ${projectRoot}`);
    }
  }

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
  if (options.live) {
    logger.info('Live rendering template in browser...');
    const server = await startViteServer({ templatePath, data, consumerRoot, logger });
    try {
      const html = await snapshotHTML(server.url, logger);
      const outputDir = resolve(process.cwd(), options.outputDir);
      await mkdir(outputDir, { recursive: true });
      const outputPath = join(outputDir, `${outputName}.html`);
      await writeFile(outputPath, html, 'utf-8');
      logger.success(`HTML generated: ${outputPath}`);
      logger.info(`File size: ${(Buffer.byteLength(html, 'utf-8') / 1024).toFixed(2)} KB`);
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
  });

  logger.debug(`Using output filename: ${outputName}`);

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
    const facetRoot = join(consumerRoot ?? process.cwd(), '.facet');
    const stylesInput = join(facetRoot, 'src/styles.css');

    try {
      await runTailwind({
        facetRoot,
        stylesInput,
        contentPath: tempHtmlPath,
        outputCssPath,
        verbose: options.verbose,
      });
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

    // Cleanup intermediate files
    await unlink(tempHtmlPath).catch(() => {});
    await unlink(outputCssPath).catch(() => {});

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
