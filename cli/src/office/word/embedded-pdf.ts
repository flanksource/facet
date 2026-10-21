import * as CFB from 'cfb';
import JSZip from 'jszip';
import * as D from 'docx';
import { twips } from './text.js';

export interface EmbeddedPdf { id: string; path: string; data: Uint8Array }

export function pdfObject(options: { part: EmbeddedPdf; width: number; height: number; shapeId: string; y?: number }): D.TextRun {
  const { part, width, height, shapeId, y } = options;
  const position = y === undefined ? '' : `position:absolute;margin-left:0pt;margin-top:${y * 0.75}pt;z-index:-1;mso-position-horizontal-relative:page;mso-position-vertical-relative:page;mso-wrap-style:none;`;
  const object = new D.ImportedXmlComponent('w:object', { 'w:dxaOrig': twips(width), 'w:dyaOrig': twips(height) });
  const shapeType = new D.ImportedXmlComponent('v:shapetype', { id: '_x0000_t75', coordsize: '21600,21600', 'o:spt': 75, filled: 'f', stroked: 'f' });
  shapeType.push(new D.ImportedXmlComponent('v:path', { 'o:connecttype': 'rect' }));
  object.push(shapeType);
  object.push(new D.ImportedXmlComponent('v:shape', { id: shapeId, type: '#_x0000_t75', 'o:ole': '', filled: 'f', stroked: 'f',
    style: `${position}width:${width * 0.75}pt;height:${height * 0.75}pt` }));
  object.push(new D.ImportedXmlComponent('o:OLEObject', { Type: 'Embed', ProgID: 'AcroExch.Document.7', ShapeID: shapeId,
    DrawAspect: 'Content', ObjectID: `_${shapeId}`, 'r:id': part.id }));
  return new D.TextRun({ children: [object] });
}

function oleString(text: string): Buffer {
  const bytes = Buffer.from(`${text}\0`, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length);
  return Buffer.concat([length, bytes]);
}

export function pdfOle(data: Uint8Array): Uint8Array {
  if (Buffer.from(data.subarray(0, 5)).toString() !== '%PDF-') throw new Error('Embedded Word artwork must be a PDF');
  // Acrobat's PDF storage keeps the original file in CONTENTS; the CLSID is B801CA65-A1FC-11D0-85AD-444553540000.
  const clsid = '65ca01b8fca1d01185ad444553540000';
  const storage = CFB.utils.cfb_new({ CLSID: clsid });
  CFB.utils.cfb_add(storage, '\u0001Ole', Buffer.from('0100000200000000000000000000000000000000', 'hex'));
  CFB.utils.cfb_add(storage, 'CONTENTS', Buffer.from(data));
  CFB.utils.cfb_add(storage, '\u0001CompObj', Buffer.concat([
    Buffer.from(`0100feff030a0000ffffffff${clsid}`, 'hex'), oleString('Acrobat Document'),
    oleString('Acrobat Document'), oleString('AcroExch.Document.7'), Buffer.from('f439b271000000000000000000000000', 'hex'),
  ]));
  const result: unknown = CFB.write(storage, { type: 'buffer' });
  if (!(result instanceof Uint8Array)) throw new Error('PDF OLE serializer did not return binary data');
  return result;
}

export async function packageEmbeddedPdfs(options: { document: Buffer; pdfs: EmbeddedPdf[] }): Promise<Buffer> {
  if (!options.pdfs.length) return options.document;
  const zip = await JSZip.loadAsync(options.document);
  const types = zip.file('[Content_Types].xml');
  if (!types) throw new Error('Word package is missing content types');
  const contentTypes = await types.async('string');
  if (!contentTypes.includes('</Types>')) throw new Error('Invalid Word content types');
  const overrides = options.pdfs.map((pdf) => {
    if (zip.file(pdf.path)) throw new Error(`Duplicate embedded Word PDF: ${pdf.path}`);
    zip.file(pdf.path, pdf.data);
    return `<Override PartName="/${pdf.path}" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/>`;
  }).join('');
  zip.file('[Content_Types].xml', contentTypes.replace('</Types>', `${overrides}</Types>`));
  for (const part of Object.values(zip.files).filter((part) => /^word\/(document|(?:header|footer)\d+)\.xml$/.test(part.name))) {
    const xml = await part.async('string');
    const ids = new Set([...xml.matchAll(/<o:OLEObject\b[^>]*r:id="(facet(?:Pdf|Diagram)\d+)"/g)].map((match) => match[1]));
    if (!ids.size) continue;
    const path = `word/_rels/${part.name.slice('word/'.length)}.rels`;
    const relationshipsFile = zip.file(path);
    if (!relationshipsFile) throw new Error(`Missing Word relationships: ${path}`);
    const existing = (await relationshipsFile.async('string')).replace(/<Relationships\b([^>]*)\/>/, '<Relationships$1></Relationships>');
    if (!existing.includes('</Relationships>')) throw new Error(`Invalid Word relationships: ${path}`);
    const relationships = [...ids].map((id) => {
      const pdf = options.pdfs.find((pdf) => pdf.id === id);
      if (!pdf) throw new Error(`Missing embedded Word PDF relationship: ${id}`);
      if (existing.includes(`Id="${id}"`)) throw new Error(`Duplicate Word PDF relationship: ${id}`);
      return `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="${pdf.path.slice('word/'.length)}"/>`;
    }).join('');
    zip.file(path, existing.replace('</Relationships>', `${relationships}</Relationships>`));
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
