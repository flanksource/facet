import { readFile } from 'fs/promises';
import { resolve, join } from 'path';
import type { GenerateOptions } from '../types.js';
import { Logger } from '../utils/logger.js';
import { generateHTML } from './html.js';
import { generatePDFFromHTML } from '../utils/pdf-generator.js';

export async function generatePDF(options: GenerateOptions): Promise<void> {
  const logger = new Logger(options.verbose);

  logger.debug('Starting PDF generation');

  // Step 1: Generate HTML first (this handles all rendering + Tailwind CSS generation)
  logger.info('Generating HTML...');
  const outputName = await generateHTML(options);

  // Step 2: Read the generated HTML file
  const outputDir = resolve(process.cwd(), options.outputDir);
  const htmlPath = join(outputDir, `${outputName}.html`);
  const finalHTML = await readFile(htmlPath, 'utf-8');

  // Step 4: Generate PDF from the HTML
  logger.info('Converting HTML to PDF...');
  const pdfPath = join(outputDir, `${outputName}.pdf`);

  await generatePDFFromHTML({
    html: finalHTML,
    outputPath: pdfPath,
    logger,
  });

  logger.success(`PDF generated: ${pdfPath}`);
}
