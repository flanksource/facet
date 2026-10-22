import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { preparePdfMedia } from './pdf-media.js';
import type { Image, OfficeDocument, TextStyle } from '../model.js';
import { readEmfPdf } from '../emf/decode.js';

const style: TextStyle = { font: 'Arial', size: 10, bold: false, italic: false, underline: false, strike: false,
  color: '000000', align: 'left', lineHeight: 14, before: 0, after: 0, borderWidth: 0 };

describe('shared PDF-in-EMF media preparation', () => {
  it('shares identical artwork across body and chrome and preserves its original PDF', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([150, 22.5]);
    const data = await pdf.save();
    const preview = await sharp({ create: { width: 200, height: 30, channels: 4, background: '#123456' } }).png().toBuffer();
    const image: Image = { kind: 'image', format: 'pdf', data, preview, source: 'figure', mediaId: 'diagram', alt: 'Diagram', style, box: { x: 0, y: 0, width: 200, height: 30 } };
    const copy = { ...image, data: data.slice(), preview: preview.slice() };
    const chrome = { blocks: [], height: 30, selector: 'header' };
    const artwork = { data, png: preview, width: 200, height: 30, counters: [] };
    const document: OfficeDocument = { title: 'Shared artwork', pages: [{ size: 'a4', width: 800, height: 1100,
      blocks: [image, copy], header: chrome, margins: { top: 0, right: 0, bottom: 0, left: 0 } }] };
    const media = await preparePdfMedia({ document, assets: new Map([[chrome, artwork]]) });
    expect(media.parts).toHaveLength(1);
    expect(media.get(image)).toBe(media.get(copy));
    expect(media.get(image)).toBe(media.get(artwork));
    expect(Buffer.from(readEmfPdf(media.parts[0].data)!)).toEqual(Buffer.from(data));
    delete image.preview;
    await expect(preparePdfMedia({ document, assets: new Map([[chrome, artwork]]) })).rejects.toThrow(/Missing PNG.*figure/);
  });
});
