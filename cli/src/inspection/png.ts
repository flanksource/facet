import { loadSharp } from '../utils/sharp.js';
import type { ColorInventory } from './colors.js';
import { groupPalette, type PixelGroup } from './palette.js';

export async function inspectPng(options: { data: Uint8Array; colors: boolean; positions: boolean }): Promise<{ width: number; height: number; colors?: ColorInventory }> {
  const sharp = await loadSharp();
  const input = sharp(options.data, { failOn: 'warning' });
  const metadata = await input.metadata();
  if (metadata.format !== 'png' || !metadata.width || !metadata.height) throw new Error('Expected a PNG image with valid dimensions');
  if (!options.colors) return { width: metadata.width, height: metadata.height };
  const { data, info } = await input.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const groups = new Map<string, PixelGroup>();
  let visible = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (!data[offset + 3]) continue;
    visible++;
    const rgba = [...data.subarray(offset, offset + 4)];
    const key = rgba.join(',');
    const x = (offset / 4) % info.width;
    const y = Math.floor(offset / 4 / info.width);
    const group = groups.get(key) ?? { rgba, pixels: 0, minX: x, minY: y, maxX: x, maxY: y };
    group.pixels++;
    group.minX = Math.min(group.minX, x); group.maxX = Math.max(group.maxX, x);
    group.minY = Math.min(group.minY, y); group.maxY = Math.max(group.maxY, y);
    groups.set(key, group);
  }
  return { width: info.width, height: info.height, colors: { space: 'sRGB', approximate: true, limit: 32,
    entries: groupPalette([...groups.values()], 32).sort((a, b) => b.pixels - a.pixels || a.rgba.join(',').localeCompare(b.rgba.join(','))).map(group => ({
      rgba: group.rgba, pixels: group.pixels, percentage: group.pixels * 100 / visible,
      ...(options.positions ? { locations: [{ type: 'png' as const, bounds: { x: group.minX, y: group.minY, width: group.maxX - group.minX + 1, height: group.maxY - group.minY + 1 } }] } : {}),
    })) } };
}
