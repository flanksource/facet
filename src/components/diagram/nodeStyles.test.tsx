import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import BoxNode from './BoxNode';
import ContainerNode from './ContainerNode';
import { BOX_STYLES, CONTAINER_STYLES } from './nodeStyles';

function dom(element: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(element);
  return root;
}

describe('diagram vocabulary nodes', () => {
  it('renders the default header and body with legible backgrounds', () => {
    const root = dom(<BoxNode id="default" title="Service">Details</BoxNode>);
    expect(root.querySelector<HTMLElement>('#default > div')?.style.backgroundColor).toBe('rgb(45, 125, 228)');
    expect(root.querySelector<HTMLElement>('#default > div:last-child')?.style.backgroundColor).toBe('rgb(247, 251, 254)');
  });
  it.each(BOX_STYLES)('%s keeps content and its endpoint outside the port chips', (variant) => {
    const root = dom(<BoxNode id="api" title="Run API" variant={variant}
      description="Validates requests" ports={[{ id: 'api-port', position: 'top-middle', label: 'JSON' }]}>
      <span>Request details</span>
    </BoxNode>);
    expect(root.querySelector('#api')?.textContent).toBe('Run APIValidates requestsRequest details');
    expect(root.querySelector('#api')?.contains(root.querySelector('#api-port'))).toBe(false);
  });

  it.each(['dashed', 'ghost'] as const)('%s uses a dashed outline', (variant) => {
    expect(dom(<BoxNode id="planned" title="Gateway" variant={variant} />)
      .querySelector('#planned')?.classList.contains('border-dashed')).toBe(true);
  });

  it('pill, tile and stacked use distinct geometry', () => {
    expect(dom(<BoxNode id="pill" title="Scheduler" variant="pill" />).querySelector('#pill')?.className).toContain('rounded-full');
    expect(dom(<BoxNode id="tile" title="Router" variant="tile" />).querySelector('#tile')?.className).toContain('aspect-square');
    expect(dom(<BoxNode id="stack" title="Runtime" variant="stacked" />).querySelector('[data-node-stack]')).not.toBeNull();
  });

  it.each(CONTAINER_STYLES)('%s preserves group labels and arbitrary children', (variant) => {
    const root = dom(<ContainerNode id="network" variant={variant} title="Network" tag="Private"
      description="Trust boundary" footer="Two zones"><BoxNode id="worker" title="Worker" /></ContainerNode>);
    expect(root.querySelector('#network')?.textContent).toBe('PrivateNetworkTrust boundaryWorkerTwo zones');
    expect(root.querySelector('#network #worker')).not.toBeNull();
  });

  it('nested containers retain independent IDs and border styles', () => {
    const root = dom(<ContainerNode id="region" variant="region"><ContainerNode id="subnet" variant="binding" /></ContainerNode>);
    expect(root.querySelector('#region')?.classList.contains('border-dashed')).toBe(true);
    expect(root.querySelector('#region #subnet')?.classList.contains('border-solid')).toBe(true);
  });

  it('distinguishes tinted nodes from grouping fills and keeps boundaries transparent', () => {
    const root = dom(<ContainerNode id="group"><BoxNode id="node" title="API" variant="tinted" /></ContainerNode>);
    expect(root.querySelector<HTMLElement>('#group')?.style.backgroundColor).not.toBe(root.querySelector<HTMLElement>('#node')?.style.backgroundColor);
    const boundary = dom(<ContainerNode id="boundary" variant="boundary" />);
    expect(boundary.querySelector<HTMLElement>('#boundary')?.style.backgroundColor).toBe('transparent');
  });
});
