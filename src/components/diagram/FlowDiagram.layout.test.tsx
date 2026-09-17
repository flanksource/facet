import type React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FlowDiagram, { flowEdgeArrowProps } from './FlowDiagram';
import type { FlowIcon, FlowStep } from './flowTypes';

function renderDom(element: React.ReactElement): HTMLDivElement {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(element);
  return host;
}

const LaneIcon: FlowIcon = (props) => <svg data-lane-icon {...props} />;

const lanes = [
  { key: 'requester', label: 'Requester', detail: 'Starts the flow', color: '#2563eb', icon: LaneIcon },
  { key: 'approver', label: 'Approver', detail: 'Checks the request', color: '#d97706' },
];

const STEP_OFFSET_MM = 30;

function step(key: string, lane: string, column: number, extra: Partial<FlowStep> = {}): FlowStep {
  return { key, lane, column, number: column, action: `Action ${key}`, detail: `Detail ${key}`, ...extra };
}

function stepStyle(dom: HTMLElement, key: string) {
  return dom.querySelector(`[data-flow-step="${key}"]`)!.getAttribute('style')!;
}

describe('FlowDiagram step label span', () => {
  it.each([
    ['an isolated step stretches its label across 2 columns less the gutter', [step('draft', 'requester', 2), step('check', 'approver', 3)], 2, 'width:58mm', 'left:calc(50% - 29mm)'],
    ['adjacent same-lane steps keep their labels to 1 column less the gutter', [step('draft', 'requester', 2), step('check', 'requester', 3)], 2, 'width:28mm', 'left:calc(50% - 14mm)'],
    ['maxLabelColumns of 1 keeps an isolated step to 1 column', [step('draft', 'requester', 2), step('check', 'approver', 3)], 1, 'width:28mm', 'left:calc(50% - 14mm)'],
  ] as const)('%s', (_name, steps, maxLabelColumns, width, left) => {
    const dom = renderDom(<FlowDiagram lanes={lanes} steps={[...steps]} columns={4} stepOffsetMm={STEP_OFFSET_MM} maxLabelColumns={maxLabelColumns} />);

    const style = stepStyle(dom, 'draft');
    expect([style.includes(width), style.includes(left), style.includes('max-width'), style.includes('top:calc(50% - 4.5mm)')]).toEqual([true, true, false, true]);
    expect(dom.querySelector('[data-flow-step="draft"]')!.className).not.toMatch(/inset-x-0|mx-auto|max-w-full/);
  });

  it.each([
    ['a normal step has vertical padding only, so its label uses the full span', {}, 'padding:1mm 0'],
    ['a fullColor step keeps horizontal padding inside its coloured box', { fullColor: true }, 'padding:1mm;'],
  ])('%s', (_name, extra, padding) => {
    const dom = renderDom(<FlowDiagram lanes={lanes} steps={[step('draft', 'requester', 2, extra)]} columns={3} stepOffsetMm={STEP_OFFSET_MM} />);

    expect(stepStyle(dom, 'draft')).toContain(padding);
  });

  it('fails when maxLabelColumns is below 1', () => {
    expect(() => renderToStaticMarkup(<FlowDiagram lanes={lanes} steps={[step('draft', 'requester', 1)]} columns={1} maxLabelColumns={0.5} />))
      .toThrow('FlowDiagram: maxLabelColumns must be a finite number ≥ 1, received 0.5');
  });
});

describe('FlowDiagram lane label chrome', () => {
  it('sizes the lane padding, gap, badge and icon in millimetres', () => {
    const dom = renderDom(<FlowDiagram lanes={lanes} steps={[step('draft', 'requester', 1)]} columns={1} backgroundColor="#ffffff" />);

    const lane = dom.querySelector('[data-flow-lane="requester"]')!;
    const badge = lane.querySelector('[data-flow-lane-badge]')!;
    const icon = lane.querySelector('[data-lane-icon]')!;
    expect([lane.getAttribute('style'), badge.getAttribute('style'), icon.getAttribute('style')]).toEqual([
      'border-color:#2563eb;background-color:#ffffff;gap:1.5mm;padding:0 1.5mm',
      'width:7.5mm;height:7.5mm',
      'width:5mm;height:5mm;color:#2563eb',
    ]);
    expect(`${lane.className} ${badge.className} ${icon.getAttribute('class')}`).not.toMatch(/\b(gap-2|px-2\.5|h-8|w-8|h-5|w-5)\b/);
  });
});

describe('FlowDiagram layout check labels', () => {
  it('marks step, lane and legend text with data-facet-label names but not narrative text', () => {
    const dom = renderDom(
      <FlowDiagram
        lanes={lanes}
        steps={[step('draft', 'requester', 1, { narrative: 'The requester drafts.' }), step('check', 'approver', 2)]}
        edges={[{ from: 'draft', to: 'check' }]}
        columns={2}
        showLegend
      />,
    );

    expect([...dom.querySelectorAll('[data-facet-label]')].map((element) => [element.getAttribute('data-facet-label'), element.textContent])).toEqual([
      ['lane "requester"', 'Requester'],
      ['lane "approver"', 'Approver'],
      ['step "draft" action', 'Action draft'],
      ['step "draft" detail', 'Detail draft'],
      ['step "check" action', 'Action check'],
      ['step "check" detail', 'Detail check'],
      ['legend "primary"', 'Process flow'],
    ]);
  });

  it('marks an edge label pill with its edge name', () => {
    const props = flowEdgeArrowProps({
      edge: { from: 'draft', to: 'check', label: 'Ready' },
      source: step('draft', 'requester', 1),
      target: step('check', 'approver', 2),
      laneIndex: new Map([['requester', 0], ['approver', 1]]),
      stepOffsetMm: STEP_OFFSET_MM,
      rowHeightMm: 28,
      arrowColor: '#2d7de4',
      mutedColor: '#62758a',
      textColor: '#0f172a',
    });

    const pill = renderDom(props.labels!.middle).querySelector('[data-flow-edge-label]');
    expect(pill?.getAttribute('data-facet-label')).toBe('edge "draft" -> "check" label');
  });
});
