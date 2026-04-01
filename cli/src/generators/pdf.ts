import { readFile, writeFile as fsWriteFile, unlink } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import type { GenerateOptions } from '../types.js';
import { Logger } from '../utils/logger.js';
import { generateHTML } from './html.js';
import { generatePDFFromHTML } from '../utils/pdf-generator.js';
import { applyPDFSecurity } from '../utils/pdf-security.js';
import { buildTemplate } from '../bundler/vite-builder.js';

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

async function buildAndExtractFragment(
  filePath: string,
  data: Record<string, unknown>,
  logger: Logger,
): Promise<string> {
  const consumerRoot = dirname(resolve(filePath));
  const templatePath = resolve(filePath);
  const relPath = templatePath.replace(consumerRoot + '/', '');
  const result = await buildTemplate({ templatePath: relPath, data, consumerRoot, logger });
  try {
    return extractBodyContent(result.html);
  } finally {
    await result.cleanup();
  }
}

export async function generatePDF(options: GenerateOptions): Promise<void> {
  const logger = new Logger(options.verbose);

  logger.debug('Starting PDF generation');

  logger.info('Generating HTML...');
  const outputName = await generateHTML(options);

  const outputDir = resolve(process.cwd(), options.outputDir);
  const htmlPath = join(outputDir, `${outputName}.html`);
  let finalHTML = await readFile(htmlPath, 'utf-8');

  const data = options.data ? JSON.parse(await readFile(resolve(options.data), 'utf-8')) : {};

  if (options.header) {
    logger.info('Building header template...');
    const fragment = await buildAndExtractFragment(options.header, data, logger);
    finalHTML = insertBeforeBodyClose(finalHTML, fragment);
  }

  if (options.footer) {
    logger.info('Building footer template...');
    const fragment = await buildAndExtractFragment(options.footer, data, logger);
    finalHTML = insertBeforeBodyClose(finalHTML, fragment);
  }

  logger.info('Converting HTML to PDF...');
  const pdfPath = join(outputDir, `${outputName}.pdf`);

  await generatePDFFromHTML({
    html: finalHTML,
    outputPath: pdfPath,
    logger,
    debug: options.debug,
    debugTypography: options.debugTypography,
    fontSize: options.fontSize,
    defaultPageSize: options.pageSize,
    landscape: options.landscape,
    margins: options.margins,
  });

  if (options.encryption || options.signature) {
    logger.info('Applying PDF security...');
    const pdfBuffer = await readFile(pdfPath);
    const secured = await applyPDFSecurity(pdfBuffer, {
      encryption: options.encryption,
      signature: options.signature,
    });
    await fsWriteFile(pdfPath, secured);
  }

  if (!options.debug) {
    await unlink(htmlPath).catch(() => {});
    logger.debug(`Cleaned up intermediate HTML: ${htmlPath}`);
  } else {
    logger.info(`Debug: keeping intermediate HTML: ${htmlPath}`);
  }

  logger.success(`PDF generated: ${pdfPath}`);
}
