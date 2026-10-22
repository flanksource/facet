import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { encodePdfEmf } from './encode.js';
import { isEmf, readEmfPdf } from './decode.js';

function fixture(pdf: Uint8Array): Buffer {
  const commentSize = Math.ceil((56 + pdf.length) / 4) * 4;
  const bytes = Buffer.alloc(88 + commentSize + 20);
  bytes.writeUInt32LE(1, 0);
  bytes.writeUInt32LE(88, 4);
  bytes.writeUInt32LE(0x464d4520, 40);
  bytes.writeUInt32LE(0x10000, 44);
  bytes.writeUInt32LE(bytes.length, 48);
  bytes.writeUInt32LE(3, 52);
  const comment = bytes.subarray(88);
  [0x46, commentSize, 44 + pdf.length, 0x43494447, 0x40000004, 0, 0, 144, 72, 1, 0x50444620, 0, pdf.length, 44]
    .forEach((value, index) => comment.writeUInt32LE(value, index * 4));
  comment.set(pdf, 56);
  bytes.writeUInt32LE(14, 88 + commentSize);
  bytes.writeUInt32LE(20, 92 + commentSize);
  bytes.writeUInt32LE(20, bytes.length - 4);
  return bytes;
}

describe('Word PDF-in-EMF media', () => {
  it.each([0, 1, 2, 3])('extracts the exact PDF payload with %i alignment bytes', (padding) => {
    const pdf = Buffer.from(`%PDF-1.4\n${' '.repeat(padding)}`);
    expect(Buffer.from(readEmfPdf(fixture(pdf))!)).toEqual(pdf);
  });

  it.each([
    { name: 'record size', offset: 92, value: 0 },
    { name: 'unaligned payload offset', offset: 140, value: 45 },
    { name: 'payload outside its comment', offset: 136, value: 0xffffffff },
    { name: 'format table outside its comment', offset: 124, value: 0xffffffff },
  ])('rejects an invalid $name', ({ offset, value }) => {
    const bytes = fixture(Buffer.from('%PDF-1.4\n'));
    bytes.writeUInt32LE(value, offset);
    expect(() => readEmfPdf(bytes)).toThrow(/EMF/i);
  });

  it('rejects a truncated metafile and ignores a valid EMF without a PDF format', () => {
    const bytes = fixture(Buffer.from('%PDF-1.4\n'));
    expect(() => readEmfPdf(bytes.subarray(0, bytes.length - 1))).toThrow(/EMF/i);
    bytes.writeUInt32LE(0x46535045, 128);
    expect(readEmfPdf(bytes)).toBeUndefined();
    expect(isEmf(Buffer.from('not an EMF'))).toBe(false);
  });

  it('writes a bounded EMF with the original PDF and a premultiplied BGRA display bitmap', async () => {
    const document = await PDFDocument.create();
    document.addPage([144, 72]);
    const pdf = await document.save();
    const png = await sharp(Buffer.from([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0]), { raw: { width: 3, height: 1, channels: 4 } }).png().toBuffer();
    const bytes = Buffer.from(await encodePdfEmf({ pdf, png, width: 192, height: 96 }));
    expect(isEmf(bytes)).toBe(true);
    expect(bytes.readUInt32LE(48)).toBe(bytes.length);
    expect(bytes.readUInt32LE(52)).toBe(4);
    expect([bytes.readInt32LE(32), bytes.readInt32LE(36)]).toEqual([5080, 2540]);
    expect(Buffer.from(readEmfPdf(bytes)!)).toEqual(Buffer.from(pdf));
    const image = bytes.indexOf(Buffer.from('08400105', 'hex'));
    expect(image).toBeGreaterThan(0);
    expect([bytes.readUInt32LE(image + 20), bytes.readUInt32LE(image + 24), bytes.readUInt32LE(image + 28)])
      .toEqual([3, 1, 12]);
    expect([...bytes.subarray(image + 40, image + 52)]).toEqual([0, 0, 255, 255, 0, 128, 0, 128, 0, 0, 0, 0]);
  });
});
