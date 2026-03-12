import { readFile, unlink } from 'fs/promises';
import { resolve, join } from 'path';
import type { GenerateOptions } from '../types.js';
import { Logger } from '../utils/logger.js';
import { generateHTML } from './html.js';
import { generatePDFFromHTML } from '../utils/pdf-generator.js';

export async function generatePDF(options: GenerateOptions): Promise<void> {
  const logger = new Logger(options.verbose);

  logger.debug('Starting PDF generation');

  logger.info('Generating HTML...');
  const outputName = await generateHTML(options);

  const outputDir = resolve(process.cwd(), options.outputDir);
  const htmlPath = join(outputDir, `${outputName}.html`);
  const finalHTML = await readFile(htmlPath, 'utf-8');

  logger.info('Converting HTML to PDF...');
  const pdfPath = join(outputDir, `${outputName}.pdf`);

  await generatePDFFromHTML({
    html: finalHTML,
    outputPath: pdfPath,
    logger,
    debug: options.debug,
    defaultPageSize: options.pageSize,
  });

  if (!options.debug) {
    await unlink(htmlPath).catch(() => {});
    logger.debug(`Cleaned up intermediate HTML: ${htmlPath}`);
  } else {
    logger.info(`Debug: keeping intermediate HTML: ${htmlPath}`);
  }

  logger.success(`PDF generated: ${pdfPath}`);
}
