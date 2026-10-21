import { PDFArray, PDFDict, PDFDocument, PDFName, PDFStream, StandardFonts } from 'pdf-lib';
import type { Dimensions, PdfFont } from './types.js';
import { mm } from './xml.js';

function fontInfo(font: PDFDict, resource: string): Pick<PdfFont, 'name' | 'type' | 'embedded' | 'subset'> {
  const type = font.lookup(PDFName.of('Subtype'), PDFName).decodeText();
  const name = type === 'Type3'
    ? font.lookupMaybe(PDFName.of('Name'), PDFName)?.decodeText() ?? `(Type3 resource ${resource})`
    : font.lookup(PDFName.of('BaseFont'), PDFName).decodeText();
  if (type === 'Type3') return { name, type, embedded: font.lookupMaybe(PDFName.of('CharProcs'), PDFDict) ? true : null, subset: false };
  const descendants = font.lookupMaybe(PDFName.of('DescendantFonts'), PDFArray);
  const descriptor = (descendants?.lookup(0, PDFDict) ?? font).lookupMaybe(PDFName.of('FontDescriptor'), PDFDict);
  const embedded = descriptor ? ['FontFile', 'FontFile2', 'FontFile3'].some((key) => {
    const value = descriptor.get(PDFName.of(key));
    if (value === undefined) return false;
    descriptor.context.lookup(value, PDFStream);
    return true;
  }) : Object.values(StandardFonts).some((standard) => standard === name) ? false : null;
  return { name, type, embedded, subset: /^[A-Z]{6}\+/.test(name) };
}

export async function inspectPdf(options: { data: Uint8Array; asset: string }): Promise<{ pages: Dimensions[]; fonts: PdfFont[] }> {
  try {
    const pdf = await PDFDocument.load(options.data);
    const fonts = new Map<string, PdfFont>();
    const pages = pdf.getPages().map((page, index) => {
      const seen = new Set<PDFDict>();
      const visit = (resources: PDFDict | undefined): void => {
        if (!resources || seen.has(resources)) return;
        seen.add(resources);
        const entries = resources.lookupMaybe(PDFName.of('Font'), PDFDict);
        for (const [resource, ref] of entries?.entries() ?? []) {
          const info = fontInfo(resources.context.lookup(ref, PDFDict), resource.decodeText());
          const key = JSON.stringify(info);
          const font = fonts.get(key) ?? { asset: options.asset, ...info, pages: [] };
          if (!font.pages.includes(index + 1)) font.pages.push(index + 1);
          fonts.set(key, font);
        }
        const objects = resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
        for (const [, ref] of objects?.entries() ?? []) {
          const stream = resources.context.lookup(ref, PDFStream);
          if (stream.dict.lookupMaybe(PDFName.of('Subtype'), PDFName)?.decodeText() === 'Form') visit(stream.dict.lookupMaybe(PDFName.of('Resources'), PDFDict));
        }
      };
      visit(page.node.Resources());
      return { widthMm: mm(page.getWidth() * 25.4 / 72), heightMm: mm(page.getHeight() * 25.4 / 72) };
    });
    return { pages, fonts: [...fonts.values()].sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type)) };
  } catch (cause) {
    throw new Error(`${options.asset}: invalid embedded PDF: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}
