import { describe, expect, it } from 'vitest';
import * as CFB from 'cfb';
import { PDFDocument } from 'pdf-lib';
import * as D from 'docx';
import JSZip from 'jszip';
import { pdfObject, pdfOle } from './embedded-pdf.js';
import { parseXml, walk } from '../inspect/xml.js';

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

  it.each(['body', 'header', 'footer'] as const)('places the PDF object directly inside a Word run in the %s', async (placement) => {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 30]);
    const object = new D.Paragraph({ children: [pdfObject({
      part: { id: 'testPdf', path: 'word/embeddings/test.bin', data: pdfOle(await pdf.save()) },
      width: 200, height: 30, shapeId: 'testPdfShape',
    })] });
    const document = new D.Document({ sections: [{
      children: placement === 'body' ? [object] : [new D.Paragraph('Body')],
      headers: placement === 'header' ? { default: new D.Header({ children: [object] }) } : undefined,
      footers: placement === 'footer' ? { default: new D.Footer({ children: [object] }) } : undefined,
    }] });
    const zip = await JSZip.loadAsync(await D.Packer.toBuffer(document));
    const path = placement === 'body' ? 'word/document.xml' : `word/${placement}1.xml`;
    const xml = await zip.file(path)!.async('string');
    const objects = [...walk(parseXml({ path, xml }))].filter((node) => node.name === 'r')
      .flatMap((node) => node.children.filter((child) => child.name === 'object'));
    expect(objects).toHaveLength(1);
    expect(xml).not.toContain('<undefined>');
  });
});
