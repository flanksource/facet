import presets from '../types/page-sizes.json';

export interface PageSizePreset {
  group: string;
  label: string;
  width: number;
  height: number;
  unit: 'mm' | 'px';
}

export const PAGE_SIZE_PRESETS: Readonly<Record<string, PageSizePreset>> = presets as Record<string, PageSizePreset>;
