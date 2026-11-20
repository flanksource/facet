// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import { compile } from 'tailwindcss';
import clickyPreset from '@flanksource/clicky-ui/tailwind-preset';
import { createPageStyles } from './recipe.mjs';
import preset from './preset.mjs';
import { flattenStylesheetLayers } from './stylesheet.mjs';

const require = createRequire(import.meta.url);
const builtStyles = resolve(import.meta.dirname, '../../dist/styles.css');

async function compileEntry(entry: string) {
  return compile(entry, {
    loadStylesheet: async (id, base) => ({ path: id, base, content: readFileSync(require.resolve(id), 'utf8') }),
    loadModule: async (id, base) => {
      const module = await import(/* @vite-ignore */ id);
      return { path: id, base, module: module.default ?? module };
    },
  });
}

describe('page-styles', () => {
  it('flattens build layers in cascade order while keeping font imports valid', () => {
    const input = '@layer theme, base, facet, components, utilities;@import "font.css";@layer utilities{.text-xs{font-size:7pt}}@layer components{.prose{color:blue}}@layer base{h1{font-size:inherit}}h1{font-size:22pt}';
    const nodes = postcss.parse(flattenStylesheetLayers(input)).nodes;
    expect(nodes.map((node) => node.type === 'rule' ? node.selector : node.type === 'atrule' ? `@${node.name}` : node.type))
      .toEqual(['@import', 'h1', '.prose', '.text-xs', 'h1']);
  });

  it('describes facet as a base stylesheet extending clicky-ui, with compiler-only inputs', () => {
    const recipe = createPageStyles();
    expect(recipe).toMatchObject({
      name: '@flanksource/facet',
      layer: 'facet',
      base: ['@flanksource/facet/styles.css'],
      extends: ['@flanksource/clicky-ui'],
    });
    expect(recipe).not.toHaveProperty('stylesheets');
    expect(recipe.runtimeDependencies).toEqual([
      'tailwindcss/theme.css',
      'tailwindcss/preflight.css',
      'tailwindcss/utilities.css',
      '@tailwindcss/typography',
      '@flanksource/clicky-ui/tailwind-preset',
    ]);
    expect(recipe.entry).toBe([
      '@import "tailwindcss/theme.css" layer(theme);',
      '@import "tailwindcss/utilities.css" layer(utilities) source(none);',
      recipe.theme,
      '@config "@flanksource/facet/tailwind-preset";',
      '@plugin "@tailwindcss/typography";',
      '',
    ].join('\n'));
    expect(recipe.entry).not.toMatch(/@import ['"]\.|facet\.css|data-facet-canvas/);
    expect(recipe.entry.length).toBeLessThan(2_000);
  });

  it('supplies the point type scale only; fonts, colors and page width come from the preset', () => {
    const { theme } = createPageStyles();
    expect(theme).toContain('--text-xs: 7pt;');
    expect(theme).toContain('--text-xs--line-height: 9pt;');
    expect(theme).toContain('--text-2xl: 24pt;');
    expect(theme).not.toMatch(/--font-|--color-|--container-/);
  });

  it('extends the clicky-ui preset and binds facet literals to --facet-* variables', () => {
    expect(preset.presets).toEqual([clickyPreset]);
    expect(preset.theme?.extend).toEqual({
      fontFamily: { sans: 'var(--facet-font-sans)', mono: 'var(--facet-font-mono)' },
      colors: { 'flanksource-blue': 'var(--facet-brand-blue)', 'flanksource-dark': 'var(--facet-brand-dark)' },
      borderRadius: { sm: 'var(--facet-radius-sm)', md: 'var(--facet-radius-md)', lg: 'var(--facet-radius-lg)' },
      maxWidth: { a4: 'var(--facet-page-a4)' },
    });
  });

  it('compiles the recipe entry with clicky colors as variables and facet utilities unchanged', async () => {
    const recipe = createPageStyles();
    const compiler = await compileEntry(recipe.entry);
    const css = recipe.transform(compiler.build(['text-xs', 'font-sans', 'font-mono', 'text-flanksource-blue', 'bg-flanksource-dark', 'max-w-a4', 'bg-primary', 'prose']));
    expect(css).toContain('--text-xs: calc(7pt * var(--facet-font-scale, 1));');
    expect(css).toMatch(/\.font-sans\s*{\s*font-family:\s*var\(--facet-font-sans\)/);
    expect(css).toMatch(/\.font-mono\s*{\s*font-family:\s*var\(--facet-font-mono\)/);
    expect(css).toMatch(/\.text-flanksource-blue\s*{\s*color:\s*var\(--facet-brand-blue\)/);
    expect(css).toMatch(/\.bg-flanksource-dark\s*{\s*background-color:\s*var\(--facet-brand-dark\)/);
    expect(css).toMatch(/\.max-w-a4\s*{\s*max-width:\s*var\(--facet-page-a4\)/);
    expect(css).toMatch(/\.bg-primary\s*{\s*background-color:\s*var\(--primary\)/);
    expect(css).toContain('.prose');
    expect(css).not.toContain('data-facet-canvas');
    expect(css).not.toContain('box-sizing');
  });

  it('keeps the published module and stylesheet in sync with the recipe', async () => {
    const { default: published } = await import('@flanksource/facet/page-styles');
    expect(published).toMatchObject({ base: ['@flanksource/facet/styles.css'], extends: ['@flanksource/clicky-ui'] });
    expect(published).not.toHaveProperty('stylesheets');
    expect(published.entry).toBe(createPageStyles().entry);
  });

  it('defines the --facet-* tokens in the built stylesheet with the expected values', () => {
    const css = readFileSync(builtStyles, 'utf8');
    const stack = (fonts: string[]) => fonts.map((font) => font.includes(' ') ? `"${font}"` : font).join(', ');
    const declared = (name: string) => css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.replace(/'/g, '"').trim();
    expect(declared('--facet-font-sans')).toBe(stack(['Open Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']));
    expect(declared('--facet-font-mono')).toBe(stack(['Fira Code', 'Consolas', 'Monaco', 'Courier New', 'monospace']));
    expect(declared('--facet-brand-blue')).toBe('#2563eb');
    expect(declared('--facet-brand-dark')).toBe('#1e293b');
    expect(declared('--facet-page-a4')).toBe('210mm');
    expect([declared('--facet-radius-sm'), declared('--facet-radius-md'), declared('--facet-radius-lg')])
      .toEqual(['0.25rem', '0.375rem', '0.5rem']);
    expect(css).toMatch(/\.rounded-lg\s*{\s*border-radius:\s*var\(--facet-radius-lg\)/);
    expect(css).toContain('data-facet-canvas');
  });

  it('rejects late CSS imports instead of dropping them', async () => {
    const { wrapFacetStylesInLayer } = await import('./recipe.mjs');
    expect(() => wrapFacetStylesInLayer('h1{}\n@import "late.css";')).toThrow(/must precede/);
  });

  it('scales utilities and v4 theme lengths once, preserving the rem anchor and relative lengths', () => {
    const recipe = createPageStyles();
    const input = 'html{font-size:16px}:root{--text-xs:7pt;--text-xs--line-height:9pt;--space:4px}.a{font-size:1rem;line-height:1.5;padding:2mm}.b{font-size:2em}';
    const expected = 'html{font-size:16px}:root{--text-xs:calc(7pt * var(--facet-font-scale, 1));--text-xs--line-height:calc(9pt * var(--facet-font-scale, 1));--space:4px}.a{font-size:calc(1rem * var(--facet-font-scale, 1));line-height:1.5;padding:2mm}.b{font-size:2em}';
    expect(recipe.transform(input)).toBe(expected);
    expect(recipe.transform(expected)).toBe(expected);
    expect(() => postcss.parse(recipe.transform(input))).not.toThrow();
  });
});
