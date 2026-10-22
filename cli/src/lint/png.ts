import type { LintIssue, Severity } from './types.js';
import { loadSharp } from '../utils/sharp.js';
import { findCrossings, type Raster } from './png-lines.js';

export const pngRules: { name: string; severity: Severity }[] = [
  { name: 'png-empty', severity: 'error' },
  { name: 'png-line-crossing', severity: 'warning' },
  { name: 'png-edge-content', severity: 'warning' },
];

function backgroundColour(data: Buffer, width: number, height: number): number[] {
  const colours = new Map<string, { count: number; colour: number[] }>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      const offset = (y * width + x) * 3;
      const colour = [data[offset], data[offset + 1], data[offset + 2]];
      const key = colour.map(channel => channel >> 4).join(',');
      const existing = colours.get(key);
      if (existing) existing.count++;
      else colours.set(key, { count: 1, colour });
    }
  }
  return [...colours.values()].sort((a, b) => b.count - a.count)[0].colour;
}

function raster(data: Buffer, width: number, height: number): Raster {
  const background = backgroundColour(data, width, height);
  const foreground = new Uint8Array(width * height);
  for (let i = 0; i < foreground.length; i++) {
    foreground[i] = background.some((channel, c) => Math.abs(data[i * 3 + c] - channel) > 24) ? 1 : 0;
  }
  return { width, height, foreground, pixels: data };
}

function edgeContent(image: Raster): { x: number; y: number } | undefined {
  const { width, height, foreground } = image;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && foreground[y * width + x]) {
        return { x, y };
      }
    }
  }
}

export async function lintPng(input: Buffer, file: string): Promise<LintIssue[]> {
  const sharp = await loadSharp();
  const decoder = sharp(input, { failOn: 'warning' });
  const metadata = await decoder.metadata();
  if (metadata.format !== 'png') throw new Error(`Expected PNG input: ${file}`);
  const { data, info } = await decoder.flatten({ background: '#ffffff' }).toColourspace('srgb')
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const image = raster(data, info.width, info.height);
  const location = { type: 'png' as const, units: 'px' as const, origin: 'top-left' as const, image: { width: info.width, height: info.height } };
  if (data.every((channel, index) => channel === data[index % 3])) {
    return [{ file, rule: 'png-empty', severity: 'error', message: 'PNG has no visible content (blank or uniform colour).',
      locations: [{ ...location, bounds: { x: 0, y: 0, width: info.width, height: info.height } }] }];
  }
  const issues: LintIssue[] = findCrossings(image).map(position => ({
    file, rule: 'png-line-crossing', severity: 'warning', locations: [{ ...location, ...position }],
    message: 'Possible overlapping lines: horizontal and vertical strokes cross. Check connector routing.',
  }));
  const edge = edgeContent(image);
  if (edge) issues.push({
    file, rule: 'png-edge-content', severity: 'warning', locations: [{ ...location, ...edge }],
    message: 'Content touches the image boundary; check for clipping or add capture padding.',
  });
  return issues;
}
