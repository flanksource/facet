import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM, no types; it ships as a copied asset, not a module.
import facetFontScale, { scaleValue } from '../../../postcss/facet-font-scale.mjs';
import { fontScaleCss, injectFontScale } from './font-size.js';

const VAR = '--facet-font-scale';

function run(css: string): string {
  return postcss([facetFontScale()]).process(css, { from: undefined }).css;
}

describe('scaleValue', () => {
  it.each([
    ['9pt', `calc(9pt * var(${VAR}, 1))`],
    ['16px', `calc(16px * var(${VAR}, 1))`],
    ['1.125rem', `calc(1.125rem * var(${VAR}, 1))`],
    ['.5pt', `calc(.5pt * var(${VAR}, 1))`],
  ])('wraps the absolute length %s', (input, expected) => {
    expect(scaleValue(input)).toBe(expected);
  });

  it.each([
    ['inherit'],
    ['initial'],
    ['unset'],
    ['medium'],
    ['1.3'],
    ['1.2em'],
    ['80%'],
  ])('leaves %s alone', (input) => {
    // Keywords and unitless ratios carry no length token, and em/% resolve
    // against a parent that has already been scaled — multiplying them again
    // would compound the ratio.
    expect(scaleValue(input)).toBe(input);
  });

  it('scales only the absolute term of an existing calc', () => {
    // The `1em` already carries the parent's scaling. Wrapping the whole value
    // instead of the token would apply the ratio to it a second time.
    expect(scaleValue('calc(1em + 1pt)')).toBe(`calc(1em + calc(1pt * var(${VAR}, 1)))`);
  });

  it('scales the bounds of a clamp but not its viewport term', () => {
    expect(scaleValue('clamp(20px, 5vw, 26pt)'))
      .toBe(`clamp(calc(20px * var(${VAR}, 1)), 5vw, calc(26pt * var(${VAR}, 1)))`);
  });

  it('does not touch lengths inside hex colours or identifiers', () => {
    expect(scaleValue('#12pt34')).toBe('#12pt34');
  });

  it('returns a value that already mentions the variable unchanged', () => {
    const already = `calc(9pt * var(${VAR}, 1))`;
    expect(scaleValue(already)).toBe(already);
  });
});

describe('facetFontScale plugin', () => {
  it('scales font-size and absolute line-height', () => {
    expect(run('p{font-size:9pt;line-height:12pt}'))
      .toBe(`p{font-size:calc(9pt * var(${VAR}, 1));line-height:calc(12pt * var(${VAR}, 1))}`);
  });

  it('leaves a unitless line-height alone', () => {
    expect(run('p{line-height:1.3}')).toBe('p{line-height:1.3}');
  });

  it.each(['html', ':root', 'html, body'])('does not scale font-size on %s', (selector) => {
    // These anchor rem. Scaling the anchor as well as the rem tokens would
    // apply the ratio twice to every rem length in the stylesheet.
    expect(run(`${selector}{font-size:16px}`)).toContain('font-size:16px');
  });

  it('still scales font-size on body', () => {
    expect(run('body{font-size:10pt}')).toContain(`calc(10pt * var(${VAR}, 1))`);
  });

  it('scales the Tailwind v4 type-scale custom properties', () => {
    // v4 utilities are `font-size: var(--text-xs)`, so the flag reaches them
    // only through the definition. There is no v4 example in the repo, which
    // makes this the only coverage of that path.
    const out = run(':root{--text-xs:7pt;--text-xs--line-height:9pt}');

    expect(out).toContain(`--text-xs:calc(7pt * var(${VAR}, 1))`);
    expect(out).toContain(`--text-xs--line-height:calc(9pt * var(${VAR}, 1))`);
  });

  it('leaves unrelated custom properties alone', () => {
    expect(run(':root{--color-brand:#2563eb;--space-4:16px}'))
      .toBe(':root{--color-brand:#2563eb;--space-4:16px}');
  });

  it('leaves non-typographic properties alone', () => {
    expect(run('div{padding:16px;width:210mm}')).toBe('div{padding:16px;width:210mm}');
  });

  it('is idempotent, because consumer builds re-process this output', () => {
    // Vite unshifts postcss-import ahead of configured plugins, so a consumer
    // build always re-sees the already-transformed dist/styles.css. Without
    // this property the ratio would compound once per build — and PostCSS 8
    // re-visits a declaration whose value you mutate, so it would not terminate.
    const once = run('p{font-size:9pt}table{font-size:9pt}');

    expect(run(once)).toBe(once);
  });
});

describe('fontScaleCss', () => {
  it('is exactly 1 at the base size, so an unset flag is a no-op', () => {
    // The stylesheet's fallback is also 1, so this must multiply out identically.
    expect(fontScaleCss(10)).toBe(':root { --facet-font-scale: 1; }');
  });

  it.each([
    [20, 2],
    [5, 0.5],
    [8, 0.8],
  ])('turns a %ipt base into a ratio of %f', (pt, ratio) => {
    expect(fontScaleCss(pt)).toBe(`:root { --facet-font-scale: ${ratio}; }`);
  });

  it('emits a number, so no caller-supplied text can reach the stylesheet', () => {
    expect(fontScaleCss(9.123456789)).toMatch(/^:root \{ --facet-font-scale: [\d.]+; \}$/);
  });
});

describe('injectFontScale', () => {
  it('returns the html untouched when no size is set', () => {
    const html = '<html><head></head><body>x</body></html>';

    expect(injectFontScale(html, undefined)).toBe(html);
  });

  it('appends the style last in head, so it beats a <Document fontSize>', () => {
    // Both are unlayered :root declarations of equal specificity, so the later
    // one applies — an invocation-time flag overriding a template default.
    const html = '<html><head><style>:root{--facet-font-scale:2}</style></head><body>x</body></html>';
    const out = injectFontScale(html, 5);

    expect(out.lastIndexOf('--facet-font-scale: 0.5')).toBeGreaterThan(out.indexOf('--facet-font-scale:2'));
    expect(out.indexOf('</head>')).toBeGreaterThan(out.lastIndexOf('--facet-font-scale: 0.5'));
  });

  it('prepends when there is no head to append to', () => {
    expect(injectFontScale('<div>x</div>', 5).startsWith('<style>')).toBe(true);
  });
});
