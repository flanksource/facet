/**
 * The `--debug-typography` overlay reports an element as drifted when its
 * computed size differs from what the type scale says it should be. Deciding
 * "should be" from the tag name alone made it cry wolf: a `<p class="text-xs">`
 * is 7pt on purpose, and the overlay flagged every one of them against the 9pt
 * `p` default — including the explanatory paragraphs in the typography example
 * the flag exists to inspect.
 */
import { describe, expect, it } from 'vitest';
import { expectedFontPoints, hasSpecificFontSizeSelector } from './debug-annotations.js';
import { ELEMENT_SCALE, TEXT_SCALE } from './type-scale.js';

const probe = (tagName: string, classNames: string[] = [], hasInlineFontSize = false) =>
  ({ tagName, classNames, hasInlineFontSize });

describe('expectedFontPoints', () => {
  it.each([
    ['H1', ELEMENT_SCALE.h1.pt],
    ['H2', ELEMENT_SCALE.h2.pt],
    ['H3', ELEMENT_SCALE.h3.pt],
    ['H4', ELEMENT_SCALE.h4.pt],
    ['P', ELEMENT_SCALE.p.pt],
  ])('takes %s from the element scale when nothing overrides it', (tag, pt) => {
    expect(expectedFontPoints(probe(tag))).toBe(pt);
  });

  it.each(Object.keys(TEXT_SCALE))('lets .text-%s override the element default', (step) => {
    // The stylesheet deliberately ranks utilities above element rules, and
    // computed-type.test.ts asserts that ordering. The overlay has to agree
    // with it or it contradicts the tests.
    expect(expectedFontPoints(probe('P', [`text-${step}`])))
      .toBe(TEXT_SCALE[step as keyof typeof TEXT_SCALE].pt);
  });

  it.each([
    ['text-[8pt]', 8],
    ['text-[7.2pt]', 7.2],
    ['text-[12px]', 9],
    ['text-[1rem]', 12],
  ])('reads the size out of the arbitrary utility %s', (cls, pt) => {
    expect(expectedFontPoints(probe('P', [cls]))).toBe(pt);
  });

  it('does not mistake a text colour utility for a size', () => {
    // `text-gray-500` shares the prefix and nothing else; a prefix match would
    // silently resolve it to no size and fall through to the wrong branch.
    expect(expectedFontPoints(probe('P', ['text-gray-500']))).toBe(ELEMENT_SCALE.p.pt);
  });

  it('prefers the arbitrary size when both kinds of utility are present', () => {
    expect(expectedFontPoints(probe('P', ['text-xs', 'text-[8pt]']))).toBe(8);
  });

  it('declines to judge an element whose size is set inline', () => {
    // An author-set inline size is a deliberate choice, not drift. Returning a
    // number here would flag every specimen row in the typography example.
    expect(expectedFontPoints(probe('P', [], true))).toBeNull();
  });

  it.each(['SPAN', 'DIV', 'BODY'])('declines to judge %s, which the scale does not claim', (tag) => {
    expect(expectedFontPoints(probe(tag))).toBeNull();
  });

  it('declines to judge a relative arbitrary size', () => {
    // `em` depends on the parent, so there is no single expected point value.
    expect(expectedFontPoints(probe('P', ['text-[1.2em]']))).toBeNull();
  });

  it.each([
    [0.8, ELEMENT_SCALE.p.pt * 0.8],
    [2, ELEMENT_SCALE.p.pt * 2],
  ])('multiplies the element default by a scale of %s', (scale, pt) => {
    expect(expectedFontPoints(probe('P'), scale)).toBeCloseTo(pt, 5);
  });

  it('multiplies a utility override by the scale too', () => {
    // The bug in the screenshot: 7pt utility measured 5.6pt at scale 0.8 while
    // the overlay expected 7.2pt — the scaled *element* default.
    expect(expectedFontPoints(probe('P', ['text-xs']), 0.8)).toBeCloseTo(5.6, 5);
  });

  it('declines to judge an element a component rule sizes', () => {
    // `blockquote p { font-size: inherit }` is deliberate and documented, so a
    // quoted paragraph at the blockquote's 10pt is not drift.
    expect(expectedFontPoints({ ...probe('P'), hasSpecificFontSizeRule: true })).toBeNull();
  });
});

describe('hasSpecificFontSizeSelector', () => {
  it.each([
    ['blockquote p'],
    ['.datasheet-footer p'],
    ['.section-header-bar h2'],
    ['p.lead'],
  ])('treats %s as a deliberate component size', (selector) => {
    expect(hasSpecificFontSizeSelector([selector])).toBe(true);
  });

  it.each(['h1', 'p', 'h2'])('treats the bare tag rule %s as not overriding', (selector) => {
    // Tailwind preflight's `h1 { font-size: inherit }` is a bare tag rule, and
    // it outranking the facet layer is the bug the overlay exists to catch.
    // Counting it as an override would silence exactly that.
    expect(hasSpecificFontSizeSelector([selector])).toBe(false);
  });

  it('reports the specific selector when an element matches both kinds', () => {
    expect(hasSpecificFontSizeSelector(['p', 'blockquote p'])).toBe(true);
  });

  it('is false when nothing matched', () => {
    expect(hasSpecificFontSizeSelector([])).toBe(false);
  });
});
