import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import BoxNode from './BoxNode';
import ContainerNode from './ContainerNode';
import { DEFAULT_NODE_PALETTE, type NodePalette } from './nodeStyles';
import { DENSITY_TOKENS, DiagramStyleProvider, PLACEMENT_SHAPES, type Density } from './style';

function dom(element: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(element);
  return root;
}

const NIGHT: NodePalette = {
  ...DEFAULT_NODE_PALETTE,
  accent: '#a78bfa', tint: '#151b33', surface: '#151b33', border: '#2a3354', text: '#f8fafc',
};

const headerPadding = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`#${id} > div`)?.style.padding;

describe('diagram style context', () => {
  it('nodes take their palette from the provider when none is passed', () => {
    const root = dom(<DiagramStyleProvider palette={NIGHT}><BoxNode id="api" title="API">Body</BoxNode></DiagramStyleProvider>);
    expect(root.querySelector<HTMLElement>('#api > div')?.style.backgroundColor).toBe('rgb(167, 139, 250)');
  });

  it('an explicit palette prop wins over the provider', () => {
    const root = dom(<DiagramStyleProvider palette={NIGHT}><BoxNode id="api" title="API" palette={DEFAULT_NODE_PALETTE}>Body</BoxNode></DiagramStyleProvider>);
    expect(root.querySelector<HTMLElement>('#api > div')?.style.backgroundColor).toBe('rgb(45, 125, 228)');
  });

  it.each(['compact', 'comfortable', 'spacious'] as Density[])('the %s provider density sets header padding', (density) => {
    const root = dom(<DiagramStyleProvider density={density}><BoxNode id="api" title="API" /></DiagramStyleProvider>);
    expect(headerPadding(root, 'api')).toBe(DENSITY_TOKENS[density].header);
  });

  it('density prop beats compact, and compact beats the provider', () => {
    const root = dom(
      <DiagramStyleProvider density="spacious">
        <BoxNode id="legacy" title="Legacy" compact />
        <BoxNode id="explicit" title="Explicit" compact density="comfortable" />
        <BoxNode id="inherited" title="Inherited" />
      </DiagramStyleProvider>,
    );
    expect(headerPadding(root, 'legacy')).toBe(DENSITY_TOKENS.compact.header);
    expect(headerPadding(root, 'explicit')).toBe(DENSITY_TOKENS.comfortable.header);
    expect(headerPadding(root, 'inherited')).toBe(DENSITY_TOKENS.spacious.header);
  });

  it('without a provider nodes keep the comfortable defaults', () => {
    expect(headerPadding(dom(<BoxNode id="api" title="API" />), 'api')).toBe(DENSITY_TOKENS.comfortable.header);
  });

  it('nested providers override only what they set', () => {
    const root = dom(
      <DiagramStyleProvider palette={NIGHT} density="compact">
        <DiagramStyleProvider density="spacious"><BoxNode id="api" title="API" /></DiagramStyleProvider>
      </DiagramStyleProvider>,
    );
    expect(root.querySelector<HTMLElement>('#api > div')?.style.backgroundColor).toBe('rgb(167, 139, 250)');
    expect(headerPadding(root, 'api')).toBe(DENSITY_TOKENS.spacious.header);
  });
});

describe('placement-aware nodes', () => {
  it.each(Object.entries(PLACEMENT_SHAPES))('layout/%s sets the default box and container shape', (placement, shape) => {
    const root = dom(
      <DiagramStyleProvider placement={placement as keyof typeof PLACEMENT_SHAPES}>
        <ContainerNode id="group" title="Group"><BoxNode id="member" title="Member" /></ContainerNode>
      </DiagramStyleProvider>,
    );
    expect({
      box: root.querySelector('#member')?.getAttribute('data-box-style'),
      container: root.querySelector('#group')?.getAttribute('data-container-style'),
      direction: root.querySelector('#group')?.getAttribute('data-orientation'),
    }).toEqual({ box: shape.box, container: shape.container, direction: shape.orientation });
  });

  it('explicit variants win over the placement', () => {
    const root = dom(
      <DiagramStyleProvider placement="bands">
        <ContainerNode id="group" variant="column"><BoxNode id="member" title="Member" variant="header" /></ContainerNode>
      </DiagramStyleProvider>,
    );
    expect(root.querySelector('#member')?.getAttribute('data-box-style')).toBe('header');
    expect(root.querySelector('#group')?.getAttribute('data-orientation')).toBe('column');
  });

  it('a lane stays a row whatever the placement', () => {
    const root = dom(<DiagramStyleProvider placement="planes"><ContainerNode id="lane" variant="lane" /></DiagramStyleProvider>);
    expect(root.querySelector('#lane')?.getAttribute('data-orientation')).toBe('row');
  });

  it('rejects an unknown placement', () => {
    expect(() => dom(<DiagramStyleProvider placement={'spiral' as never}><BoxNode title="x" /></DiagramStyleProvider>)).toThrow(/Unknown diagram placement: spiral/);
  });
});
