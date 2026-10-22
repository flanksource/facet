import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PDFJS_VERSION = '6.4.299';
export const PDFJS_CANVAS_VERSION = '1.0.10';
type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

export async function loadPdfJs(consumerRoot = process.cwd()): Promise<PdfJs> {
  try { return await import('pdfjs-dist/legacy/build/pdf.mjs'); }
  catch (error) {
    if (!['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
  }
  const require = createRequire(join(consumerRoot, '.facet', 'package.json'));
  return await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href) as PdfJs;
}
