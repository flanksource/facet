import { describe, expect, it } from 'vitest';
import { inspectDOCX as inspectDocument } from './index.js';
import { fixture, oleFixture, pdfFixture, PNG, relations } from './fixtures.test-utils.js';
import { PDFDocument, PDFName } from 'pdf-lib';
import sharp from 'sharp';
import { encodePdfEmf } from '../office/emf/encode.js';

const inspectDOCX = (data: Uint8Array) => inspectDocument({ data, embeddedImages: true });

describe('read-only DOCX inspection', () => {
  it('finds the original PDF and its fonts inside EMF image media', async () => {
    const pdf = await pdfFixture();
    const png = await sharp({ create: { width: 192, height: 96, channels: 4, background: '#123456' } }).png().toBuffer();
    const zip = fixture('<w:p><w:r><w:drawing><wp:extent cx="1828800" cy="914400"/><a:blip r:embed="diagram"/></w:drawing></w:r></w:p>');
    zip.file('word/media/diagram.emf', await encodePdfEmf({ pdf, png, width: 192, height: 96 }));
    zip.file('word/_rels/document.xml.rels', relations([{ id: 'diagram', type: 'image', target: 'media/diagram.emf' }]));
    const result = await inspectDOCX(await zip.generateAsync({ type: 'uint8array' }));
    expect(result.assets[0]).toMatchObject({ path: 'word/media/diagram.emf', format: 'PDF', payloadBytes: pdf.length,
      pdf: { pages: [{ widthMm: 50.8, heightMm: 25.4 }] },
      uses: [{ role: 'body', kind: 'image', dimensions: { widthMm: 50.8, heightMm: 25.4 } }] });
    expect(result.fonts.pdf.map((font) => [font.asset, font.name, font.embedded])).toEqual([
      ['word/media/diagram.emf', 'ABCDEF+DiagramFace', true], ['word/media/diagram.emf', 'Helvetica', false],
    ]);
  });

  it('reports the affected part when EMF record bounds are invalid', async () => {
    const bytes = Buffer.alloc(88);
    bytes.writeUInt32LE(0x464d4520, 40);
    const zip = fixture('<w:p/>');
    zip.file('word/media/broken.emf', bytes);
    await expect(inspectDOCX(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow(/word\/media\/broken.emf.*EMF/);
  });

  it('reports section settings in millimetres without inventing a physical page count', async () => {
    const zip = fixture(`<w:p><w:pPr><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="720" w:bottom="1440" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:pPr></w:p>
      <w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:left="1440"/></w:sectPr>`);
    const result = await inspectDOCX(await zip.generateAsync({ type: 'uint8array' }));
    expect(result.sections).toEqual([
      { index: 1, elementPath: '/document[1]/body[1]/p[1]/pPr[1]/sectPr[1]', size: { widthMm: 210.009, heightMm: 297.004 }, orientation: null,
        margins: { topMm: 25.4, rightMm: 12.7, bottomMm: 25.4, leftMm: 12.7, headerMm: 6.35, footerMm: 6.35, gutterMm: 0 } },
      { index: 2, elementPath: '/document[1]/body[1]/sectPr[1]', size: { widthMm: 279.4, heightMm: 215.9 }, orientation: 'landscape',
        margins: { topMm: null, rightMm: null, bottomMm: null, leftMm: 25.4, headerMm: null, footerMm: null, gutterMm: null } },
    ]);
    expect(result).not.toHaveProperty('pages');
  });

  it('inventories shared images, PDF OLE objects and raw PDFs with their placements and previews', async () => {
    const zip = fixture(`<w:p><w:r><w:drawing><wp:extent cx="914400" cy="457200"/><a:blip r:embed="picture"/></w:drawing></w:r></w:p>
      <w:p><w:r><w:object><v:shape id="diagram" style="width:144pt;height:72pt"><v:imagedata r:id="picture"/></v:shape><o:OLEObject r:id="diagram" ShapeID="diagram" ProgID="AcroExch.Document.7"/></w:object></w:r></w:p><w:sectPr/>`);
    zip.file('word/_rels/document.xml.rels', relations([
      { id: 'picture', type: 'image', target: 'media/shared%20image.png' },
      { id: 'diagram', type: 'oleObject', target: 'embeddings/diagram.bin' },
      { id: 'header', type: 'header', target: 'header1.xml' },
      { id: 'reference', type: 'hyperlink', target: 'https://example.com', external: true },
    ]));
    zip.file('word/header1.xml', '<header xmlns:r="urn:relationship"><drawing><extent cx="457200" cy="457200"/><blip r:embed="shared"/></drawing></header>');
    zip.file('word/_rels/header1.xml.rels', relations([{ id: 'shared', type: 'image', target: '/word/media/shared%20image.png' }]));
    zip.file('word/media/shared image.png', PNG);
    const pdf = await pdfFixture();
    zip.file('word/embeddings/diagram.bin', oleFixture(pdf));
    zip.file('word/embeddings/direct.pdf', pdf);
    const result = await inspectDOCX(await zip.generateAsync({ type: 'uint8array' }));
    expect(result.assets.map((asset) => [asset.path, asset.format])).toEqual([
      ['word/embeddings/diagram.bin', 'PDF'], ['word/embeddings/direct.pdf', 'PDF'], ['word/media/shared image.png', 'PNG'],
    ]);
    const diagram = result.assets[0];
    expect(diagram.payloadBytes).toBe(pdf.length);
    expect(diagram.pdf?.pages).toEqual([{ widthMm: 50.8, heightMm: 25.4 }]);
    expect(diagram.uses).toEqual([{ part: 'word/document.xml', elementPath: '/document[1]/body[1]/p[2]/r[1]/object[1]/OLEObject[1]', relationshipId: 'diagram', role: 'body', kind: 'object', dimensions: { widthMm: 50.8, heightMm: 25.4 }, preview: 'word/media/shared image.png' }]);
    expect(result.assets[2].previewFor).toEqual(['word/embeddings/diagram.bin']);
    expect(result.assets[2].uses).toHaveLength(3);
    expect(result.assets[2].uses.some((use) => use.role === 'header')).toBe(true);
    expect(result.fonts.pdf.filter((font) => font.asset === diagram.path).map(({ locations: _locations, ...font }) => font)).toEqual([
      { asset: diagram.path, name: 'ABCDEF+DiagramFace', type: 'Type0', embedded: true, subset: true, pages: [1] },
      { asset: diagram.path, name: 'Helvetica', type: 'Type1', embedded: false, subset: false, pages: [1] },
    ]);
  });

  it('collects style and run font references, resolves theme mappings, and lists embedded variants', async () => {
    const zip = fixture('<w:p><w:r><w:rPr><w:rFonts w:ascii="Body Face" w:hAnsiTheme="minorHAnsi"/></w:rPr><w:t>Text</w:t></w:r></w:p>');
    zip.file('word/styles.xml', '<styles><docDefaults><rPrDefault><rPr><rFonts ascii="Default Face"/></rPr></rPrDefault></docDefaults><style><rPr><rFonts ascii="Heading Face"/></rPr></style></styles>');
    zip.file('word/theme/theme1.xml', '<theme><themeElements><fontScheme><majorFont><latin typeface="Heading Theme"/></majorFont><minorFont><latin typeface="Body Theme"/><ea typeface=""/></minorFont></fontScheme></themeElements></theme>');
    zip.file('word/_rels/document.xml.rels', relations([
      { id: 'styles', type: 'styles', target: 'styles.xml' }, { id: 'fonts', type: 'fontTable', target: 'fontTable.xml' },
      { id: 'theme', type: 'theme', target: 'theme/theme1.xml' },
    ]));
    zip.file('word/fontTable.xml', '<fonts xmlns:r="urn:relationship"><font name="Body Face"><embedRegular r:id="font"/></font></fonts>');
    zip.file('word/_rels/fontTable.xml.rels', relations([{ id: 'font', type: 'font', target: 'fonts/body.odttf' }]));
    zip.file('word/fonts/body.odttf', 'font-metadata-fixture');
    const result = await inspectDOCX(await zip.generateAsync({ type: 'uint8array' }));
    expect(result.fonts.word.map((font) => font.name)).toEqual(['Body Face', 'Body Theme', 'Default Face', 'Heading Face', 'Heading Theme']);
    expect(result.fonts.word[0].embedded).toEqual([{ part: 'word/fonts/body.odttf', variant: 'regular' }]);
    expect(result.fonts.word.find((font) => font.name === 'Body Theme')?.sources).toContain('word/document.xml');
  });

  it('finds run fonts when the font table is empty', async () => {
    const zip = fixture('<w:p><w:r><w:rPr><w:rFonts w:ascii="Body Face"/></w:rPr><w:t>Text</w:t></w:r></w:p>');
    zip.file('word/fontTable.xml', '<fonts/>');
    zip.file('word/_rels/document.xml.rels', relations([{ id: 'fonts', type: 'fontTable', target: 'fontTable.xml' }]));
    expect((await inspectDOCX(await zip.generateAsync({ type: 'uint8array' }))).fonts.word).toEqual([
      { name: 'Body Face', kind: 'font', sources: ['word/document.xml'], embedded: [], locations: [{ part: 'word/document.xml', elementPath: '/document[1]/body[1]/p[1]/r[1]/rPr[1]/rFonts[1]' }] },
    ]);
  });

  it('does not count historical section settings stored in tracked changes', async () => {
    const zip = fixture('<w:sectPr><w:pgSz w:w="1440" w:h="2880"/><w:sectPrChange><w:sectPr><w:pgSz w:w="2880" w:h="1440"/></w:sectPr></w:sectPrChange></w:sectPr>');
    expect((await inspectDOCX(await zip.generateAsync({ type: 'uint8array' }))).sections.map((section) => section.size)).toEqual([{ widthMm: 25.4, heightMm: 50.8 }]);
  });

  it('resolves complex-script font theme references and retains unresolved theme references explicitly', async () => {
    const zip = fixture('<w:p><w:r><w:rPr><w:rFonts w:cstheme="minorBidi" w:eastAsiaTheme="minorEastAsia"/></w:rPr></w:r></w:p>');
    zip.file('word/_rels/document.xml.rels', relations([{ id: 'theme', type: 'theme', target: 'theme/theme1.xml' }]));
    zip.file('word/theme/theme1.xml', '<theme><minorFont><cs typeface="Complex Face"/><ea typeface=""/></minorFont></theme>');
    const fonts = (await inspectDOCX(await zip.generateAsync({ type: 'uint8array' }))).fonts.word;
    expect(fonts.find((font) => font.name === 'Complex Face')?.sources).toContain('word/document.xml');
    expect(fonts.find((font) => font.name === 'minorEastAsia')).toEqual({ name: 'minorEastAsia', kind: 'theme', sources: ['word/document.xml'], embedded: [], locations: [{ part: 'word/document.xml', elementPath: '/document[1]/body[1]/p[1]/r[1]/rPr[1]/rFonts[1]' }] });
  });

  it('reports Type3 fonts whose glyph programs are embedded rather than stored in FontFile streams', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([72, 72]);
    page.node.set(PDFName.of('Resources'), pdf.context.obj({ Font: { Symbols: pdf.context.obj({ Type: 'Font', Subtype: 'Type3', Name: 'DiagramSymbols', CharProcs: { Glyph: pdf.context.register(pdf.context.flateStream('')) } }) } }));
    const zip = fixture('<w:p/>');
    zip.file('word/embeddings/symbols.pdf', await pdf.save());
    expect((await inspectDOCX(await zip.generateAsync({ type: 'uint8array' }))).fonts.pdf.map(({ locations: _locations, ...font }) => font)).toEqual([
      { asset: 'word/embeddings/symbols.pdf', name: 'DiagramSymbols', type: 'Type3', embedded: true, subset: false, pages: [1] },
    ]);
  });

  it.each([
    { name: 'missing referenced asset', part: 'word/_rels/document.xml.rels', data: relations([{ id: 'lost', type: 'image', target: 'media/missing.png' }]), error: /missing.*word\/media\/missing\.png/i },
    { name: 'invalid XML', part: 'word/document.xml', data: '<document><broken></document>', error: /word\/document\.xml.*XML/i },
    { name: 'invalid embedded PDF', part: 'word/embeddings/broken.pdf', data: '%PDF-invalid', error: /word\/embeddings\/broken\.pdf/ },
    { name: 'invalid OLE object', part: 'word/embeddings/broken.bin', data: 'invalid OLE', error: /word\/embeddings\/broken\.bin/ },
  ])('rejects $name with the affected part', async ({ part, data, error }) => {
    const zip = fixture('<w:p/>');
    zip.file(part, data);
    await expect(inspectDOCX(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow(error);
  });

  it('rejects non-DOCX files and corrupt ZIP input', async () => {
    await expect(inspectDOCX(Buffer.from('plain text'))).rejects.toThrow(/ZIP|DOCX/i);
    const zip = fixture('<w:p/>');
    zip.remove('word/document.xml');
    await expect(inspectDOCX(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow(/word\/document\.xml/);
  });
});
