import * as CFB from 'cfb';
import type { AssetInfo, PdfFont } from './types.js';
import type { DocxPackage } from './package.js';
import { inspectReferences } from './uses.js';
import { inspectPdf } from './pdf.js';
import { isEmf, readEmfPdf } from '../office/emf/decode.js';
import { inspectPdfColors } from './pdf-colors.js';
import { inspectPng } from './png.js';

function mediaFormat(data: Uint8Array, contentType: string): string {
  const bytes = Buffer.from(data);
  if (bytes.subarray(0, 5).toString() === '%PDF-') return 'PDF';
  if (bytes.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1') return 'OLE';
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'PNG';
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return 'JPEG';
  if (isEmf(data)) return 'EMF';
  if (contentType.startsWith('image/')) return contentType.slice('image/'.length).replace('+xml', '').toUpperCase();
  if (/font/i.test(contentType)) return 'FONT';
  return 'FILE';
}

export async function inspectAssets(pkg: DocxPackage, options: { fonts?: boolean; colors?: boolean; colorPositions?: boolean } = {}): Promise<{ assets: AssetInfo[]; fonts: PdfFont[] }> {
  const refs = inspectReferences(pkg);
  const assets: AssetInfo[] = [];
  const fonts: PdfFont[] = [];
  for (const [path, file] of [...pkg.files].sort(([a], [b]) => a.localeCompare(b))) {
    if (!refs.uses.has(path) && !/\/(media|embeddings|fonts)\//.test(path) && /\.(xml|rels)$/i.test(path)) continue;
    if (path === '[Content_Types].xml' || path.endsWith('.rels')) continue;
    const data = await file.async('uint8array');
    const contentType = pkg.contentType(path);
    const asset: AssetInfo = { path, contentType, format: mediaFormat(data, contentType), bytes: data.length,
      progIds: [...refs.progIds.get(path) ?? []].sort(), uses: refs.uses.get(path) ?? [], previewFor: [...refs.previews.get(path) ?? []].sort() };
    let pdf = asset.format === 'PDF' || contentType === 'application/pdf' || path.toLowerCase().endsWith('.pdf') ? data : undefined;
    if (asset.format === 'EMF' || /emf/i.test(contentType) || path.toLowerCase().endsWith('.emf')) {
      try { pdf = readEmfPdf(data); }
      catch (cause) { throw new Error(`${path}: invalid EMF: ${cause instanceof Error ? cause.message : String(cause)}`, { cause }); }
    }
    if (asset.format === 'OLE' || contentType === 'application/vnd.openxmlformats-officedocument.oleObject') {
      try {
        if (Buffer.from(data.subarray(0, 8)).toString('hex') !== 'd0cf11e0a1b11ae1') throw new Error('Missing OLE compound-file signature');
        const storage = CFB.read(data, { type: 'buffer' });
        asset.streams = storage.FileIndex.filter((entry) => entry.type === 2).map((entry) => entry.name).sort();
        const contents = CFB.find(storage, 'CONTENTS');
        if (contents && (Buffer.from(contents.content).subarray(0, 5).toString() === '%PDF-' || asset.progIds.some((id) => id.startsWith('AcroExch.Document')))) pdf = Buffer.from(contents.content);
      } catch (cause) { throw new Error(`${path}: invalid OLE object: ${cause instanceof Error ? cause.message : String(cause)}`, { cause }); }
    }
    if (pdf) {
      const inspected = await inspectPdf({ data: pdf, asset: path, embeddedImages: true, fonts: options.fonts });
      asset.format = 'PDF';
      asset.payloadBytes = pdf.length;
      asset.pdf = inspected;
      if (options.colors) inspected.colors = await inspectPdfColors(pdf, options.colorPositions ?? false);
      fonts.push(...inspected.fonts);
    }
    if (asset.format === 'PNG' && options.colors) asset.colors = (await inspectPng({ data, colors: true, positions: options.colorPositions ?? false })).colors;
    assets.push(asset);
  }
  return { assets, fonts };
}
