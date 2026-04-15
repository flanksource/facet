import { PDFDocument, StandardFonts, rgb, PDFName, PDFArray, PDFRef, PDFRawStream, PDFContentStream } from 'pdf-lib';
import {
  PAGE_MARKER,
  TOTAL_MARKER,
  bufferHasPlaceholders,
  replaceInBuffer,
  compositeHeaderFooter,
} from '../src/utils/pdf-multipass.js';
import type { PageTypeInfo, PageType } from '../src/utils/pdf-multipass.js';

const PAGE_MARKER_HEX = Buffer.from(PAGE_MARKER).toString('hex').toUpperCase();
const TOTAL_MARKER_HEX = Buffer.from(TOTAL_MARKER).toString('hex').toUpperCase();
import { inflate } from 'zlib';
import { promisify } from 'util';

const inflateAsync = promisify(inflate);

async function createPdfWithText(text: string, widthMm = 210, heightMm = 10): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([widthMm * 72 / 25.4, heightMm * 72 / 25.4]);
  page.drawText(text, { x: 10, y: 5, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
  return Buffer.from(await doc.save());
}

async function decodeStream(doc: PDFDocument, ref: PDFRef): Promise<string> {
  const obj = doc.context.lookup(ref);
  if (obj instanceof PDFRawStream) {
    const dict = obj.dict;
    const filter = dict.get(PDFName.of('Filter'));
    const raw = obj.contents;
    if (filter && filter.toString() === '/FlateDecode') {
      const decoded = await inflateAsync(Buffer.from(raw));
      return decoded.toString('latin1');
    }
    return Buffer.from(raw).toString('latin1');
  }
  if (obj instanceof PDFContentStream) {
    return obj.toString();
  }
  return '';
}

function hexToString(hex: string): string {
  return Buffer.from(hex, 'hex').toString('latin1');
}

function extractTextOps(streamContent: string): string {
  const texts: string[] = [];
  for (const m of streamContent.matchAll(/\(([^)]*)\)\s*Tj/g)) texts.push(m[1]);
  for (const m of streamContent.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) texts.push(hexToString(m[1]));
  for (const m of streamContent.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
    for (const im of m[1].matchAll(/\(([^)]*)\)/g)) texts.push(im[1]);
    for (const im of m[1].matchAll(/<([0-9A-Fa-f]+)>/g)) texts.push(hexToString(im[1]));
  }
  return texts.join('');
}

async function extractAllTexts(pdfBytes: Uint8Array, debug = false): Promise<string[]> {
  const doc = await PDFDocument.load(pdfBytes);
  const texts: string[] = [];
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    let content = '';
    if (obj instanceof PDFRawStream) {
      try { content = await decodeStream(doc, ref); } catch { continue; }
    } else if (obj instanceof PDFContentStream) {
      content = obj.toString();
    } else {
      continue;
    }
    if (debug && content.length > 0) {
      console.log(`[${ref}] type=${obj.constructor.name} len=${content.length} preview=${content.slice(0, 200)}`);
    }
    const text = extractTextOps(content);
    if (text) texts.push(text);
  }
  return texts;
}

async function createContentPdf(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([595.28, 841.89]); // A4
  }
  return Buffer.from(await doc.save());
}

