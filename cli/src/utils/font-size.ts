/**
 * The base font size is the one number a caller can set that rescales a whole
 * document, and it reaches the render as text inside a stylesheet. Both of
 * those make it worth validating in one place: an invalid size used to be
 * interpolated as-is, where the browser silently dropped the declaration and
 * printed the default size with no diagnostic, and a non-numeric value could
 * close the rule and inject arbitrary CSS.
 */

import { ELEMENT_SCALE } from './type-scale.js';

/** Larger than any sensible heading; well inside the shortest page dimension. */
const MAX_FONT_SIZE_PT = 1000;

/** The size the scale is defined against, so `--font-size 10` is a no-op. */
const BASE_FONT_SIZE_PT = ELEMENT_SCALE.body.pt;

export function parseFontSize(value: unknown): number | undefined {
  if (value == null) return undefined;

  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    throw new Error(`Invalid font size ${JSON.stringify(value)}: expected a number of points`);
  }
  if (parsed <= 0 || parsed > MAX_FONT_SIZE_PT) {
    throw new Error(`Invalid font size ${parsed}: expected between 0 and ${MAX_FONT_SIZE_PT} points`);
  }
  return parsed;
}

/**
 * The document-wide type multiplier, mirroring `printableHeightCss`: one custom
 * property the stylesheet is written against, injected by the renderer.
 *
 * Every font-size and line-height in the generated CSS is
 * `calc(<value> * var(--facet-font-scale, 1))`, so this single declaration
 * rescales headings, table text, footers and arbitrary `text-[8pt]` utilities
 * alike. It replaces a block that restated twenty selectors with `!important`
 * and left everything it did not name — most of the document — at its literal
 * size, so raising the base size distorted the hierarchy instead of growing it.
 *
 * The `1` fallback multiplies out exactly, so an unset flag is a true no-op.
 */
export function fontScaleCss(fontSize: number): string {
  const scale = Number((fontSize / BASE_FONT_SIZE_PT).toFixed(6));
  return `:root { --facet-font-scale: ${scale}; }`;
}

/**
 * Append the scale as the last thing in `<head>`, so an invocation-time flag
 * beats a `<Document fontSize>` on source order without needing `!important`.
 */
export function injectFontScale(html: string, fontSize?: number): string {
  if (fontSize == null) return html;
  const style = `<style>${fontScaleCss(fontSize)}</style>`;
  if (html.includes('</head>')) return html.replace('</head>', () => `${style}</head>`);
  return style + html;
}
