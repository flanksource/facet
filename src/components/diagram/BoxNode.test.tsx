import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BoxNode, { deriveBorderClass, portPlacement, type PortPosition } from './BoxNode';

// deriveBorderClass maps a Tailwind bg-{color}-{shade} class to the matching
// border-{color}-600 class so BoxNode can auto-derive its border from a
// className fallback. DOM rendering of BoxNode is covered by the live-render
// end-to-end check (examples/kitchen-sink/DataFlowDiagram.tsx).
describe('deriveBorderClass', () => {
  it.each([
    ['bg-blue-600', 'border-blue-600'],
    ['bg-emerald-50', 'border-emerald-600'],
    ['px-2 bg-red-500 text-white', 'border-red-600'],
  ])('maps %s to %s', (input, expected) => {
    expect(deriveBorderClass(input)).toBe(expected);
  });

  it('returns undefined when no bg-*-* class is present', () => {
    expect(deriveBorderClass('px-3 text-white')).toBeUndefined();
    expect(deriveBorderClass(undefined)).toBeUndefined();
  });
});

// A box shadow makes Chromium emit a PDF soft mask, and some PDF viewers
// flatten those to opaque grey blocks. Print templates need to opt out.
describe('shadow', () => {
  it('applies shadow-lg by default', () => {
    expect(renderToStaticMarkup(<BoxNode title="Node" />)).toContain('shadow-lg');
  });

  it('replaces the default with the given shadow class', () => {
    const markup = renderToStaticMarkup(<BoxNode title="Node" shadow="shadow-none" />);

    expect(markup).toContain('shadow-none');
    expect(markup).not.toContain('shadow-lg');
  });
});

// A port is a chip docked onto the box border — an endpoint an arrow can
// terminate on. It cannot live inside the box: BoxNode's root is
// overflow-hidden so rounded-xl clips the header's square corners, and anything
// overhanging that border would be clipped away. portPlacement therefore drives
// a grid wrapper whose centre cell is the box and whose edge slots hold ports.
describe('portPlacement', () => {
  // Alignment along the edge is auto margins, not alignSelf, so several ports
  // share one edge slot side by side instead of stacking on separate rows.
  it.each([
    ['top-left', 'top', undefined, 'auto'],
    ['top-middle', 'top', 'auto', 'auto'],
    ['top-right', 'top', 'auto', undefined],
    ['bottom-left', 'bottom', undefined, 'auto'],
    ['bottom-middle', 'bottom', 'auto', 'auto'],
    ['bottom-right', 'bottom', 'auto', undefined],
  ])('places %s on the %s edge with marginLeft %s / marginRight %s', (position, edge, left, right) => {
    const placement = portPlacement(position as PortPosition);

    expect(placement.edge).toBe(edge);
    expect(placement.style.marginLeft).toBe(left);
    expect(placement.style.marginRight).toBe(right);
  });

  it.each([
    ['left-top', 'left', undefined, 'auto'],
    ['left-middle', 'left', 'auto', 'auto'],
    ['left-bottom', 'left', 'auto', undefined],
    ['right-top', 'right', undefined, 'auto'],
    ['right-middle', 'right', 'auto', 'auto'],
    ['right-bottom', 'right', 'auto', undefined],
  ])('places %s on the %s edge with marginTop %s / marginBottom %s', (position, edge, top, bottom) => {
    const placement = portPlacement(position as PortPosition);

    expect(placement.edge).toBe(edge);
    expect(placement.style.marginTop).toBe(top);
    expect(placement.style.marginBottom).toBe(bottom);
  });

  // `size` is the extent along the docked edge, which is a width on the
  // horizontal edges and a height on the vertical ones. Percentages resolve
  // against the grid's centre cell, which is the box.
  it('applies size as a width on the top and bottom edges', () => {
    const placement = portPlacement('top-middle', '50%');

    expect(placement.style.width).toBe('50%');
    expect(placement.style.height).toBeUndefined();
  });

  it('applies size as a height on the left and right edges', () => {
    const placement = portPlacement('left-middle', '50%');

    expect(placement.style.height).toBe('50%');
    expect(placement.style.width).toBeUndefined();
  });

  it('leaves the chip content-sized when no size is given', () => {
    expect(portPlacement('top-middle').style.width).toBeUndefined();
    expect(portPlacement('left-middle').style.height).toBeUndefined();
  });

  // The chip overlaps the box's 2px border on its docked side so the two read
  // as one shape. A bare number lets React append the unit, which also keeps
  // the mixed-units lint rule quiet — it only matches quoted px strings.
  it.each([
    ['top-middle', 'marginBottom'],
    ['bottom-middle', 'marginTop'],
    ['left-middle', 'marginRight'],
    ['right-middle', 'marginLeft'],
  ])('pulls a %s chip onto the border via %s', (position, margin) => {
    const style = portPlacement(position as PortPosition).style as Record<string, unknown>;

    expect(style[margin]).toBe(-2);
  });

  it.each([
    ['top-middle', 'rounded-t-md'],
    ['bottom-middle', 'rounded-b-md'],
    ['left-middle', 'rounded-l-md'],
    ['right-middle', 'rounded-r-md'],
  ])('drops the rounding on the docked side of a %s chip', (position, rounded) => {
    expect(portPlacement(position as PortPosition).rounded).toBe(rounded);
  });

  // An unknown position would otherwise render a chip with no placement at all,
  // silently detached from the edge the caller asked for.
  it('throws on an unknown position', () => {
    expect(() => portPlacement('sideways' as PortPosition)).toThrow(/sideways/);
  });
});