describe('page number placeholder replacement', () => {
  describe('bufferHasPlaceholders', () => {
    it('detects PAGE_MARKER', () => {
      const buf = Buffer.from(`Page ${PAGE_MARKER} of 10`);
      expect(bufferHasPlaceholders(buf)).toBe(true);
    });

    it('detects TOTAL_MARKER', () => {
      const buf = Buffer.from(`Page 1 of ${TOTAL_MARKER}`);
      expect(bufferHasPlaceholders(buf)).toBe(true);
    });

    it('detects both markers', () => {
      const buf = Buffer.from(`Page ${PAGE_MARKER} of ${TOTAL_MARKER}`);
      expect(bufferHasPlaceholders(buf)).toBe(true);
    });

    it('returns false when no markers present', () => {
      const buf = Buffer.from('Page 1 of 10');
      expect(bufferHasPlaceholders(buf)).toBe(false);
    });
  });

  describe('replaceInBuffer', () => {
    it('replaces placeholder with value padded to same length', () => {
      const buf = Buffer.from(`Page ${PAGE_MARKER} of ${TOTAL_MARKER}`);
      const result = replaceInBuffer(buf, PAGE_MARKER, '3');
      expect(result.toString()).toBe(`Page 3    of ${TOTAL_MARKER}`);
    });

    it('replaces all occurrences', () => {
      const buf = Buffer.from(`${PAGE_MARKER}/${PAGE_MARKER}`);
      const result = replaceInBuffer(buf, PAGE_MARKER, '5');
      expect(result.toString()).toBe('5   /5   ');
    });

    it('preserves buffer length', () => {
      const buf = Buffer.from(`Page ${PAGE_MARKER} of ${TOTAL_MARKER}`);
      const replaced = replaceInBuffer(
        replaceInBuffer(buf, PAGE_MARKER, '7'),
        TOTAL_MARKER,
        '12',
      );
      expect(replaced.length).toBe(buf.length);
    });

    it('handles value same length as placeholder', () => {
      const buf = Buffer.from(`x${PAGE_MARKER}x`);
      const result = replaceInBuffer(buf, PAGE_MARKER, '9999');
      expect(result.toString()).toBe('x9999x');
    });

    it('does not modify buffer without placeholder', () => {
      const buf = Buffer.from('no markers here');
      const result = replaceInBuffer(buf, PAGE_MARKER, '1');
      expect(result.toString()).toBe('no markers here');
    });

    it('does not mutate the original buffer', () => {
      const original = Buffer.from(`${PAGE_MARKER}`);
      const copy = Buffer.from(original);
      replaceInBuffer(original, PAGE_MARKER, '1');
      expect(original.equals(copy)).toBe(true);
    });
  });

  describe('compositeHeaderFooter with placeholders', () => {
    const typeInfo: PageTypeInfo = {
      types: ['default' as PageType],
      pageSizes: ['a4'],
      pageMargins: [],
      definitions: new Map([
        ['default', { type: 'default' as PageType, headerHeight: 0, footerHeight: 10 }],
      ]),
    };

    it('replaces markers in PDF object streams so no placeholders remain', async () => {
      const footerBuf = await createPdfWithText(`Page ${PAGE_MARKER} of ${TOTAL_MARKER}`);
      const contentBuf = await createContentPdf(3);
      const pageMap: PageType[] = ['default', 'default', 'default'];

      const result = await compositeHeaderFooter(
        contentBuf,
        { headers: new Map(), footers: new Map([['default:a4', footerBuf]]) },
        pageMap,
        typeInfo,
      );

      const allTexts = await extractAllTexts(result);
      const joined = allTexts.join(' ');
      expect(joined).not.toContain(PAGE_MARKER);
      expect(joined).not.toContain(TOTAL_MARKER);

      const raw = Buffer.from(result);
      const rawHex = raw.toString('hex').toUpperCase();
      expect(raw.includes(PAGE_MARKER)).toBe(false);
      expect(raw.includes(TOTAL_MARKER)).toBe(false);
      expect(rawHex.includes(PAGE_MARKER_HEX)).toBe(false);
      expect(rawHex.includes(TOTAL_MARKER_HEX)).toBe(false);
    });

    it('preserves static footer text in PDF object streams', async () => {
      const footerBuf = await createPdfWithText('Static Footer');
      const contentBuf = await createContentPdf(2);
      const pageMap: PageType[] = ['default', 'default'];

      const result = await compositeHeaderFooter(
        contentBuf,
        { headers: new Map(), footers: new Map([['default:a4', footerBuf]]) },
        pageMap,
        typeInfo,
      );

      const allTexts = await extractAllTexts(result);
      const joined = allTexts.join(' ');
      expect(joined).toContain('Static Footer');
      expect(joined).not.toContain(PAGE_MARKER);
    });
  });
});
