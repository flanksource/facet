import { describe, expect, it, vi } from 'vitest';
import { fileURLToPath } from 'node:url';
import { DataLoader } from './data-loader.js';
import { expandRenderSizes, renderSizes } from './render-sizes.js';
import type { GenerateOptions } from '../types.js';
import { Logger } from './logger.js';

const options: GenerateOptions = {
  template: 'Campaign.tsx', outputDir: 'out', outputNameField: 'name', validate: true, verbose: false,
};

describe('render size selection', () => {
  it('expands quoted globs in argument order and deduplicates overlaps', () => {
    expect(expandRenderSizes(['GOOGLE-ADS-3?0X?0', 'google-ads-320x50', 'facebook-square', '100.0x200']))
      .toEqual(['google-ads-300x50', 'google-ads-320x50', 'facebook-square', '100x200']);
  });

  it.each(['', ' ', 'unknown-*', 'facebok-square', '0x200', '-20x30', 'Infinityx200'])('rejects invalid selection %j', (pattern) => {
    expect(() => expandRenderSizes([pattern])).toThrow();
  });

  it('appends each size to the resolved data-derived basename and loads data once', async () => {
    const load = vi.spyOn(DataLoader.prototype, 'load').mockResolvedValue({ data: { name: 'Autumn sale' }, outputName: 'Autumn-sale' });
    const render = vi.fn<(_: GenerateOptions) => Promise<void>>().mockResolvedValue(undefined);
    try {
      await renderSizes({ sizes: ['facebook-square', 'reddit-banner'], options, render });
      expect(load).toHaveBeenCalledTimes(1);
      expect(render.mock.calls.map(([variant]) => [variant.outputName, variant.pageSizeOverride, variant.loadedData?.data]))
        .toEqual([
          ['Autumn-sale-facebook-square', 'facebook-square', { name: 'Autumn sale' }],
          ['Autumn-sale-reddit-banner', 'reddit-banner', { name: 'Autumn sale' }],
        ]);
    } finally { load.mockRestore(); }
  });

  it('preserves the ordinary render when no sizes are supplied', async () => {
    const render = vi.fn<(_: GenerateOptions) => Promise<void>>().mockResolvedValue(undefined);
    await renderSizes({ sizes: [], options, render });
    expect(render.mock.calls).toEqual([[options]]);
  });

  it('reuses loaded data when downstream renderers load each variant', async () => {
    const names: unknown[] = [];
    await renderSizes({ sizes: ['facebook-square', 'reddit-banner'], options: {
      ...options, dataLoader: fileURLToPath(new URL('../../test/fixtures/multi-size/data.mjs', import.meta.url)),
    }, render: async (variant) => {
      names.push((await new DataLoader(new Logger(false)).load(variant)).data.name);
    } });
    expect(names).toEqual(['Campaign-1', 'Campaign-1']);
  });

  it.each([[undefined, 'Campaign'], ['custom.name', 'custom.name']])('appends a single size after basename resolution (%s)', async (outputName, expected) => {
    const render = vi.fn<(_: GenerateOptions) => Promise<void>>().mockResolvedValue(undefined);
    await renderSizes({ sizes: ['facebook-square'], options: { ...options, outputName }, render });
    expect(render.mock.calls.map(([variant]) => variant.outputName)).toEqual([`${expected}-facebook-square`]);
  });

  it('stops after the first failed variant and identifies its template and size', async () => {
    const load = vi.spyOn(DataLoader.prototype, 'load').mockResolvedValue({ data: {}, outputName: 'campaign' });
    const render = vi.fn<(_: GenerateOptions) => Promise<void>>().mockRejectedValue(new Error('Browser failed'));
    try {
      await expect(renderSizes({ sizes: ['facebook-square', 'reddit-banner'], options, render }))
        .rejects.toThrow('Campaign.tsx at facebook-square: Browser failed');
      expect(render).toHaveBeenCalledTimes(1);
    } finally { load.mockRestore(); }
  });
});
