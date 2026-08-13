import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ELEMENT_SCALE, TEXT_SCALE, tailwindFontSizeTheme, tailwindThemeBlock } from './type-scale.js';

const themeSource = readFileSync(
  fileURLToPath(new URL('../../../src/utils/theme.ts', import.meta.url)),
  'utf-8',
);

const tailwindConfigSource = readFileSync(
  fileURLToPath(new URL('../../../tailwind.config.js', import.meta.url)),
  'utf-8',
);

/** `H1: { fontSize: '22pt', ... }` -> 22 */
function themePoints(key: string): number | undefined {
  // Tolerates the `scaled('22pt')` wrapper: those values are inline styles that
  // no stylesheet transform can reach, so they carry the calc() themselves.
  const match = themeSource.match(
    new RegExp(`\\b${key}:\\s*\\{[^}]*fontSize:\\s*(?:scaled\\()?'(\\d+(?:\\.\\d+)?)pt'`),
  );
  return match ? Number(match[1]) : undefined;
}

describe('type scale', () => {
  it('renders a Tailwind v3 fontSize theme in points, with leading', () => {
    // Tuples, not bare sizes: a bare size leaves the utility inheriting the
    // element's line-height, which is how text-2xl ended up drawing 24pt
    // glyphs on a paragraph's 12pt leading.
    expect(tailwindFontSizeTheme()).toMatchObject({
      xs: ['7pt', { lineHeight: '9pt' }],
      sm: ['9pt', { lineHeight: '12pt' }],
      lg: ['15pt', { lineHeight: '19pt' }],
      '2xl': ['24pt', { lineHeight: '28pt' }],
    });
  });

  it('renders a Tailwind v4 @theme block in points, with leading', () => {
    const block = tailwindThemeBlock();

    expect(block.startsWith('@theme {')).toBe(true);
    expect(block).toContain('--text-xs: 7pt;');
    expect(block).toContain('--text-xs--line-height: 9pt;');
    expect(block).toContain('--text-2xl: 24pt;');
    expect(block).toContain('--text-2xl--line-height: 28pt;');
  });

  it('gives a text step the same leading as the element of the same size', () => {
    // Where the two scales meet they must agree, or a <p> and a `.text-sm`
    // span of identical size set on different baselines.
    expect(TEXT_SCALE.sm.leading).toBe(ELEMENT_SCALE.p.leading);
    expect(TEXT_SCALE.base.leading).toBe(ELEMENT_SCALE.body.leading);
    expect(TEXT_SCALE.md.leading).toBe(ELEMENT_SCALE.body.leading);
    expect(TEXT_SCALE.lg.leading).toBe(ELEMENT_SCALE.h2.leading);
  });

  it.each([
    ['H1', () => ELEMENT_SCALE.h1.pt],
    ['H2', () => ELEMENT_SCALE.h2.pt],
    ['H3', () => ELEMENT_SCALE.h3.pt],
    ['H4', () => ELEMENT_SCALE.h4.pt],
    ['P', () => ELEMENT_SCALE.p.pt],
    ['Body', () => ELEMENT_SCALE.body.pt],
    ['TextXs', () => TEXT_SCALE.xs.pt],
    ['TextSm', () => TEXT_SCALE.sm.pt],
    ['TextBase', () => TEXT_SCALE.base.pt],
    ['TextLg', () => TEXT_SCALE.lg.pt],
    ['TextXl', () => TEXT_SCALE.xl.pt],
    ['Text2xl', () => TEXT_SCALE['2xl'].pt],
  ])('agrees with TYPOGRAPHY.%s in the component package', (key, expected) => {
    // theme.ts styles components inline while this scale drives the
    // stylesheet, so the two describe the same document from opposite sides.
    // They live in separate packages and cannot import each other; drift
    // between them is what this catches.
    expect(themePoints(key)).toBe(expected());
  });

  it('matches the fontSize theme that builds dist/styles.css', () => {
    // `pnpm run build:css` runs the Tailwind CLI against tailwind.config.js, so
    // that config — not the post-processed consumer build — decides the
    // `.text-*` sizes every consumer of the shipped stylesheet gets. It is a
    // CommonJS file the ESM CLI cannot import, hence the source read.
    const entries = [...tailwindConfigSource.matchAll(
      /'?([\w-]+)'?:\s*\['(\d+(?:\.\d+)?)pt',\s*\{\s*lineHeight:\s*'(\d+(?:\.\d+)?)pt'\s*\}\]/g,
    )];
    expect(entries.length, 'tailwind.config.js declares no fontSize tuples').toBeGreaterThan(0);

    const declared = Object.fromEntries(entries.map(m => [m[1], { pt: Number(m[2]), leading: Number(m[3]) }]));
    expect(declared).toEqual(
      Object.fromEntries(Object.entries(TEXT_SCALE).map(([step, { pt, leading }]) => [step, { pt, leading }])),
    );
  });
});
