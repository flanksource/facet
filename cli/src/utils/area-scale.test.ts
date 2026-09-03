import { describe, expect, it } from 'vitest';
import { PAGE_SIZES, areaScale, resolvePageSize, scaledHeight } from './pdf-multipass.js';

describe('areaScale', () => {
  it('is exactly 1 at the A4 reference', () => {
    expect(areaScale(PAGE_SIZES.a4)).toBe(1);
  });

  it('is orientation-independent, because it measures area not height', () => {
    expect(areaScale(PAGE_SIZES['a3-landscape'])).toBeCloseTo(areaScale(PAGE_SIZES.a3), 10);
  });

  it.each([
    // sqrt(area / (210*297)), computed independently of the implementation.
    ['a3', Math.SQRT2],
    ['letter', Math.sqrt((215.9 * 279.4) / 62370)],
    ['4k', Math.sqrt((1016 * 571.5) / 62370)],
  ])('scales %s by the square root of its area ratio', (name, expected) => {
    // The only existing assertion tested A4, where areaScale is 1 by
    // construction and scaledHeight is the identity — it could not fail.
    expect(areaScale(PAGE_SIZES[name])).toBeCloseTo(expected, 6);
  });

  it('applies to a custom WxH page size', () => {
    // Twice A4's linear dimensions is four times the area, so 2x the scale.
    expect(areaScale(resolvePageSize('420x594'))).toBeCloseTo(2, 10);
  });
});

describe('scaledHeight', () => {
  it('grows a header band with the page and rounds up to whole mm', () => {
    expect(scaledHeight(20, areaScale(PAGE_SIZES.a3))).toBe(29); // 20 * 1.414 = 28.3
  });

  it('leaves A4 untouched', () => {
    expect(scaledHeight(20, areaScale(PAGE_SIZES.a4))).toBe(20);
  });

  it('scales chrome far beyond the type inside it at display sizes', () => {
    // Documented, not endorsed: `areaScale` is applied to header/footer heights
    // only, so a 20mm band becomes 62mm at 4k while its text stays put.
    expect(scaledHeight(20, areaScale(PAGE_SIZES['4k']))).toBe(62);
  });
});
