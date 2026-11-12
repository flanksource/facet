import { pathToFileURL } from 'node:url';
import { toolPath } from '../runtime/tools.js';

export const PDFJS_VERSION = '6.4.299';
export const PDFJS_CANVAS_VERSION = '1.0.10';
type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

export async function loadPdfJs(): Promise<PdfJs> {
  return await import(pathToFileURL(await toolPath('pdfjs-dist/legacy/build/pdf.mjs')).href) as PdfJs;
}
