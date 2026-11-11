import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName, rgb } from 'pdf-lib';
import { inspectFile } from './inventory.js';
import { fixture } from './fixtures.test-utils.js';
import { loadSharp } from '../utils/sharp.js';

describe('native document inventory', () => {
  it('reports PNG font unavailability and alpha-aware palette positions', async () => {
    const sharp = await loadSharp();
    const data = await sharp(Buffer.from([255, 0, 0, 255, 0, 0, 255, 0]), { raw: { width: 2, height: 1, channels: 4 } }).png().toBuffer();
    const result = await inspectFile({ data, file: 'example.png', fontPosition: false, colorPositions: true });
    expect(result.fonts).toMatchObject({ status: 'unavailable', reason: expect.any(String) });
    expect(result.colors).toMatchObject({ approximate: true, entries: [{ rgba: [255, 0, 0, 255], pixels: 1, percentage: 100, locations: [{ type: 'png', bounds: { x: 0, y: 0, width: 1, height: 1 } }] }] });
  });

  it('omits disabled categories and rejects contradictory options', async () => {
    const zip = fixture('<w:p><w:r><w:rPr><w:rFonts w:ascii="Example"/><w:color w:val="FF0000"/></w:rPr></w:r></w:p>');
    const data = await zip.generateAsync({ type: 'uint8array' });
    expect(await inspectFile({ data, file: 'example.docx', fonts: false, colors: false })).not.toHaveProperty('fonts');
    await expect(inspectFile({ data, file: 'example.docx', fonts: false, fontPosition: true })).rejects.toThrow('font-position');
    const result = await inspectFile({ data, file: 'example.docx', colorPositions: true });
    expect(result.colors).toMatchObject({ entries: [expect.objectContaining({ value: '#ff0000', locations: [expect.objectContaining({ part: 'word/document.xml', elementPath: expect.stringContaining('/color[1]') })] })] });
    expect(result.fonts).toMatchObject({ status: 'available', entries: [expect.objectContaining({ name: 'Example' })] });
    expect(JSON.stringify(result.fonts)).not.toContain('locations');
  });

  it('reads painted PDF colors with page references', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([100, 100]).drawRectangle({ x: 10, y: 10, width: 50, height: 50, color: rgb(1, 0, 0) });
    const result = await inspectFile({ data: await pdf.save(), file: 'example.pdf', colorPositions: true });
    expect(result.colors).toMatchObject({ entries: expect.arrayContaining([expect.objectContaining({ value: '#ff0000', locations: [expect.objectContaining({ page: 1 })] })]) });
  });

  it('reads PDF gradients, tiling patterns and nested forms through the operator interpreter', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([100, 100]);
    const fn = pdf.context.obj({ FunctionType: 2, Domain: [0, 1], C0: [1, 0, 0], C1: [0, 0, 1], N: 1 });
    const shading = pdf.context.register(pdf.context.obj({ ShadingType: 2, ColorSpace: 'DeviceRGB', Coords: [0, 0, 100, 0], Function: fn, Extend: [true, true] }));
    const pattern = pdf.context.register(pdf.context.flateStream('0 1 0 rg 0 0 10 10 re f', { Type: 'Pattern', PatternType: 1, PaintType: 1, TilingType: 1, BBox: [0, 0, 10, 10], XStep: 10, YStep: 10, Resources: {} }));
    const form = pdf.context.register(pdf.context.flateStream('1 0 1 rg 0 0 10 10 re f', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 10, 10], Resources: {} }));
    page.node.set(PDFName.of('Resources'), pdf.context.obj({ Shading: { Gradient: shading }, Pattern: { Tiles: pattern }, XObject: { Nested: form } }));
    page.node.addContentStream(pdf.context.register(pdf.context.flateStream('/Gradient sh q /Pattern cs /Tiles scn 0 0 20 20 re f Q /Nested Do')));
    const result = await inspectFile({ data: await pdf.save(), file: 'example.pdf', colorPositions: true });
    expect(result.colors).toMatchObject({ entries: expect.arrayContaining(['#ff0000', '#0000ff', '#00ff00', '#ff00ff'].map(value => expect.objectContaining({ value }))) });
  });

  it('skips malformed font resources when linting or font collection is disabled', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([100, 100]);
    page.node.set(PDFName.of('Resources'), pdf.context.obj({ Font: { Invalid: { Subtype: 'Type1' } } }));
    const data = await pdf.save();
    await expect(inspectFile({ data, file: 'example.pdf', fonts: false, colors: false })).resolves.not.toHaveProperty('fonts');
    await expect(inspectFile({ data, file: 'example.pdf', colors: false })).rejects.toThrow('invalid PDF');
  });

  it('limits a PNG palette to 32 groups while retaining translucent pixels and full-resolution bounds', async () => {
    const sharp = await loadSharp();
    const pixels = Buffer.alloc(256 * 4);
    for (let x = 0; x < 256; x++) { pixels[x * 4] = x; pixels[x * 4 + 1] = 255 - x; pixels[x * 4 + 3] = 128; }
    const data = await sharp(pixels, { raw: { width: 256, height: 1, channels: 4 } }).png().toBuffer();
    const result = await inspectFile({ data, file: 'palette.png', colorPositions: true });
    const colors = result.colors as { entries: { pixels: number; rgba: number[]; locations: { bounds: { x: number; width: number } }[] }[] };
    expect(colors.entries).toHaveLength(32);
    expect(colors.entries.reduce((total, entry) => total + entry.pixels, 0)).toBe(256);
    expect(colors.entries.every(entry => entry.rgba[3] > 0 && entry.rgba[3] < 255)).toBe(true);
    expect(Math.max(...colors.entries.map(entry => entry.locations[0].bounds.x + entry.locations[0].bounds.width))).toBe(256);
  });
});
