import type PptxGenJS from 'pptxgenjs-plus';
import type { Box, TextStyle } from '../model.js';

export function drawDecoration({ slide, style, source, x, y, width, height }: Box & {
  slide: PptxGenJS.PresSlide; style: TextStyle; source: string;
}): void {
  if (style.fill) slide.addShape('rect', {
    x: x / 96, y: y / 96, w: width / 96, h: height / 96,
    fill: { color: style.fill }, line: { transparency: 100 },
  });
  const sides = {
    top: { x, y, w: width, h: 0 }, right: { x: x + width, y, w: 0, h: height },
    bottom: { x, y: y + height, w: width, h: 0 }, left: { x, y, w: 0, h: height },
  };
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const edge = style.borders?.[side] ?? { color: style.border, width: style.borderWidth, style: 'solid' };
    if (!edge.width || edge.style === 'none' || edge.style === 'hidden') continue;
    if (!['solid', 'dashed', 'dotted'].includes(edge.style)) throw new Error(`Unsupported PowerPoint border style ${edge.style}: ${source}`);
    const bounds = sides[side];
    slide.addShape('line', {
      x: bounds.x / 96, y: bounds.y / 96, w: bounds.w / 96, h: bounds.h / 96,
      line: { color: edge.color ?? '000000', width: edge.width * 0.75,
        dashType: edge.style === 'dashed' ? 'dash' : edge.style === 'dotted' ? 'sysDot' : 'solid' },
    });
  }
}
