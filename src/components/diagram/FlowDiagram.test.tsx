import type React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FlowDiagram, { flowAnchor, flowEdgeArrowProps, flowEdgeEndAnchor, type FlowEdgeArrowInput } from './FlowDiagram';

function renderDom(element: React.ReactElement): HTMLDivElement {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(element);
  return host;
}

const lanes = [
  { key: 'requester', label: 'Requester', detail: 'Starts the flow', color: '#2563eb' },
  { key: 'approver', label: 'Approver', detail: 'Checks the request', color: '#d97706' },
] as const;

const steps = [
  { key: 'submit', lane: 'requester', column: 1, number: 1, action: 'Submit', detail: 'Create request' },
  { key: 'approve', lane: 'approver', column: 2, number: 2, action: 'Approve', detail: 'Record decision' },
] as const;

describe('FlowDiagram', () => {
  it('renders reusable lanes, numbered steps, and scoped connectors', () => {
    const markup = renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[...steps]}
        edges={[{ from: 'submit', to: 'approve' }]}
        columns={2}
      />,
    );

    expect(markup).toContain('data-flow-lane="requester"');
    expect(markup).toContain('data-flow-step="approve"');
    expect(markup).toContain('Requester');
    expect(markup).toContain('Approve');
    expect(markup).toContain('data-facet-arrow');
  });

  it('clips lane backgrounds to the framed border radius', () => {
    const markup = renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[...steps]}
        columns={2}
      />,
    );

    expect(markup).toContain('relative break-inside-avoid-page overflow-hidden rounded-xl border');
  });

  it('renders step narratives below the swimlane without repeating consecutive lane labels', () => {
    const markup = renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[
          { ...steps[0], narrative: 'The requester submits the evidence.' },
          { ...steps[0], key: 'revise', column: 2, number: 2, action: 'Revise', narrative: 'They correct the request.' },
          { ...steps[1], column: 3, number: 3, narrative: 'The approver records the decision.' },
        ]}
        columns={3}
      />,
    );

    expect(markup.indexOf('data-flow-step-list')).toBeGreaterThan(markup.indexOf('data-flow-frame'));
    expect(markup).toContain('data-flow-step-narrative="submit"');
    expect(markup).toContain('The requester submits the evidence.');
    expect(markup.match(/data-flow-step-actor="requester"/g)).toHaveLength(1);
    expect(markup.match(/data-flow-step-actor="approver"/g)).toHaveLength(1);
    expect(markup).not.toContain('Journey steps');
  });

  it('can omit chrome while striping and separating complete lane rows', () => {
    const markup = renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[...steps]}
        columns={2}
        showAlternatingLaneBackgrounds
        showFrame={false}
        showLaneDivider={false}
        showLaneDetails={false}
      />,
    );

    expect(markup).toContain('data-flow-frame="false"');
    expect(markup).toContain('relative break-inside-avoid-page overflow-visible');
    expect(markup).toContain('data-flow-lane-divider="false"');
    expect(markup).toContain('data-flow-lane-background="requester"');
    expect(markup).toContain('grid-column:1 / -1;grid-row:1;background-color:#2d7de4;opacity:0.08');
    expect(markup).toContain('data-flow-lane-background="approver"');
    expect(markup).toContain('grid-column:1 / -1;grid-row:2;background-color:transparent');
    expect(markup).toContain('data-flow-lane-separator');
    expect(markup).toContain('border-color:#62758a;opacity:0.35');
    expect(markup).not.toContain('border-r');
    expect(markup).not.toContain('Starts the flow');
    expect(markup).not.toContain('Checks the request');
  });

  it('connects to the target edge that faces the source lane', () => {
    expect(flowEdgeEndAnchor(0, 0)).toBe('left');
    expect(flowEdgeEndAnchor(0, 1)).toBe('top');
    expect(flowEdgeEndAnchor(1, 0)).toBe('bottom');
  });

  it('applies custom offsets to step placements and edge anchors', () => {
    const markup = renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], placementOffset: { x: 6, y: -4 } }, steps[1]]}
        edges={[{
          from: 'submit',
          to: 'approve',
          startOffset: { y: 3 },
          endOffset: { x: -2 },
          gridBreak: '80%',
        }]}
        columns={2}
      />,
    );

    expect(markup).toContain('transform:translate(6px, -4px)');
    expect(flowAnchor('right', { y: 3 })).toEqual({ position: 'right', offset: { y: 3 } });
    expect(flowAnchor('top', { x: -2 })).toEqual({ position: 'top', offset: { x: -2 } });
  });

  it('fails when a step refers to a lane that is not present', () => {
    expect(() => renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], lane: 'missing' }]}
        columns={2}
      />,
    )).toThrow(/missing/);
  });

  it('fails when an edge refers to an unknown step', () => {
    expect(() => renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[...steps]}
        edges={[{ from: 'submit', to: 'missing' }]}
        columns={2}
      />,
    )).toThrow(/submit -> missing/);
  });

  it('fails when a custom offset or grid break is invalid', () => {
    expect(() => renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], placementOffset: { x: Number.NaN } }]}
        columns={2}
      />,
    )).toThrow(/placement offset/);

    expect(() => renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[...steps]}
        edges={[{ from: 'submit', to: 'approve', gridBreak: '80' }]}
        columns={2}
      />,
    )).toThrow(/grid break/);
  });
});

