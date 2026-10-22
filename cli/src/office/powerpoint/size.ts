import { PAGE_SIZE_PRESETS } from '../../utils/page-size-presets.js';

export function presentationSize(pages: { size: string }[]): { width: number; height: number; inchesWidth: number; inchesHeight: number } {
  const names = new Set(pages.map((page) => page.size.toLowerCase()).filter((name) => PAGE_SIZE_PRESETS[name]?.group === 'PowerPoint'));
  if (names.size > 1) throw new Error(`Conflicting PowerPoint page sizes: ${[...names].join(', ')}. Use one size per presentation.`);
  const preset = PAGE_SIZE_PRESETS[[...names][0] ?? 'powerpoint-wide'];
  return { width: preset.width, height: preset.height, inchesWidth: preset.width / 96, inchesHeight: preset.height / 96 };
}
