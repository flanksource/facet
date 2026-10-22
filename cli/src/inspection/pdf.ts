import { PDFDocument, PDFName, PDFNumber } from 'pdf-lib';
import type { PdfInspection, PdfPage } from './types.js';
import { mm } from './xml.js';
import { inspectPdfResources, type PdfResources } from './pdf-resources.js';

function physicalBox(box: { x: number; y: number; width: number; height: number }, userUnit: number): typeof box {
  return { x: box.x * userUnit, y: box.y * userUnit, width: box.width * userUnit, height: box.height * userUnit };
}

export async function inspectPdf(options: { data: Uint8Array; asset: string; embeddedImages: boolean; fonts?: boolean }): Promise<PdfInspection> {
  try {
    const pdf = await PDFDocument.load(options.data, { throwOnInvalidObject: true });
    const resources: PdfResources = { fonts: new Map(), images: new Map() };
    const pageDetails: PdfPage[] = pdf.getPages().map((page, index) => {
      inspectPdfResources({ resources: page.node.Resources(), page: index + 1, asset: options.asset, embeddedImages: options.embeddedImages, fonts: options.fonts }, resources);
      const userUnit = page.node.lookupMaybe(PDFName.of('UserUnit'), PDFNumber)?.asNumber() ?? 1;
      if (!Number.isFinite(userUnit) || userUnit <= 0) throw new Error(`Page ${index + 1}: invalid UserUnit ${userUnit}`);
      return { page: index + 1, object: page.ref.toString(), widthPt: page.getWidth() * userUnit, heightPt: page.getHeight() * userUnit, rotation: page.getRotation().angle, userUnit,
        mediaBox: physicalBox(page.getMediaBox(), userUnit), cropBox: physicalBox(page.getCropBox(), userUnit) };
    });
    return { pageDetails, pages: pageDetails.map(page => ({ widthMm: mm(page.widthPt * 25.4 / 72), heightMm: mm(page.heightPt * 25.4 / 72) })),
      fonts: [...resources.fonts.values()].sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type)), images: [...resources.images.values()] };
  } catch (cause) {
    throw new Error(`${options.asset}: invalid PDF: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}
