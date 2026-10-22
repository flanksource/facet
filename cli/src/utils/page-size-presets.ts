import { readFileSync } from 'node:fs';
import { assetPath } from './assets.js';

export interface PageSizePreset {
  group: string;
  label: string;
  width: number;
  height: number;
  unit: 'mm' | 'px';
}

export const PAGE_SIZE_PRESETS: Readonly<Record<string, PageSizePreset>> = JSON.parse(readFileSync(assetPath('page-sizes.json'), 'utf8'));

export function canonicalPageSize(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Page size must be a non-empty string');
  const name = value.trim().toLowerCase();
  if (Object.hasOwn(PAGE_SIZE_PRESETS, name)) return name;
  const custom = name.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if (custom && custom.slice(1).every(dimension => Number.isFinite(Number(dimension)) && Number(dimension) > 0)) {
    return `${Number(custom[1])}x${Number(custom[2])}`;
  }
  throw new Error(`Unknown or invalid page size: ${value}`);
}
