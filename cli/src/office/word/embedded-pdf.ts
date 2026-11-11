import JSZip from 'jszip';
import * as D from 'docx';
import { isEmf } from '../emf/decode.js';

export interface EmbeddedPdf { id: string; path: string; data: Uint8Array }

function element(name: string, attributes: Record<string, string | number> = {}, children: D.ImportedXmlComponent[] = []): D.ImportedXmlComponent {
  const node = new D.ImportedXmlComponent(name, attributes);
  children.forEach((child) => node.push(child));
  return node;
}

export function pdfObject({ part, width, height, alt = '', y }: {
  part: EmbeddedPdf; width: number; height: number; alt?: string; y?: number;
}): D.TextRun {
  const emus = { x: Math.round(width * 9525), y: Math.round(height * 9525) };
  const picture = element('pic:pic', { 'xmlns:pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture' }, [
    element('pic:nvPicPr', {}, [element('pic:cNvPr', { id: 0, name: part.id, descr: alt }), element('pic:cNvPicPr')]),
    element('pic:blipFill', {}, [element('a:blip', { 'r:embed': part.id }), element('a:stretch', {}, [element('a:fillRect')])]),
    element('pic:spPr', {}, [element('a:xfrm', {}, [element('a:off', { x: 0, y: 0 }), element('a:ext', { cx: emus.x, cy: emus.y })]),
      element('a:prstGeom', { prst: 'rect' }, [element('a:avLst')])]),
  ]);
  return new D.TextRun({ children: [new D.Drawing({ type: 'graphic', uri: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    content: picture, transformation: { pixels: { x: width, y: height }, emus } }, {
    docProperties: { name: part.id, description: alt, title: alt },
    floating: y === undefined ? undefined : {
      horizontalPosition: { relative: D.HorizontalPositionRelativeFrom.PAGE, offset: 0 },
      verticalPosition: { relative: D.VerticalPositionRelativeFrom.PAGE, offset: Math.round(y * 9525) },
      wrap: { type: D.TextWrappingType.NONE }, behindDocument: true, allowOverlap: true, layoutInCell: false,
    },
  })] });
}

export async function packageEmbeddedPdfs({ document, pdfs }: { document: Buffer; pdfs: EmbeddedPdf[] }): Promise<Buffer> {
  if (!pdfs.length) return document;
  const zip = await JSZip.loadAsync(document);
  const types = zip.file('[Content_Types].xml');
  if (!types) throw new Error('Word package is missing content types');
  const contentTypes = await types.async('string');
  if (!contentTypes.includes('</Types>')) throw new Error('Invalid Word content types');
  const overrides = pdfs.map((pdf) => {
    if (zip.file(pdf.path)) throw new Error(`Duplicate embedded Word PDF: ${pdf.path}`);
    if (!isEmf(pdf.data)) throw new Error(`Word PDF media is not an EMF: ${pdf.path}`);
    zip.file(pdf.path, pdf.data);
    return `<Override PartName="/${pdf.path}" ContentType="image/x-emf"/>`;
  }).join('');
  zip.file('[Content_Types].xml', contentTypes.replace('</Types>', `${overrides}</Types>`));
  for (const part of Object.values(zip.files).filter((part) => /^word\/(document|(?:header|footer)\d+)\.xml$/.test(part.name))) {
    const ids = new Set([...(await part.async('string')).matchAll(/<a:blip\b[^>]*r:embed="(facetPdf\d+)"/g)].map((match) => match[1]));
    if (!ids.size) continue;
    const path = `word/_rels/${part.name.slice('word/'.length)}.rels`;
    const relationshipsFile = zip.file(path);
    if (!relationshipsFile) throw new Error(`Missing Word relationships: ${path}`);
    const existing = (await relationshipsFile.async('string')).replace(/<Relationships\b([^>]*)\/>/, '<Relationships$1></Relationships>');
    if (!existing.includes('</Relationships>')) throw new Error(`Invalid Word relationships: ${path}`);
    const relationships = [...ids].map((id) => {
      const pdf = pdfs.find((pdf) => pdf.id === id);
      if (!pdf) throw new Error(`Missing embedded Word PDF relationship: ${id}`);
      if (existing.includes(`Id="${id}"`)) throw new Error(`Duplicate Word PDF relationship: ${id}`);
      return `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${pdf.path.slice('word/'.length)}"/>`;
    }).join('');
    zip.file(path, existing.replace('</Relationships>', `${relationships}</Relationships>`));
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
