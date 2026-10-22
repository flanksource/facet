import type { GenerateOptions } from '../types.js';
import { matchesGlob } from 'node:path';
import { canonicalPageSize, PAGE_SIZE_PRESETS } from './page-size-presets.js';
import { DataLoader } from './data-loader.js';
import { Logger } from './logger.js';

export function expandRenderSizes(patterns: string[]): string[] {
  const sizes = new Set<string>();
  for (const input of patterns) {
    const pattern = input.trim().toLowerCase();
    if (!pattern) throw new Error('--sizes requires a non-empty size or glob');
    const matches = Object.keys(PAGE_SIZE_PRESETS).filter(name => matchesGlob(name, pattern)).sort();
    if (matches.length === 0) matches.push(canonicalPageSize(pattern));
    for (const name of matches) sizes.add(name);
  }
  return [...sizes];
}

export async function renderSizes({ sizes, options, render }: {
  sizes: string[];
  options: GenerateOptions;
  render: (options: GenerateOptions) => Promise<void>;
}): Promise<void> {
  if (sizes.length === 0) return render(options);
  const loadedData = await new DataLoader(new Logger(options.verbose)).load(options);
  for (const [index, size] of sizes.entries()) {
    const outputName = `${loadedData.outputName}-${size}`;
    try {
      await render({
        ...options,
        loadedData: { data: loadedData.data, outputName },
        outputName,
        pageSizeOverride: size,
        clearCache: index === 0 && options.clearCache,
        refresh: index === 0 && options.refresh,
      });
    } catch (error) {
      throw new Error(`${options.template} at ${size}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  }
}
