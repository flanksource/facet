import type { Browser } from 'puppeteer-core';
import { generateOfficeBuffer } from '../office/index.js';
import { generatePDFBuffer } from '../utils/pdf-generator.js';
import { generatePNGBuffer } from '../utils/png-generator.js';
import { applyPDFSecurity } from '../utils/pdf-security.js';
import type { Logger } from '../utils/logger.js';
import type { RenderTimings } from '../utils/performance.js';
import type { ParsedRenderRequest } from './request.js';
import type { RenderProgress } from './render-stream.js';
import { pageSizeLayout } from '../utils/page-size-layout.js';
import { renderBrowserHTML } from '../utils/browser-html.js';

export async function renderBinary(options: {
  browser: Browser;
  html: string;
  consumerRoot: string;
  parsed: ParsedRenderRequest;
  timings: RenderTimings;
  logger: Logger;
  progress?: RenderProgress;
}): Promise<Buffer> {
  const { browser, parsed, timings, logger, progress } = options;
  const layout = pageSizeLayout(parsed.pageSizeOverride, parsed.pdfOptions?.landscape);
  const html = layout ? await renderBrowserHTML({ browser, html: options.html, layout }) : options.html;
  const { format } = parsed;
  if (format === 'html') throw new Error('HTML must use the HTML render pipeline');
  progress?.emit(`rendering-${format}`, `Generating ${format.toUpperCase()}...`);
  if (format === 'docx' || format === 'pptx') return timings.measure(`${format}-generation`, () => generateOfficeBuffer({ browser, html, format, fontSize: parsed.fontSize, consumerRoot: options.consumerRoot }));
  if (format === 'png') return timings.measure('png-generation', () => generatePNGBuffer(browser, html, { ...parsed.pngOptions, ...(layout ? { viewport: layout.viewport } : {}) }));
  let output = await timings.measure('pdf-generation', () => generatePDFBuffer(browser, html, {
    ...parsed.pdfOptions,
    ...(layout ? { defaultPageSize: layout.pageSizeOverride } : {}),
  }));
  if (parsed.encryption || parsed.signature) {
    progress?.emit('securing', 'Applying PDF security...');
    output = await applyPDFSecurity(output, { encryption: parsed.encryption, signature: parsed.signature, timings }, logger);
  }
  return output;
}
