import { existsSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

import type { GenerateOptions } from '../types.js';
import { launchBrowser } from '../utils/pdf-generator.js';
import { Logger } from '../utils/logger.js';
import { RenderProfiler, RenderTimings } from '../utils/performance.js';
import { generatePNGBuffer } from '../utils/png-generator.js';
import { generateHTML } from './html.js';

export async function generatePNG(options: GenerateOptions): Promise<void> {
  const logger = new Logger(options.verbose);
  const profiler = new RenderProfiler('png', logger);
  const timings = options.timings ?? new RenderTimings();
  const outputDir = resolve(process.cwd(), options.outputDir);
  const expectedOutputName = options.outputName ?? basename(options.template, extname(options.template));
  const expectedHTMLPath = join(outputDir, `${expectedOutputName}.html`);
  const preserveHTML = existsSync(expectedHTMLPath);

  logger.info('Generating HTML...');
  const outputName = await profiler.measure('html', () => generateHTML({ ...options, timings }));
  const htmlPath = join(outputDir, `${outputName}.html`);
  const html = await readFile(htmlPath, 'utf-8');
  const pngPath = join(outputDir, `${outputName}.png`);

  logger.info('Capturing PNG...');
  const browser = await launchBrowser();
  try {
    const png = await timings.measure('png-generation', () =>
      profiler.measure('chromium-and-png', () =>
        generatePNGBuffer(browser, html, options.pngOptions)));
    await writeFile(pngPath, png);
  } finally {
    await browser.close();
  }

  if (!preserveHTML) {
    await unlink(htmlPath).catch(() => undefined);
    logger.debug(`Cleaned up intermediate HTML: ${htmlPath}`);
  }

  logger.success(`PNG generated: ${pngPath}`);
  timings.log(logger);
  profiler.finish();
}
