import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { Block, Image, Chrome, OfficeDocument } from '../model.js';
import type { PdfChrome } from './pdf-chrome.js';
import type { EmbeddedPdf } from './embedded-pdf.js';
import { encodePdfEmf } from '../emf/encode.js';
import type { Logger } from '../../utils/logger.js';
import { logVisual } from '../logging.js';

export interface PdfMedia { parts: EmbeddedPdf[]; get: (asset: Image | PdfChrome) => EmbeddedPdf }

export async function preparePdfMedia({ document, assets, logger, consumerRoot }: { document: OfficeDocument; assets: ReadonlyMap<Chrome, PdfChrome>; logger?: Pick<Logger, 'debug'>; consumerRoot?: string }): Promise<PdfMedia> {
  const pending: { asset: Image | PdfChrome; data?: Uint8Array; png?: Uint8Array; width: number; height: number; source: string; mediaId: string; alt: string }[] = [];
  const collect = (blocks: Block[]): void => blocks.forEach((block) => {
    if (block.kind === 'image' && block.format === 'pdf') pending.push({ asset: block, data: block.data, png: block.preview,
      width: block.box.width, height: block.box.height, source: block.source, mediaId: block.mediaId, alt: block.alt });
    if (block.kind === 'group') collect(block.blocks);
    if (block.kind === 'table') block.rows.forEach((row) => row.cells.forEach((cell) => collect(cell.blocks)));
  });
  document.pages.forEach((page) => collect(page.blocks));
  for (const [chrome, asset] of assets) pending.push({ asset, data: asset.data, png: asset.png, width: asset.width,
    height: asset.height, source: chrome.selector, mediaId: chrome.selector, alt: '' });
  const parts: EmbeddedPdf[] = [];
  const byAsset = new Map<Image | PdfChrome, EmbeddedPdf>();
  const byHash = new Map<string, EmbeddedPdf>();
  for (const item of pending) {
    if (!item.data) throw new Error(`Missing PDF artwork for Word ${item.source}`);
    if (!item.png) throw new Error(`Missing PNG preview for Word PDF ${item.source}`);
    const key = createHash('sha256').update(item.data).update(item.png).update(`${item.width}:${item.height}`).digest('hex');
    let part = byHash.get(key);
    if (!part) {
      const startedAt = performance.now();
      const id = `facetPdf${parts.length + 1}`;
      part = { id, path: `word/media/${id}.emf`, data: await encodePdfEmf({ pdf: item.data, png: item.png, width: item.width, height: item.height, consumerRoot }) };
      parts.push(part);
      byHash.set(key, part);
      logVisual({ logger, format: 'docx', action: 'generated', block: { ...item, format: 'pdf' }, mediaFormat: 'PDF-in-EMF', elapsedMs: performance.now() - startedAt, location: part.path });
    }
    byAsset.set(item.asset, part);
  }
  return { parts, get: (asset) => {
    const part = byAsset.get(asset);
    if (!part) throw new Error('Missing prepared PDF-in-EMF media');
    return part;
  } };
}
