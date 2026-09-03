import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Document from './Document';

/** The contents of the single <style> the document emits, if any. */
function documentCss(markup: string): string {
  return markup.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
}

describe('Document typography', () => {
  it('emits nothing when no typography is set', () => {
    expect(documentCss(renderToStaticMarkup(<Document title="x" />))).toBe('');
  });

  it('turns a base size into the document-wide scale', () => {
    // Not a body rule: that moved body text while headings, tables and every
    // utility class kept their literal size, so the hierarchy distorted rather
    // than grew. The scale reaches all of them.
    const css = documentCss(renderToStaticMarkup(<Document fontSize={20} />));

    expect(css).toContain(':root{--facet-font-scale:2}');
    expect(css).not.toContain('font-size');
  });

  it.each([
    [10, 1],
    [5, 0.5],
    ['12pt', 1.2],
  ])('scales %s to a ratio of %s', (fontSize, ratio) => {
    expect(documentCss(renderToStaticMarkup(<Document fontSize={fontSize} />)))
      .toContain(`--facet-font-scale:${ratio}`);
  });

  it.each(['1.2em', '90%', 'larger'])('keeps %s as a body override', (fontSize) => {
    // These are relative to something else, so they have no defined ratio to
    // the document base and cannot become a scale.
    const css = documentCss(renderToStaticMarkup(<Document fontSize={fontSize} />));

    expect(css).toContain(`body{font-size:${fontSize}}`);
    expect(css).not.toContain('--facet-font-scale');
  });

  it('still emits line-height and font-family on body', () => {
    const css = documentCss(renderToStaticMarkup(
      <Document fontSize={20} lineHeight={1.5} fontFamily="Georgia" />,
    ));

    expect(css).toContain(':root{--facet-font-scale:2}');
    expect(css).toContain('body{line-height:1.5;font-family:Georgia}');
  });

  it('sanitises a value that tries to close the style block', () => {
    const css = documentCss(renderToStaticMarkup(
      <Document fontFamily={'Georgia}body{display:none'} />,
    ));

    // The braces are stripped from the value, so it cannot close the rule and
    // start one of its own — it stays a single (nonsense) font-family.
    expect(css).toContain('body{font-family:Georgiabodydisplay:none}');
    expect(css.match(/\{/g)).toHaveLength(1);
  });
});
