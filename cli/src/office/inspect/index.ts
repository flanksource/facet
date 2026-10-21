import type { DocxInspection } from './types.js';
import { openDocx } from './package.js';
import { inspectSections } from './sections.js';
import { inspectAssets } from './assets.js';
import { inspectWordFonts } from './fonts.js';

export async function inspectDOCX(data: Uint8Array): Promise<DocxInspection> {
  const pkg = await openDocx(data);
  const { assets, fonts } = await inspectAssets(pkg);
  return { sections: inspectSections(pkg), assets, fonts: { word: inspectWordFonts(pkg), pdf: fonts } };
}