const arrowColor = '#2d7de4';
const mutedColor = '#62758a';
const laneIndex = new Map([['requester', 0], ['approver', 1]]);
const staticDash = { strokeLen: 4, nonStrokeLen: 3 };

function edgeProps(edge: FlowEdgeArrowInput['edge'], source: FlowEdgeArrowInput['source'] = steps[0], target: FlowEdgeArrowInput['target'] = steps[1]) {
  return flowEdgeArrowProps({
    edge,
    source,
    target,
    laneIndex,
    stepOffsetMm: 28,
    rowHeightMm: 28,
    arrowColor,
    mutedColor,
    textColor: '#0f172a',
  });
}

describe('FlowDiagram edges', () => {
  it('renders primary edges as the solid right-to-facing-edge grid connector', () => {
    expect(edgeProps({ from: 'submit', to: 'approve' })).toEqual({
      path: 'grid',
      gridBreak: '100%',
      startAnchor: 'right',
      endAnchor: 'top',
      color: arrowColor,
      dashness: false,
      strokeWidth: 1,
      headSize: 3,
    });
  });

  it('renders an edge label as a white pill on the connector midpoint', () => {
    const props = edgeProps({ from: 'submit', to: 'approve', label: 'Approved' });
    const pill = renderDom(props.labels!.middle).querySelector('[data-flow-edge-label]');

    expect(pill?.textContent).toBe('Approved');
    expect(pill?.getAttribute('class')).toContain('text-[6.5pt]');
    expect(pill?.getAttribute('style')).toContain('background-color:#ffffff');
  });

  it('places an edge annotation above its label', () => {
    const props = edgeProps({ from: 'submit', to: 'approve', label: 'Valid evidence', labelAbove: <span>Q03 Email-MFA validity window</span> });
    const dom = renderDom(props.labels!.middle);

    expect(dom.querySelector('[data-flow-edge-label-above]')?.textContent).toBe('Q03 Email-MFA validity window');
    expect(dom.querySelector('[data-flow-edge-label]')?.textContent).toBe('Valid evidence');
  });

  it('renders alternate edges as muted static dashes that split from forward edges halfway and land on the target left edge', () => {
    expect(edgeProps({ from: 'submit', to: 'approve', variant: 'alternate' })).toEqual({
      path: 'grid',
      gridBreak: '50%',
      startAnchor: 'right',
      endAnchor: 'left',
      color: mutedColor,
      dashness: staticDash,
      strokeWidth: 1,
      headSize: 3,
    });
  });

  it.each([
    [1, 0.8],
    [2, 0.4],
  ])('routes a same-lane return edge spanning %i column(s) bottom-to-bottom with a lane-sized dip', (span, curveness) => {
    const rework = { ...steps[0], key: 'rework', column: 1 + span };
    expect(edgeProps({ from: 'rework', to: 'submit', variant: 'return' }, rework, steps[0])).toEqual({
      path: 'smooth',
      curveness,
      startAnchor: 'bottom',
      endAnchor: 'bottom',
      color: arrowColor,
      dashness: staticDash,
      strokeWidth: 1,
      headSize: 3,
    });
  });

  it.each([
    ['up to an earlier lane', 'bottom', { ...steps[1], column: 2 }, { ...steps[0], column: 1 }],
    ['down to a later lane', 'top', { ...steps[0], key: 'approve', column: 2 }, { ...steps[1], key: 'submit', column: 1 }],
  ] as const)('routes a cross-lane return edge %s as a grid L out of the source left edge into the target %s edge', (_name, endAnchor, source, target) => {
    expect(edgeProps({ from: 'approve', to: 'submit', variant: 'return' }, source, target)).toEqual({
      path: 'grid',
      gridBreak: '100%',
      startAnchor: 'left',
      endAnchor,
      color: arrowColor,
      dashness: staticDash,
      strokeWidth: 1,
      headSize: 3,
    });
  });

  it.each([
    ['a later column', 2, 3],
    ['the same column', 2, 2],
  ])('fails when a return edge targets %s', (_name, sourceColumn, targetColumn) => {
    expect(() => renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], column: targetColumn }, { ...steps[1], column: sourceColumn }]}
        edges={[{ from: 'approve', to: 'submit', variant: 'return' }]}
        columns={3}
      />,
    )).toThrow(`return edge approve -> submit must target an earlier column (source column ${sourceColumn}, target column ${targetColumn})`);
  });

  it('fails when a return edge sets a grid break it cannot use', () => {
    expect(() => renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], column: 1 }, { ...steps[1], column: 2 }]}
        edges={[{ from: 'approve', to: 'submit', variant: 'return', gridBreak: '50%' }]}
        columns={2}
      />,
    )).toThrow('return edge approve -> submit routes itself and cannot use a grid break');
  });
});

