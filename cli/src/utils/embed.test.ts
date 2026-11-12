import { describe, expect, it } from 'vitest';
import { parseEmbedFormat, parseEmbedSize, resolveEmbed } from './embed.js';

describe('parseEmbedFormat', () => {
  it.each(['pdf', 'png'] as const)('accepts %s', (value) => expect(parseEmbedFormat(value)).toBe(value));
  it('leaves an omitted format undefined', () => expect(parseEmbedFormat(undefined)).toBeUndefined());
  it.each(['svg', 'PDF', '', 2])('rejects %j', (value) => expect(() => parseEmbedFormat(value)).toThrow(/Invalid embed format/));
});

describe('parseEmbedSize', () => {
  it.each([['1x', 1], ['2X', 2], ['3', 3], [4, 4], [' 2x ', 2]] as const)('parses %j as %d', (value, expected) => expect(parseEmbedSize(value)).toBe(expected));
  it.each(['0x', '5x', '1.5x', 'x', '', 0, 2.5, 'big'])('rejects %j', (value) => expect(() => parseEmbedSize(value)).toThrow(/Invalid embed size/));
});

describe('resolveEmbed', () => {
  it.each([['pdf', 'pdf'], ['docx', 'pdf'], ['pptx', 'png']] as const)('defaults %s to %s at 2x', (target, format) => {
    expect(resolveEmbed({ target })).toEqual({ format, size: 2 });
  });
  it('keeps explicit choices', () => expect(resolveEmbed({ target: 'pptx', format: 'pdf', size: 4 })).toEqual({ format: 'pdf', size: 4 }));
  it('rejects a size on a vector PDF export', () => {
    expect(() => resolveEmbed({ target: 'pdf', format: 'pdf', size: 3 })).toThrow(/--embed-size 3x has no effect/);
    expect(() => resolveEmbed({ target: 'pdf', size: 3 })).toThrow(/--embed-size/);
  });
  it('accepts a size for a rasterized PDF export', () => expect(resolveEmbed({ target: 'pdf', format: 'png', size: 3 })).toEqual({ format: 'png', size: 3 }));
});
