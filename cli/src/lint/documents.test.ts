import { describe, expect, it } from 'vitest';
import { degrees, PDFDict, PDFDocument, PDFName, StandardFonts } from 'pdf-lib';
import { lintDocument } from './documents.js';
import { fixture, PNG, relations, oleFixture, pdfFixture } from '../inspection/fixtures.test-utils.js';
import { encodePdfEmf } from '../office/emf/encode.js';
import { loadSharp } from '../utils/sharp.js';
import { inspectPdf } from '../inspection/pdf.js';

const DOCX = 'report.docx';
const PDF = 'report.pdf';

describe('document info lints', () => {
  it('reports DOCX sections without font inventories', async () => {
    const zip = fixture('<w:p><w:r><w:rPr><w:rFonts w:ascii="Example Face"/></w:rPr></w:r></w:p><w:sectPr><w:pgSz w:w="1440" w:h="2880"/><w:pgMar w:gutter="0"/></w:sectPr>');
    const issues = await lintDocument({ data: await zip.generateAsync({ type: 'uint8array' }), file: DOCX, format: 'docx', embeddedImages: false });
    expect(issues).toEqual([
      expect.objectContaining({ rule: 'docx-section', severity: 'info', locations: [expect.objectContaining({ type: 'docx', part: 'word/document.xml', elementPath: '/document[1]/body[1]/sectPr[1]' })] }),
    ]);
  });

  it('gates embedded image metadata and retains every placement of a shared image', async () => {
    const drawing = '<w:r><w:drawing><wp:extent cx="914400" cy="457200"/><a:blip r:embed="picture"/></w:drawing></w:r>';
    const zip = fixture(`<w:p>${drawing}${drawing}</w:p><w:sectPr/>`);
    zip.file('word/media/shared.png', PNG);
    zip.file('word/_rels/document.xml.rels', relations([
      { id: 'picture', type: 'image', target: 'media/shared.png' },
      { id: 'header', type: 'header', target: 'header1.xml' },
    ]));
    zip.file('word/header1.xml', '<header xmlns:r="urn:relationship"><drawing><blip r:embed="image"/></drawing></header>');
    zip.file('word/_rels/header1.xml.rels', relations([{ id: 'image', type: 'image', target: 'media/shared.png' }]));
    const data = await zip.generateAsync({ type: 'uint8array' });
    expect((await lintDocument({ data, file: DOCX, format: 'docx', embeddedImages: false })).map(issue => issue.rule)).toEqual(['docx-section']);
    const images = (await lintDocument({ data, file: DOCX, format: 'docx', embeddedImages: true })).filter(issue => issue.rule === 'docx-embedded-image');
    expect(images).toEqual([expect.objectContaining({ severity: 'info', data: expect.objectContaining({ format: 'PNG', bytes: PNG.length }),
      locations: [
        expect.objectContaining({ part: 'word/document.xml', relationshipId: 'picture', asset: 'word/media/shared.png', elementPath: expect.stringContaining('/r[1]/drawing[1]') }),
        expect.objectContaining({ part: 'word/document.xml', relationshipId: 'picture', asset: 'word/media/shared.png', elementPath: expect.stringContaining('/r[2]/drawing[1]') }),
        expect.objectContaining({ part: 'word/header1.xml', relationshipId: 'image', asset: 'word/media/shared.png' }),
      ],
    })]);
  });

  it('inspects embedded payloads strictly only when requested', async () => {
    const zip = fixture('<w:sectPr/>');
    zip.file('word/embeddings/broken.pdf', '%PDF-invalid');
    const data = await zip.generateAsync({ type: 'uint8array' });
    await expect(lintDocument({ data, file: DOCX, format: 'docx', embeddedImages: false })).resolves.toHaveLength(1);
    await expect(lintDocument({ data, file: DOCX, format: 'docx', embeddedImages: true })).rejects.toThrow('broken.pdf');
  });

  it('always validates DOCX relationships', async () => {
    const zip = fixture('<w:sectPr/>');
    zip.file('word/_rels/document.xml.rels', relations([{ id: 'missing', type: 'image', target: 'media/missing.png' }]));
    await expect(lintDocument({ data: await zip.generateAsync({ type: 'uint8array' }), file: DOCX, format: 'docx', embeddedImages: false })).rejects.toThrow('missing.png');
  });

  it.each(['emf', 'ole', 'pdf'] as const)('retains DOCX owners and embedded PDF locations for %s assets', async format => {
    const pdf = await pdfFixture();
    const path = format === 'emf' ? 'word/media/diagram.emf' : `word/embeddings/diagram.${format === 'ole' ? 'bin' : 'pdf'}`;
    const zip = fixture(format === 'emf'
      ? '<w:p><w:r><w:drawing><a:blip r:embed="diagram"/></w:drawing></w:r></w:p>'
      : '<w:p><w:r><w:object><o:OLEObject r:id="diagram"/></w:object></w:r></w:p>');
    const sharp = await loadSharp();
    const preview = await sharp({ create: { width: 144, height: 72, channels: 3, background: '#334155' } }).png().toBuffer();
    const data = format === 'emf' ? await encodePdfEmf({ pdf, png: preview, width: 144, height: 72 }) : format === 'ole' ? oleFixture(pdf) : pdf;
    zip.file(path, data);
    zip.file('word/_rels/document.xml.rels', relations([{ id: 'diagram', type: format === 'emf' ? 'image' : 'oleObject', target: path.slice('word/'.length) }]));
    const issues = await lintDocument({ data: await zip.generateAsync({ type: 'uint8array' }), file: DOCX, format: 'docx', embeddedImages: true });
    expect(issues.map(issue => issue.rule)).toEqual(['docx-embedded-image', 'pdf-page']);
    expect(issues[1]).toMatchObject({ locations: [{ type: 'docx', part: 'word/document.xml', asset: path, relationshipId: 'diagram', elementPath: expect.stringContaining('/p[1]/r[1]/'), pdf: { type: 'pdf', page: 1, object: expect.any(String) } }] });
  });

  it('retains multiple resource paths for a shared PDF Form without looping on cycles', async () => {
    const pdf = await PDFDocument.load(await pdfFixture());
    const page = pdf.getPage(0);
    const objects = page.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
    objects.set(PDFName.of('Second'), objects.get(PDFName.of('Nested'))!);
    const inspection = await inspectPdf({ data: await pdf.save(), asset: PDF, embeddedImages: false });
    const font = inspection.fonts.find(font => font.name.startsWith('ABCDEF+DiagramFace'));
    expect(font?.locations).toEqual([
      expect.objectContaining({ resource: 'Resources/XObject/Nested/Resources/Font/Diagram' }),
      expect.objectContaining({ resource: 'Resources/XObject/Second/Resources/Font/Diagram' }),
    ]);
  });

  it('reports rotated PDF page and crop geometry in physical points with custom UserUnit', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([144, 72]);
    page.setRotation(degrees(90));
    page.setCropBox(10, 5, 100, 50);
    page.node.set(PDFName.of('UserUnit'), pdf.context.obj(2));
    const issues = await lintDocument({ data: await pdf.save(), file: PDF, format: 'pdf', embeddedImages: false });
    expect(issues[0].data).toMatchObject({ widthPt: 288, heightPt: 144, rotation: 90, userUnit: 2, units: 'pt',
      mediaBox: { x: 0, y: 0, width: 288, height: 144 }, cropBox: { x: 20, y: 10, width: 200, height: 100 } });
  });

  it('reports PDF pages and opt-in images without font inventories', async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const image = await pdf.embedPng(PNG);
    for (const size of [[144, 72], [288, 144]]) {
      const page = pdf.addPage(size as [number, number]);
      page.drawText('Example', { x: 10, y: 20, font, size: 10 });
      page.drawImage(image, { x: 10, y: 40, width: 10, height: 10 });
    }
    const data = await pdf.save();
    const issues = await lintDocument({ data, file: PDF, format: 'pdf', embeddedImages: false });
    expect(issues.map(issue => issue.rule)).toEqual(['pdf-page', 'pdf-page']);
    expect(issues[0]).toMatchObject({ data: { widthPt: 144, heightPt: 72 }, locations: [{ type: 'pdf', page: 1, object: expect.stringMatching(/^\d+ 0 R$/) }] });
    const images = (await lintDocument({ data, file: PDF, format: 'pdf', embeddedImages: true })).filter(issue => issue.rule === 'pdf-embedded-image');
    expect(images).toEqual([expect.objectContaining({ severity: 'info', locations: [expect.objectContaining({ page: 1 }), expect.objectContaining({ page: 2 })] })]);
  });
});
