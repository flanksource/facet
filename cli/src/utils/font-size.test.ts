import { describe, expect, it } from 'vitest';
import { parseFontSize } from './font-size.js';

describe('parseFontSize', () => {
  it('accepts a point size, including fractional', () => {
    expect(parseFontSize(10)).toBe(10);
    expect(parseFontSize(9.5)).toBe(9.5);
    expect(parseFontSize('11')).toBe(11);
  });

  it('treats an absent value as no override', () => {
    expect(parseFontSize(undefined)).toBeUndefined();
    expect(parseFontSize(null)).toBeUndefined();
  });

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['NaN', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['absurdly large', 1001],
  ])('rejects a %s size rather than rendering something wrong', (_label, value) => {
    // Every one of these previously reached the stylesheet and was dropped by
    // the browser, so the PDF rendered at the default size with no diagnostic.
    expect(() => parseFontSize(value)).toThrow(/font size/i);
  });

  it('rejects a value that is not a number at all', () => {
    // The HTTP path used to cast straight to number, so a string like this
    // was interpolated into a <style> block verbatim.
    expect(() => parseFontSize('12pt}body{display:none}/*')).toThrow(/font size/i);
    expect(() => parseFontSize({})).toThrow(/font size/i);
    expect(() => parseFontSize(true)).toThrow(/font size/i);
  });
});
