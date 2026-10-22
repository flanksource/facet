import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { GenerateOptions } from '../types.js';
import { launchBrowser } from '../utils/pdf-generator.js';
import { Logger } from '../utils/logger.js';
import { RenderTimings } from '../utils/performance.js';
import { generateOfficeBuffer } from '../office/index.js';
import { officeLayout } from '../office/layout.js';
import { renderTemplateHTML } from './html.js';

async function generateOffice(options: GenerateOptions, format: 'docx' | 'pptx'): Promise<void> {
  if (options.encryption || options.signature || options.pngOptions || options.pageSize || options.landscape || options.margins || options.header || options.footer) {
    throw new Error('Office exports use Page, Header and Footer template props; PDF/PNG options are not supported');
  }
  const logger = new Logger(options.verbose);
  const timings = options.timings ?? new RenderTimings();
  const { html, outputName, consumerRoot } = await renderTemplateHTML({ options: { ...options, timings }, layout: officeLayout(format, options.fontSize) });
  const browser = await launchBrowser();
  try {
    const buffer = await timings.measure(`${format}-generation`, () => generateOfficeBuffer({ browser, html, format, fontSize: options.fontSize, verbose: options.verbose, consumerRoot }));
    const outputDir = resolve(options.outputDir);
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${outputName}.${format}`);
    await writeFile(outputPath, buffer);
    logger.success(`${format.toUpperCase()} generated: ${outputPath}`);
  } finally {
    await browser.close();
  }
  timings.log(logger);
}

export function generateDOCX(options: GenerateOptions): Promise<void> { return generateOffice(options, 'docx'); }
export function generatePPTX(options: GenerateOptions): Promise<void> { return generateOffice(options, 'pptx'); }
