import type { DocxInspection } from './types.js';
import { openDocx } from './package.js';
import { inspectSections } from './sections.js';
import { inspectAssets } from './assets.js';
import { inspectWordFonts } from './fonts.js';
import { inspectReferences } from './uses.js';

export async function inspectDOCX(options: { data: Uint8Array; embeddedImages: boolean; fonts?: boolean; colors?: boolean; colorPositions?: boolean }): Promise<DocxInspection> {
  const { data, embeddedImages } = options;
  const pkg = await openDocx(data);
  inspectReferences(pkg);
  const media = embeddedImages ? await inspectAssets(pkg, options) : { assets: [], fonts: [] };
  return { part: pkg.main, sections: inspectSections(pkg), assets: media.assets, fonts: { word: options.fonts === false ? [] : inspectWordFonts(pkg), pdf: media.fonts } };
}
