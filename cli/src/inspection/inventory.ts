import { extname, resolve } from 'node:path';
import { inspectDOCX } from './index.js';
import { inspectPdf } from './pdf.js';
import { inspectPng } from './png.js';
import { inspectPdfColors } from './pdf-colors.js';
import { inspectDocxColors } from './docx-colors.js';
import { openDocx } from './package.js';
import { compactReportValue } from '../lint/locations.js';
import type { AssetInfo } from './types.js';

export interface InspectOptions {
  data: Uint8Array; file: string; fonts?: boolean; colors?: boolean;
  fontPosition?: boolean; colorPositions?: boolean; embeddedImages?: boolean;
}

function fontEntry<T extends { locations: unknown[]; pages?: number[]; sources?: string[] }>(entry: T, positions: boolean): Record<string, unknown> {
  const { locations, pages, sources, ...details } = entry;
  return { ...details, ...(positions ? { locations, pages, sources } : {}) };
}

function projectAsset(asset: AssetInfo, options: { fonts: boolean; fontPosition: boolean }): Record<string, unknown> {
  const { pdf, ...metadata } = asset;
  if (!pdf) return metadata;
  const { fonts, ...details } = pdf;
  return { ...metadata, pdf: { ...details, ...(options.fonts ? { fonts: fonts.map(font => fontEntry(font, options.fontPosition)) } : {}) } };
}

export async function inspectFile(options: InspectOptions): Promise<Record<string, unknown>> {
  const { data, file, fonts = true, colors = true, fontPosition = false, colorPositions = false, embeddedImages = false } = options;
  if (fontPosition && !fonts) throw new Error('--font-position requires --fonts=true');
  if (colorPositions && !colors) throw new Error('--color-positions requires --colors=true');
  const format = extname(file).slice(1).toLowerCase();
  const result: Record<string, unknown> = { filePath: resolve(file), format };
  if (format === 'png') {
    Object.assign(result, await inspectPng({ data, colors, positions: colorPositions }));
    if (fonts) result.fonts = { status: 'unavailable', reason: 'PNG pixels contain no native font-family metadata; OCR is not performed.' };
  } else if (format === 'pdf') {
    const pdf = await inspectPdf({ data, asset: file, embeddedImages, fonts });
    result.pages = pdf.pageDetails;
    if (fonts) result.fonts = { status: 'available', entries: pdf.fonts.map(font => fontEntry(font, fontPosition)) };
    if (colors) result.colors = await inspectPdfColors(data, colorPositions);
    if (embeddedImages) result.images = pdf.images;
  } else if (format === 'docx') {
    const docx = await inspectDOCX({ data, embeddedImages, fonts, colors, colorPositions });
    result.part = docx.part; result.sections = docx.sections;
    if (fonts) result.fonts = { status: 'available', entries: [...docx.fonts.word.map(font => fontEntry(font, fontPosition)), ...docx.fonts.pdf.map(font => fontEntry(font, fontPosition))] };
    if (colors) result.colors = inspectDocxColors(await openDocx(data), colorPositions);
    if (embeddedImages) result.assets = docx.assets.map(asset => projectAsset(asset, { fonts, fontPosition }));
  } else throw new Error(`Unsupported inspection format: ${format || file}; expected PDF, PNG or DOCX`);
  return compactReportValue(result) as Record<string, unknown>;
}
