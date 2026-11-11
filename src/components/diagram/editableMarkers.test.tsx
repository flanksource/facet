import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BoxNode from './BoxNode';
import ContainerNode from './ContainerNode';
import { BrandBox, BrandContainer } from './BrandNodes';
import type { BrandDefinition } from './brand';
import { BOX_STYLES, CONTAINER_STYLES } from './nodeStyles';

function dom(element: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(element);
  return root;
}

const texts = (root: Element) =>
  Object.fromEntries(Array.from(root.querySelectorAll('[data-editable-text]')).map((el) => [el.getAttribute('data-editable-text'), el.textContent]));

const brand: BrandDefinition = {
  id: 'acme', name: 'Acme', defaultScheme: 'primary',
  fonts: { heading: 'serif', body: 'sans-serif', mono: 'monospace' },
  schemes: { primary: {
    accent: '#1d4ed8', tint: '#eff6ff', containerTint: '#f8fbff', border: '#3b82f6', surface: '#ffffff', panel: '#f1f5f9', panelBorder: '#cbd5e1',
    text: '#0f172a', muted: '#64748b', onAccent: '#ffffff', dark: '#0f172a', onDark: '#ffffff',
  } },
  marks: { symbol: { light: 'https://example.com/s.svg', dark: 'https://example.com/r.svg' } },
};

describe('BoxNode editable markers', () => {
  it.each(BOX_STYLES)('marks the %s root as an editable variant', (variant) => {
    const box = dom(<BoxNode variant={variant} title="T" />).firstElementChild as HTMLElement;
    expect([box.dataset.editableBox, box.dataset.boxStyle]).toEqual(['variant', variant]);
  });

  it('wraps exactly the text of title, description and footer', () => {
    const root = dom(<BoxNode title="Title" description="Desc" footer="Foot" icon={<svg />} />);
    expect(texts(root)).toEqual({ title: 'Title', description: 'Desc', footer: 'Foot' });
  });

  it('marks a numeric title without an icon', () => {
    expect(texts(dom(<BoxNode title={42} />))).toEqual({ title: '42' });
  });

  it('adds no text marker for ReactNode values', () => {
    const root = dom(<BoxNode title={<b>Title</b>} description={<i>Desc</i>} footer={<u>Foot</u>} />);
    expect(root.querySelectorAll('[data-editable-text]')).toHaveLength(0);
  });

  it('forwards data-* props to the box, not the ports wrapper', () => {
    const root = dom(<BoxNode title="T" data-editable-source="a.tsx:1" ports={[{ position: 'top-middle', label: 'p' }]} />);
    const wrapper = root.firstElementChild as HTMLElement;
    const box = root.querySelector('[data-box-style]') as HTMLElement;
    expect([wrapper.dataset.editableSource, box.dataset.editableSource, box.dataset.editableBox]).toEqual([undefined, 'a.tsx:1', 'variant']);
  });
});

describe('ContainerNode editable markers', () => {
  it.each(CONTAINER_STYLES)('marks the %s root as an editable variant', (variant) => {
    const container = dom(<ContainerNode variant={variant} />).firstElementChild as HTMLElement;
    expect([container.dataset.editableContainer, container.dataset.containerStyle]).toEqual(['variant', variant]);
  });

  it('wraps exactly the text of tag, title, description and footer', () => {
    const root = dom(<ContainerNode tag="Tag" title="Title" icon={<svg />} description="Desc" footer="Foot" data-x="1" />);
    expect([texts(root), (root.firstElementChild as HTMLElement).dataset.x]).toEqual([{ tag: 'Tag', title: 'Title', description: 'Desc', footer: 'Foot' }, '1']);
  });

  it('adds no text marker for ReactNode values', () => {
    const root = dom(<ContainerNode tag={<b>Tag</b>} title={<b>Title</b>} description={<i>Desc</i>} footer={<u>Foot</u>} />);
    expect(root.querySelectorAll('[data-editable-text]')).toHaveLength(0);
  });
});

describe('Brand nodes', () => {
  it('pass data-* through and mark the brand-name title fallback', () => {
    const box = dom(<BrandBox brand={brand} data-x="1" />);
    const container = dom(<BrandContainer brand={brand} data-x="1" />);
    expect([box, container].map((root) => [(root.firstElementChild as HTMLElement).dataset.x, texts(root)])).toEqual([
      ['1', { title: 'Acme' }],
      ['1', { title: 'Acme' }],
    ]);
  });

  it('marks an explicit title instead of the brand name', () => {
    expect(texts(dom(<BrandBox brand={brand} title="Custom" />))).toEqual({ title: 'Custom' });
  });
});
