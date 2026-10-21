import { describe, expect, it } from 'vitest';
import * as CFB from 'cfb';
import { PDFDocument } from 'pdf-lib';
import { pdfOle } from './embedded-pdf.js';

describe('PDF OLE storage', () => {
  it('preserves PDF contents and declares an embedded object without a presentation stream', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 30]);
    const original = await pdf.save();
    const storage = CFB.read(pdfOle(original), { type: 'buffer' });
    expect(Buffer.from(CFB.find(storage, 'CONTENTS')!.content)).toEqual(Buffer.from(original));
    const ole = CFB.find(storage, '\u0001Ole');
    expect(ole).not.toBeNull();
    expect(Buffer.from(ole!.content)).toEqual(Buffer.from('0100000200000000000000000000000000000000', 'hex'));
    expect(storage.FileIndex.some((entry) => entry.name.startsWith('\u0002OlePres'))).toBe(false);
  });

  it('rejects a non-PDF payload', () => {
    expect(() => pdfOle(Buffer.from('Invalid artwork'))).toThrow('Embedded Word artwork must be a PDF');
  });
});
