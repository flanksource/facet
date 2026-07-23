import { readFile, writeFile as fsWriteFile, unlink } from 'fs/promises';
import { resolve, join, dirname, basename, extname } from 'path';
import { existsSync } from 'fs';
import type { GenerateOptions } from '../types.js';
import { Logger } from '../utils/logger.js';
import { generateHTML } from './html.js';
import { generatePDFFromHTML } from '../utils/pdf-generator.js';
import { applyPDFSecurity } from '../utils/pdf-security.js';
import { buildTemplate } from '../bundler/vite-builder.js';
import { RenderProfiler, RenderTimings } from '../utils/performance.js';

function extractBodyContent(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1].trim() : html.replace(/<!DOCTYPE[^>]*>/i, '').trim();
}

function insertBeforeBodyClose(mainHtml: string, fragment: string): string {
  if (mainHtml.includes('</body>')) {
    return mainHtml.replace('</body>', `${fragment}</body>`);
  }
  return mainHtml + fragment;
}

async function buildAndExtractFragment(options: {
  filePath: string;
  data: Record<string, unknown>;
  logger: Logger;
  timings: RenderTimings;
  skipModules?: boolean;
}): Promise<string> {
  const { filePath, data, logger, timings } = options;
  const consumerRoot = dirname(resolve(filePath));
  const templatePath = resolve(filePath);
  const relPath = templatePath.replace(consumerRoot + '/', '');
  const result = await buildTemplate({
    templatePath: relPath,
    data,
    consumerRoot,
    logger,
    timings,
    timingPhase: 'header-generation',
    skipModules: options.skipModules,
  });
  try {
    return extractBodyContent(result.html);
  } finally {
    await result.cleanup();
  }
}

export async function generatePDF(options: GenerateOptions): Promise<void> {
  const logger = new Logger(options.verbose);
  const profiler = new RenderProfiler('pdf', logger);
  const timings = options.timings ?? new RenderTimings();

  logger.debug('Starting PDF generation');

  logger.info('Generating HTML...');
  const outputDir = resolve(process.cwd(), options.outputDir);
  const expectedOutputName = options.outputName ?? basename(options.template, extname(options.template));
  const existingHtmlPath = join(outputDir, `${expectedOutputName}.html`);
  const preserveHtml = existsSync(existingHtmlPath);
  const outputName = await profiler.measure('html', () => generateHTML({ ...options, timings }));

  const htmlPath = join(outputDir, `${outputName}.html`);
  let finalHTML = await readFile(htmlPath, 'utf-8');

  const data = options.data ? JSON.parse(await readFile(resolve(options.data), 'utf-8')) : {};

  if (options.header) {
    logger.info('Building header template...');
    const fragment = await buildAndExtractFragment({
      filePath: options.header,
      data,
      logger,
      timings,
      skipModules: options.skipModules,
    });
    finalHTML = insertBeforeBodyClose(finalHTML, fragment);
  }
  if (options.footer) {
    logger.info('Building footer template...');
    const fragment = await buildAndExtractFragment({
      filePath: options.footer,
      data,
      logger,
      timings,
      skipModules: options.skipModules,
    });
    finalHTML = insertBeforeBodyClose(finalHTML, fragment);
  }

  logger.info('Converting HTML to PDF...');
  const pdfPath = join(outputDir, `${outputName}.pdf`);

  await timings.measure('pdf-generation', () =>
    profiler.measure('chromium-and-pdf', () => generatePDFFromHTML({
      html: finalHTML,
      outputPath: pdfPath,
      logger,
      debug: options.debug,
      debugTypography: options.debugTypography,
      fontSize: options.fontSize,
      defaultPageSize: options.pageSize,
      landscape: options.landscape,
      margins: options.margins,
    })));

  if (options.encryption || options.signature) {
    logger.info('Applying PDF security...');
    const pdfBuffer = await readFile(pdfPath);
    const secured = await applyPDFSecurity(pdfBuffer, {
      encryption: options.encryption,
      signature: options.signature,
      timings,
    });
    await fsWriteFile(pdfPath, secured);
  }

  if (!options.debug && !preserveHtml) {
    await unlink(htmlPath).catch(() => {});
    logger.debug(`Cleaned up intermediate HTML: ${htmlPath}`);
  } else if (options.debug) {
    logger.info(`Debug: keeping intermediate HTML: ${htmlPath}`);
  } else {
    logger.debug(`Preserved existing HTML output: ${htmlPath}`);
  }

  logger.success(`PDF generated: ${pdfPath}`);
  timings.log(logger);
  profiler.finish();
}
