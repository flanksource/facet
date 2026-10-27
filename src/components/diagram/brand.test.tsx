import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Arrow from './Arrow';
import { BrandBox, BrandContainer, BrandMark } from './BrandNodes';
import { loadBrand, type BrandDefinition } from './brand';
import { collectGraph } from './DiagreDiagram';

const definition: BrandDefinition = {
  id: 'acme', name: 'Acme', defaultScheme: 'primary',
  fonts: { heading: 'Georgia, serif', body: 'Arial, sans-serif', mono: 'monospace' },
  schemes: { primary: {
    accent: '#1d4ed8', tint: '#eff6ff', containerTint: '#f8fbff', border: '#3b82f6', surface: '#ffffff', panel: '#f1f5f9', panelBorder: '#cbd5e1',
    text: '#0f172a', muted: '#64748b', onAccent: '#ffffff', dark: '#0f172a', onDark: '#ffffff',
  } },
  marks: { symbol: { light: './symbol.svg', dark: './reverse.svg', small: { below: 32, light: './small.svg', dark: './small-reverse.svg' } } },
};
const baseUrl = 'https://example.com/brand/brand.json';

function dom(element: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(element);
  return root;
}

describe('JSON diagram branding', () => {
  it('resolves artwork relative to its definition without modifying the JSON', () => {
    const brand = loadBrand({ definition, baseUrl });
    expect(brand.marks.symbol.light).toBe('https://example.com/brand/symbol.svg');
    expect(brand.marks.symbol.small?.dark).toBe('https://example.com/brand/small-reverse.svg');
    expect(definition.marks.symbol.light).toBe('./symbol.svg');
  });

  it.each([
    { ...definition, defaultScheme: 'missing' },
    { ...definition, defaultScheme: 'constructor' },
    { ...definition, fonts: { ...definition.fonts, body: '' } },
    { ...definition, schemes: { primary: { ...definition.schemes.primary, border: '' } } },
    { ...definition, marks: {} },
  ])('rejects incomplete brand definitions', (invalid) => {
    expect(() => loadBrand({ definition: invalid, baseUrl })).toThrow(/brand/i);
  });

  it('selects small and reversed artwork at the declared breakpoint', () => {
    const brand = loadBrand({ definition, baseUrl });
    expect(dom(<BrandMark brand={brand} size={24} dark />).querySelector('img')?.getAttribute('src')).toBe('https://example.com/brand/small-reverse.svg');
    expect(dom(<BrandMark brand={brand} size={32} />).querySelector('img')?.getAttribute('src')).toBe('https://example.com/brand/symbol.svg');
    expect(() => renderToStaticMarkup(<BrandMark brand={brand} mark="missing" />)).toThrow(/missing/);
  });

  it('allows bundlers to embed every artwork URL and rejects empty resolutions', () => {
    const embedded = 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E';
    const brand = loadBrand({ definition, baseUrl, resolveAsset: () => embedded });
    expect(brand.marks.symbol).toEqual({ light: embedded, dark: embedded, small: { below: 32, light: embedded, dark: embedded } });
    expect(() => loadBrand({ definition, baseUrl, resolveAsset: () => '' })).toThrow(/artwork/);
  });

  it('applies the supplied palette and fonts to the shared primitives', () => {
    const brand = loadBrand({ definition, baseUrl });
    const root = dom(<BrandContainer brand={brand} id="group" variant="header">
      <BrandBox id="api" brand={brand} variant="tinted" mark={false} />
    </BrandContainer>);
    expect(root.querySelector<HTMLElement>('#api')?.style.backgroundColor).toBe('rgb(239, 246, 255)');
    expect(root.querySelector<HTMLElement>('#api')?.style.fontFamily).toBe('Arial, sans-serif');
    expect(root.querySelector('#api img')).toBeNull();
    expect(root.querySelector('#group')?.getAttribute('data-container-style')).toBe('header');
    expect(root.querySelector('#api')?.textContent).toBe('Acme');
    expect(() => renderToStaticMarkup(<BrandBox brand={brand} scheme="missing" />)).toThrow(/missing/);
  });

  it('collects branded nodes and their port endpoints for automatic layout', () => {
    const graph = collectGraph(<>
      <BrandBox brand={definition} id="source" ports={[{ id: 'out', position: 'right-middle', label: 'API' }]} />
      <BrandBox brand={definition} id="target" />
      <Arrow from="out" to="target" />
    </>);
    expect(graph.edges).toEqual([{ from: 'source', to: 'target' }]);
  });
});