// Every arrow resolves its endpoint with getElementById, so whichever element
// carries `id` decides where arrows land. The id stays on the bordered box, and
// the grid wrapper only appears when there are ports — otherwise the markup is
// unchanged and no existing diagram's arrows move.
describe('ports', () => {
  it('renders the bordered box as the root when there are no ports', () => {
    const markup = renderToStaticMarkup(<BoxNode id="svc" title="Service" />);

    expect(markup.startsWith('<div id="svc"')).toBe(true);
  });

  it('renders the same markup for an absent and an empty port list', () => {
    expect(renderToStaticMarkup(<BoxNode id="svc" title="Service" ports={[]} />))
      .toBe(renderToStaticMarkup(<BoxNode id="svc" title="Service" />));
  });

  it('wraps the box in a grid but keeps the id on the box itself', () => {
    const markup = renderToStaticMarkup(
      <BoxNode id="svc" title="Service" ports={[{ position: 'top-middle', label: 'JSON' }]} />,
    );

    expect(markup.startsWith('<div id="svc"')).toBe(false);
    expect(markup).toContain('id="svc"');
    expect(markup).toContain('JSON');
  });

  it('gives a port its own id so an arrow can terminate on it', () => {
    const markup = renderToStaticMarkup(
      <BoxNode id="svc" title="Service" ports={[{ id: 'svc-api', position: 'top-left', label: 'API' }]} />,
    );

    expect(markup).toContain('id="svc-api"');
  });

  // Each slot runs along its own edge and packs ports against the box, so two
  // ports on one edge sit side by side rather than on separate rows.
  it('lays each edge slot out along its edge, packed against the box', () => {
    const markup = renderToStaticMarkup(
      <BoxNode
        title="Service"
        ports={[
          { position: 'top-left', label: 'A' },
          { position: 'bottom-left', label: 'B' },
          { position: 'left-top', label: 'C' },
          { position: 'right-top', label: 'D' },
        ]}
      />,
    );

    expect(markup).toContain('col-start-2 row-start-1 flex flex-row items-end');
    expect(markup).toContain('col-start-2 row-start-3 flex flex-row items-start');
    expect(markup).toContain('col-start-1 row-start-2 flex flex-col items-end');
    expect(markup).toContain('col-start-3 row-start-2 flex flex-col items-start');
  });

  it('groups ports onto one slot per edge', () => {
    const markup = renderToStaticMarkup(
      <BoxNode
        title="Service"
        ports={[
          { position: 'top-left', label: 'A' },
          { position: 'top-right', label: 'B' },
          { position: 'bottom-middle', label: 'C' },
        ]}
      />,
    );

    expect(markup.match(/row-start-1/g)).toHaveLength(1);
    expect(markup.match(/row-start-3/g)).toHaveLength(1);
  });

  // The chip is part of the box, so it takes the box's header colour unless the
  // port names its own — an endpoint of a different kind reads as a different
  // colour without restating the whole node.
  // A colour off the palette keeps the count unambiguous: the border falls back
  // to COLORS.primary, so only the header and the chip carry this one.
  it('defaults the chip fill to the box header colour', () => {
    const markup = renderToStaticMarkup(
      <BoxNode title="Service" headerColor="#123456" ports={[{ position: 'top-middle', label: 'A' }]} />,
    );

    expect(markup.match(/#123456/g)).toHaveLength(2);
  });

  it('lets a port override the chip fill', () => {
    const markup = renderToStaticMarkup(
      <BoxNode
        title="Service"
        headerColor="#2d7de4"
        ports={[{ position: 'top-middle', label: 'A', color: '#10b981' }]}
      />,
    );

    expect(markup).toContain('#10b981');
  });

  it('renders node instead of the icon and label chip', () => {
    const markup = renderToStaticMarkup(
      <BoxNode
        title="Service"
        ports={[{ position: 'top-middle', label: 'ignored', node: <span>custom</span> }]}
      />,
    );

    expect(markup).toContain('custom');
    expect(markup).not.toContain('ignored');
  });
});