describe('FlowDiagram steps and lanes', () => {
  it('renders a step tag in the lane and at the start of its narrative', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[
          { ...steps[0], tag: { label: 'Needs detail' }, narrative: 'The requester submits.' },
          { ...steps[1], tag: { label: 'Owner review', color: '#7c3aed' } },
        ]}
        columns={2}
      />,
    );

    const laneTag = dom.querySelector('[data-flow-step="submit"] [data-flow-step-tag]');
    const narrativeLine = dom.querySelector('[data-flow-step-narrative="submit"] [data-flow-step-narrative-text]');
    expect(laneTag?.textContent).toBe('Needs detail');
    expect(laneTag?.getAttribute('style')).toContain('background-color:#b45309');
    expect(narrativeLine?.firstElementChild?.getAttribute('data-flow-step-tag')).toBe('Needs detail');
    expect(dom.querySelector('[data-flow-step="approve"] [data-flow-step-tag]')?.getAttribute('style')).toContain('background-color:#7c3aed');
  });

  it('fails when one tag label is given two colours, because the legend could not describe it', () => {
    expect(() => renderToStaticMarkup(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], tag: { label: 'Needs detail' } }, { ...steps[1], tag: { label: 'Needs detail', color: '#7c3aed' } }]}
        columns={2}
      />,
    )).toThrow('tag "Needs detail" on step "approve" uses colour #7c3aed, but an earlier step uses default');
  });

  it('draws person lanes with a circular icon badge and system lanes with a rounded square', () => {
    const dom = renderDom(
      <FlowDiagram lanes={[lanes[0], { ...lanes[1], kind: 'system' }]} steps={[...steps]} columns={2} />,
    );

    const personBadge = dom.querySelector('[data-flow-lane="requester"] [data-flow-lane-badge]');
    const systemBadge = dom.querySelector('[data-flow-lane="approver"] [data-flow-lane-badge]');
    expect(personBadge?.getAttribute('data-flow-lane-badge')).toBe('person');
    expect(personBadge?.classList.contains('rounded-full')).toBe(true);
    expect(systemBadge?.getAttribute('data-flow-lane-badge')).toBe('system');
    expect(systemBadge?.classList.contains('rounded-md')).toBe(true);
    expect(systemBadge?.classList.contains('rounded-full')).toBe(false);
  });

  it('pins every badge to the lane centre regardless of label length', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[
          { ...steps[0], action: 'Go' },
          { ...steps[0], key: 'long', column: 2, number: 2, action: 'Validate the complete onboarding pack with every signatory', detail: 'Contract, proposal and letter of intent', tag: { label: 'Needs detail' } },
        ]}
        columns={2}
      />,
    );

    for (const key of ['submit', 'long']) {
      const node = dom.querySelector(`[data-flow-step="${key}"]`)!;
      expect(node.getAttribute('style')).toContain('top:calc(50% - 4.5mm)');
      expect(node.children[0].getAttribute('style')).toContain('height:7mm');
      expect(node.children[0].hasAttribute('data-flow-step-badge-slot')).toBe(true);
      expect(node.children[1].getAttribute('data-flow-step-label')).toBe('bottom');
    }
  });

  it('hangs the label above the badge when connectors arrive from below or loop underneath', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[1], column: 1 }, { ...steps[0], column: 2 }, { ...steps[0], key: 'rework', column: 3, number: 3 }]}
        edges={[{ from: 'approve', to: 'submit' }, { from: 'rework', to: 'submit', variant: 'return' }]}
        columns={3}
      />,
    );

    for (const key of ['submit', 'rework']) {
      const node = dom.querySelector(`[data-flow-step="${key}"]`)!;
      expect(node.getAttribute('style')).toContain('bottom:calc(50% - 4.5mm)');
      expect(node.children[0].getAttribute('data-flow-step-label')).toBe('top');
      expect(node.children[1].hasAttribute('data-flow-step-badge-slot')).toBe(true);
    }
  });

  it.each([
    ['from a lower lane lands on its bottom edge, so the target label hangs above', ['requester', 'approver'], 'top'],
    ['from an upper lane lands on its top edge, so the target label stays below', ['approver', 'requester'], 'bottom'],
  ] as const)('places the label of a cross-lane return target: a return %s', (_name, [targetLane, sourceLane], label) => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], lane: targetLane, column: 1 }, { ...steps[1], lane: sourceLane, column: 2 }]}
        edges={[{ from: 'approve', to: 'submit', variant: 'return' }]}
        columns={2}
      />,
    );

    const labelOf = (key: string) => dom.querySelector(`[data-flow-step="${key}"] [data-flow-step-label]`)?.getAttribute('data-flow-step-label');
    expect([labelOf('submit'), labelOf('approve')]).toEqual([label, 'bottom']);
  });

  it('keeps the label below the badge when only an alternate edge arrives from below, since it lands on the left edge', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[1], column: 1 }, { ...steps[0], column: 2 }]}
        edges={[{ from: 'approve', to: 'submit', variant: 'alternate' }]}
        columns={2}
      />,
    );

    expect(dom.querySelector('[data-flow-step="submit"]')?.children[1].getAttribute('data-flow-step-label')).toBe('bottom');
  });

  it('uses an explicit label side and minimum width for a step annotation', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], labelPosition: 'top', labelWidthMm: 30 }, { ...steps[1], column: 2 }]}
        columns={2}
      />,
    );

    const step = dom.querySelector('[data-flow-step="submit"]') as HTMLElement;
    expect(step.querySelector('[data-flow-step-label]')?.getAttribute('data-flow-step-label')).toBe('top');
    expect(step.style.width).toBe('30mm');
  });

  it('positions a step annotation independently of its action label', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], annotation: <span>Q03 Validity window</span>, annotationPlacement: { xMm: 2, yMm: 12, widthMm: 28 } }, steps[1]]}
        columns={2}
      />,
    );

    const annotation = dom.querySelector('[data-flow-step-annotation="submit"]') as HTMLElement;
    expect(annotation.textContent).toBe('Q03 Validity window');
    expect(annotation.style.width).toBe('28mm');
    expect(annotation.getAttribute('style')).toContain('left:calc(50% + 2mm)');
    expect(annotation.getAttribute('style')).toContain('top:calc(50% + 12mm)');
    expect(dom.querySelector('[data-flow-step="submit"] [data-flow-step-label]')?.textContent).toContain('Submit');
  });
});

