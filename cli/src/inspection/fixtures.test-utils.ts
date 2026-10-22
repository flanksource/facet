import JSZip from 'jszip';
import * as CFB from 'cfb';
import { PDFDocument, PDFName, StandardFonts } from 'pdf-lib';

export const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');

export function relations(entries: { id: string; type: string; target: string; external?: boolean }[]): string {
  return `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries.map((entry) => `<Relationship Id="${entry.id}" Type="${REL}/${entry.type}" Target="${entry.target}"${entry.external ? ' TargetMode="External"' : ''}/>`).join('')}</Relationships>`;
}

export function fixture(document: string): JSZip {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>
    <Default Extension="emf" ContentType="image/x-emf"/>
    <Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/>
    <Default Extension="pdf" ContentType="application/pdf"/><Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  </Types>`);
  zip.file('_rels/.rels', relations([{ id: 'main', type: 'officeDocument', target: 'word/document.xml' }]));
  zip.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="${REL}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><w:body>${document}</w:body></w:document>`);
  return zip;
}

export async function pdfFixture(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([144, 72]);
  const plain = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('Diagram', { font: plain, size: 10, x: 2, y: 2 });
  const descriptor = pdf.context.obj({ Type: 'FontDescriptor', FontName: 'ABCDEF+DiagramFace', FontFile2: pdf.context.register(pdf.context.flateStream('font-metadata-fixture')) });
  const embedded = pdf.context.register(pdf.context.obj({ Type: 'Font', Subtype: 'Type0', BaseFont: 'ABCDEF+DiagramFace', DescendantFonts: [pdf.context.obj({ Type: 'Font', Subtype: 'CIDFontType2', FontDescriptor: descriptor })] }));
  const formResources = pdf.context.obj({ Font: { Diagram: embedded } });
  const form = pdf.context.register(pdf.context.flateStream('', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 20, 20], Resources: formResources }));
  formResources.set(PDFName.of('XObject'), pdf.context.obj({ Cycle: form }));
  page.node.set(PDFName.of('Resources'), pdf.context.obj({ Font: { Plain: plain.ref }, XObject: { Nested: form } }));
  return pdf.save();
}

export function oleFixture(pdf: Uint8Array): Uint8Array {
  const storage = CFB.utils.cfb_new();
  CFB.utils.cfb_add(storage, 'CONTENTS', Buffer.from(pdf));
  const data: unknown = CFB.write(storage, { type: 'buffer' });
  if (!(data instanceof Uint8Array)) throw new Error('Expected binary OLE fixture');
  return data;
}
