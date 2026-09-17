import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Arrow from './Arrow';
import BoxNode from './BoxNode';
import DiagreDiagram, { collectGraph, layoutGraph } from './DiagreDiagram';

const gapX = { min: 40, max: 80 };
const gapY = { min: 24, max: 48 };

describe('DiagreDiagram', () => {
  it('infers direct nodes, arrows, and port endpoints from JSX', () => {
    const graph = collectGraph(
      <>
        <BoxNode id="source" title="Source" />
        <BoxNode id="target" title="Target" ports={[{ id: 'target-api', position: 'left-middle', label: 'API' }]} />
        <Arrow from="source" to="target-api" />
      </>,
    );

    expect(graph.nodes.map(({ id }) => id)).toEqual(['source', 'target']);
    expect(graph.edges).toEqual([{ from: 'source', to: 'target' }]);
  });

  it('keeps horizontal node gaps within responsive bounds', () => {
    const nodes = [
      { id: 'source', width: 100, height: 60 },
      { id: 'target', width: 100, height: 60 },
    ];
    const edges = [{ from: 'source', to: 'target' }];
    const narrow = layoutGraph({ nodes, edges, direction: 'LR', gapX, gapY, availableWidth: 220, availableHeight: 0 });
    const wide = layoutGraph({ nodes, edges, direction: 'LR', gapX, gapY, availableWidth: 400, availableHeight: 0 });

    expect(narrow.positions.target.x - narrow.positions.source.x - 100).toBeCloseTo(gapX.min);
    expect(wide.positions.target.x - wide.positions.source.x - 100).toBeCloseTo(gapX.max);
  });

  it('applies vertical and cross-axis spacing to a branching graph', () => {
    const layout = layoutGraph({
      nodes: [
        { id: 'source', width: 100, height: 60 },
        { id: 'left', width: 100, height: 60 },
        { id: 'right', width: 100, height: 60 },
      ],
      edges: [{ from: 'source', to: 'left' }, { from: 'source', to: 'right' }],
      direction: 'TB',
      gapX,
      gapY,
      availableWidth: 0,
      availableHeight: 180,
    });

    expect(layout.positions.left.y - layout.positions.source.y - 60).toBeGreaterThanOrEqual(gapY.min);
    expect(Math.abs(layout.positions.right.x - layout.positions.left.x) - 100).toBeGreaterThanOrEqual(gapX.min);
  });

  it('rejects nested layout wrappers and missing endpoints', () => {
    expect(() => collectGraph(<div><BoxNode id="source" title="Source" /></div>)).toThrow(/direct/);
    expect(() => collectGraph(<><BoxNode id="source" title="Source" /><Arrow from="source" to="missing" /></>))
      .toThrow(/missing/);
  });

  it('rejects invalid gap bounds instead of silently choosing a default', () => {
    expect(() => renderToStaticMarkup(
      <DiagreDiagram direction="LR" gapX={{ min: 80, max: 40 }} gapY={gapY}>
        {(id) => <BoxNode id={id('source')} title="Source" />}
      </DiagreDiagram>,
    )).toThrow(/gapX/);
  });
});
