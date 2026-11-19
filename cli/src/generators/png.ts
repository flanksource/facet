import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { GenerateOptions } from '../types.js';
import { launchBrowser } from '../utils/pdf-generator.js';
import { Logger } from '../utils/logger.js';
import { RenderProfiler, RenderTimings } from '../utils/performance.js';
import { generatePNGBuffer } from '../utils/png-generator.js';
import { renderTemplateHTML } from './html.js';
import { pageSizeLayout } from '../utils/page-size-layout.js';

export async function generatePNG(options: GenerateOptions): Promise<void> {
  const logger = new Logger(options.verbose);
  const profiler = new RenderProfiler('png', logger);
  const timings = options.timings ?? new RenderTimings();
  const outputDir = resolve(process.cwd(), options.outputDir);
  logger.info('Generating HTML...');
  const { html, outputName } = await profiler.measure('html', () => renderTemplateHTML({ options: { ...options, timings } }));
  const pngPath = join(outputDir, `${outputName}.png`);
  await mkdir(outputDir, { recursive: true });

  logger.info('Capturing PNG...');
  const browser = await launchBrowser();
  try {
    const png = await timings.measure('png-generation', () =>
      profiler.measure('chromium-and-png', () =>
        generatePNGBuffer(browser, html, {
          ...options.pngOptions,
          ...(options.pageSizeOverride ? { viewport: pageSizeLayout(options.pageSizeOverride)!.viewport } : {}),
        })));
    await writeFile(pngPath, png);
  } finally {
    await browser.close();
  }

  logger.success(`PNG generated: ${pngPath}`);
  timings.log(logger);
  profiler.finish();
}
