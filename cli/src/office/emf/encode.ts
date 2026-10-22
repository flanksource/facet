import { loadSharp } from '../../utils/sharp.js';
import { PDFDocument } from 'pdf-lib';

function words(values: number[]): Buffer {
  const data = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => data.writeUInt32LE(value >>> 0, index * 4));
  return data;
}

function floats(values: number[]): Buffer {
  const data = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => data.writeFloatLE(value, index * 4));
  return data;
}

function plusRecord(type: number, flags: number, data: Buffer = Buffer.alloc(0)): Buffer {
  return Buffer.concat([words([type | flags << 16, data.length + 12, data.length]), data]);
}

function comment(data: Buffer): Buffer {
  const size = Math.ceil((12 + data.length) / 4) * 4;
  return Buffer.concat([words([0x46, size, data.length]), data, Buffer.alloc(size - data.length - 12)]);
}

export async function encodePdfEmf({ pdf, png, width, height, consumerRoot }: { pdf: Uint8Array; png: Uint8Array; width: number; height: number; consumerRoot?: string }): Promise<Uint8Array> {
  if (![width, height].every((value) => Number.isFinite(value) && value > 0 && value * 2540 / 96 <= 0x7fffffff)) throw new Error('Invalid PDF-in-EMF dimensions');
  if (Buffer.from(pdf.subarray(0, 5)).toString() !== '%PDF-') throw new Error('EMF artwork must contain a PDF');
  const document = await PDFDocument.load(pdf);
  if (document.getPageCount() !== 1) throw new Error('EMF artwork requires exactly one PDF page');
  const sharp = await loadSharp(consumerRoot);
  const bitmap = await sharp(png).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: pixelsWide, height: pixelsHigh } = bitmap.info;
  const pixels = Buffer.alloc(bitmap.data.length);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const alpha = bitmap.data[offset + 3];
    pixels[offset] = Math.round(bitmap.data[offset + 2] * alpha / 255);
    pixels[offset + 1] = Math.round(bitmap.data[offset + 1] * alpha / 255);
    pixels[offset + 2] = Math.round(bitmap.data[offset] * alpha / 255);
    pixels[offset + 3] = alpha;
  }
  const display = comment(Buffer.concat([
    words([0x2b464d45]), plusRecord(0x4001, 1, words([0xdbc01002, 1, 96, 96])),
    plusRecord(0x4030, 2, floats([1])), plusRecord(0x4009, 0, words([0])),
    plusRecord(0x4008, 0x0501, Buffer.concat([words([0xdbc01002, 1, pixelsWide, pixelsHigh, pixelsWide * 4, 0x000e200b, 0]), pixels])),
    plusRecord(0x401a, 1, Buffer.concat([words([0, 2]), floats([0, 0, pixelsWide, pixelsHigh, 0, 0, pixelsWide, pixelsHigh])])),
    plusRecord(0x4002, 0),
  ]));
  // Word for macOS stores its original PDF under this signature in a public multi-format comment.
  const original = comment(Buffer.concat([words([0x43494447, 0x40000004, 0, 0, pixelsWide, pixelsHigh, 1, 0x50444620, 0, pdf.length, 44]), Buffer.from(pdf)]));
  const end = words([14, 20, 0, 16, 20]);
  const header = words([1, 108, 0, 0, pixelsWide - 1, pixelsHigh - 1, 0, 0, Math.round(width * 2540 / 96), Math.round(height * 2540 / 96),
    0x464d4520, 0x10000, 108 + display.length + original.length + end.length, 4, 1, 0, 0, 0, 960, 960, 254, 254, 0, 0, 0, 254000, 254000]);
  return Buffer.concat([header, display, original, end]);
}