describe('FlowDiagram legend', () => {
  const legendSteps = [
    { ...steps[0], tag: { label: 'Needs detail' } },
    { ...steps[1], fullColor: true, tag: { label: 'Needs detail' } },
    { ...steps[0], key: 'optional', column: 2, number: 3, action: 'Optional' },
  ];
  const legendEdges = [
    { from: 'submit', to: 'approve', label: 'Approved' },
    { from: 'submit', to: 'optional', variant: 'alternate' as const },
  ];

  it('omits the legend unless requested', () => {
    const dom = renderDom(<FlowDiagram lanes={[...lanes]} steps={legendSteps} edges={legendEdges} columns={2} />);

    expect(dom.querySelector('[data-flow-legend]')).toBeNull();
  });

  it('lists only the edge variants, outcome, tags and lane kinds the diagram uses', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[lanes[0], { ...lanes[1], kind: 'system' }]}
        steps={legendSteps.map((step) => ({ ...step, narrative: `Narrative for ${step.key}` }))}
        edges={legendEdges}
        columns={2}
        showLegend
        legendLabels={{ alternate: 'Exception path' }}
      />,
    );

    const items = [...dom.querySelectorAll('[data-flow-legend-item]')].map((item) => [item.getAttribute('data-flow-legend-item'), item.textContent]);
    expect(items).toEqual([
      ['primary', 'Process flow'],
      ['alternate', 'Exception path'],
      ['outcome', 'Outcome'],
      ['tag', 'Needs detail'],
      ['person', 'Person'],
      ['system', 'System'],
    ]);
    const markup = dom.innerHTML;
    expect(markup.indexOf('data-flow-legend')).toBeGreaterThan(markup.indexOf('data-flow-frame'));
    expect(markup.indexOf('data-flow-legend')).toBeLessThan(markup.indexOf('data-flow-step-list'));
  });

  it('shows the rework loop and hides lane kinds when every lane has the same kind', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[...lanes]}
        steps={[{ ...steps[0], column: 1 }, { ...steps[1], column: 2 }]}
        edges={[{ from: 'approve', to: 'submit', variant: 'return' }]}
        columns={2}
        showLegend
      />,
    );

    const items = [...dom.querySelectorAll('[data-flow-legend-item]')].map((item) => [item.getAttribute('data-flow-legend-item'), item.textContent]);
    expect(items).toEqual([['return', 'Rework loop']]);
  });

  it('keeps custom legend content in the same bar as flow keys', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={[...lanes]}
        steps={legendSteps}
        edges={legendEdges}
        columns={2}
        showLegend
        legendExtra={<span data-testid="callout-legend">Q Decision needed</span>}
      />,
    );

    const legend = dom.querySelector('[data-flow-legend]');
    expect(legend?.querySelector('[data-testid="callout-legend"]')?.textContent).toBe('Q Decision needed');
    expect(legend?.querySelector('[data-flow-legend-item="primary"]')).not.toBeNull();
    expect(dom.querySelectorAll('[data-flow-legend]')).toHaveLength(1);
  });
});
