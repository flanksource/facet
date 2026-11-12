import { pathToFileURL } from 'node:url';
import { cliDependencyPath } from '../runtime/cli-dependencies.js';

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

export async function loadPdfJs(): Promise<PdfJs> {
  return await import(pathToFileURL(cliDependencyPath('pdfjs-dist/legacy/build/pdf.mjs')).href) as PdfJs;
}
