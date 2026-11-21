import { describe, expect, it } from 'vitest';
import { resolvePageSize } from './pdf-multipass.js';

describe('platform page sizes', () => {
  it.each([
    ['powerpoint-wide', 1280, 720],
    ['powerpoint-standard', 960, 720],
    ['facebook-cover', 851, 315],
    ['linkedin-company-cover', 1512, 256],
    ['reddit-banner-mobile', 1080, 128],
    ['google-ads-300x250', 300, 250],
    ['google-ads-970x250', 970, 250],
  ])('converts %s from CSS pixels to millimetres without rounding', (name, width, height) => {
    expect(resolvePageSize(name)).toEqual({ width: width * 25.4 / 96, height: height * 25.4 / 96 });
  });

  it('preserves case-insensitive presets and custom millimetre sizes', () => {
    expect(resolvePageSize('POWERPOINT-STANDARD')).toEqual({ width: 254, height: 190.5 });
    expect(resolvePageSize('297x210')).toEqual({ width: 297, height: 210 });
  });
});
