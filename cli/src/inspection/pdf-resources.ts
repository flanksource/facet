import { PDFArray, PDFBool, PDFDict, PDFName, PDFNumber, PDFRef, PDFStream, StandardFonts } from 'pdf-lib';
import type { PdfFont, PdfImage, PdfReference } from './types.js';

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

export interface PdfResources {
  fonts: Map<PDFDict, PdfFont>;
  images: Map<PDFStream, PdfImage>;
}

export function inspectPdfResources(options: {
  resources: PDFDict | undefined; page: number; asset: string; embeddedImages: boolean; fonts?: boolean;
}, result: PdfResources): void {
  const active = new Set<PDFDict>();
  const visit = (resources: PDFDict | undefined, path: string): void => {
    if (!resources || active.has(resources)) return;
    active.add(resources);
    for (const [resource, ref] of options.fonts === false ? [] : resources.lookupMaybe(PDFName.of('Font'), PDFDict)?.entries() ?? []) {
      const dict = resources.context.lookup(ref, PDFDict);
      const name = resource.decodeText();
      const font = result.fonts.get(dict) ?? { asset: options.asset, ...fontInfo(dict, name), pages: [], locations: [] };
      if (!font.pages.includes(options.page)) font.pages.push(options.page);
      font.locations.push({ page: options.page, ...(ref instanceof PDFRef ? { object: ref.toString() } : {}), resource: `${path}/Font/${name}` });
      result.fonts.set(dict, font);
    }
    for (const [resource, ref] of resources.lookupMaybe(PDFName.of('XObject'), PDFDict)?.entries() ?? []) {
      const stream = resources.context.lookup(ref, PDFStream);
      const subtype = stream.dict.lookupMaybe(PDFName.of('Subtype'), PDFName)?.decodeText();
      const location: PdfReference = { page: options.page, ...(ref instanceof PDFRef ? { object: ref.toString() } : {}), resource: `${path}/XObject/${resource.decodeText()}` };
      if (subtype === 'Form') visit(stream.dict.lookupMaybe(PDFName.of('Resources'), PDFDict), `${location.resource}/Resources`);
      if (subtype === 'Image' && options.embeddedImages) {
        const image = result.images.get(stream) ?? {
          width: stream.dict.lookup(PDFName.of('Width'), PDFNumber).asNumber(),
          height: stream.dict.lookup(PDFName.of('Height'), PDFNumber).asNumber(),
          bytes: stream.getContents().length,
          bitsPerComponent: stream.dict.lookupMaybe(PDFName.of('BitsPerComponent'), PDFNumber)?.asNumber(),
          imageMask: stream.dict.lookupMaybe(PDFName.of('ImageMask'), PDFBool)?.asBoolean() ?? false,
          locations: [],
        };
        if (image.width <= 0 || image.height <= 0) throw new Error(`${location.resource}: invalid PDF image dimensions`);
        image.locations.push(location);
        result.images.set(stream, image);
      }
    }
    active.delete(resources);
  };
  visit(options.resources, 'Resources');
}
