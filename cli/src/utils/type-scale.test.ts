import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ELEMENT_SCALE, TEXT_SCALE, tailwindThemeBlock } from './type-scale.js';

const themeSource = readFileSync(
  fileURLToPath(new URL('../../../src/utils/theme.ts', import.meta.url)),
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

  it('ships the same scaled point theme in dist/styles.css', () => {
    const css = readFileSync(new URL('../../../dist/styles.css', import.meta.url), 'utf8');
    for (const [name, { pt, leading }] of Object.entries(TEXT_SCALE)) {
      expect(css).toContain(`--text-${name}: calc(${pt}pt * var(--facet-font-scale, 1));`);
      expect(css).toContain(`--text-${name}--line-height: calc(${leading}pt * var(--facet-font-scale, 1));`);
    }
  });
});
