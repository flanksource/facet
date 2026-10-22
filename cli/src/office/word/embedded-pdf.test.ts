import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import * as D from 'docx';
import JSZip from 'jszip';
import sharp from 'sharp';
import { encodePdfEmf } from '../emf/encode.js';
import { pdfObject, packageEmbeddedPdfs } from './embedded-pdf.js';
import { parseXml, walk } from '../inspect/xml.js';

describe('PDF DrawingML media', () => {
  it.each(['body', 'header', 'footer'] as const)('places a PDF-in-EMF drawing directly inside a Word run in the %s', async (placement) => {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 30]);
    const png = await sharp({ create: { width: 200, height: 30, channels: 4, background: '#123456' } }).png().toBuffer();
    const part = { id: 'facetPdf1', path: 'word/media/facetPdf1.emf', data: await encodePdfEmf({ pdf: await pdf.save(), png, width: 200, height: 30 }) };
    const object = new D.Paragraph({ children: [pdfObject({
      part,
      width: 200, height: 30, y: placement === 'body' ? undefined : 0,
    })] });
    const document = new D.Document({ sections: [{
      children: placement === 'body' ? [object] : [new D.Paragraph('Body')],
      headers: placement === 'header' ? { default: new D.Header({ children: [object] }) } : undefined,
      footers: placement === 'footer' ? { default: new D.Footer({ children: [object] }) } : undefined,
    }] });
    const zip = await JSZip.loadAsync(await packageEmbeddedPdfs({ document: await D.Packer.toBuffer(document), pdfs: [part] }));
    const path = placement === 'body' ? 'word/document.xml' : `word/${placement}1.xml`;
    const xml = await zip.file(path)!.async('string');
    const objects = [...walk(parseXml({ path, xml }))].filter((node) => node.name === 'r')
      .flatMap((node) => node.children.filter((child) => child.name === 'drawing'));
    expect(objects).toHaveLength(1);
    expect(xml).not.toContain('<undefined>');
    expect(xml).not.toContain('OLEObject');
    expect(xml).toContain('r:embed="facetPdf1"');
    const relationships = await zip.file(`word/_rels/${path.slice('word/'.length)}.rels`)!.async('string');
    expect(relationships).toContain('relationships/image');
    expect(relationships).toContain('media/facetPdf1.emf');
    expect(await zip.file('[Content_Types].xml')!.async('string')).toContain('image/x-emf');
  });
});
