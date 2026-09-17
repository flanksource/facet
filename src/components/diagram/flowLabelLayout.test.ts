import { describe, expect, it } from 'vitest';

import { flowStepLabelColumns } from './flowLabelLayout';
import type { FlowStep } from './flowTypes';

type Position = 'top' | 'bottom';

interface Placement {
  key: string;
  lane: string;
  column: number;
  position: Position;
  fullColor?: boolean;
  labelColumns?: number;
}

const COLUMNS = 7;
const DEFAULT_MAX_LABEL_COLUMNS = 2;

function spanOf(target: Placement, others: Placement[] = [], maxLabelColumns = DEFAULT_MAX_LABEL_COLUMNS) {
  const placements = [target, ...others];
  const steps: FlowStep[] = placements.map(({ position: _position, ...step }) => ({ ...step, number: step.key, action: step.key }));
  return flowStepLabelColumns({
    step: steps[0],
    steps,
    labelPositions: new Map(placements.map((placement) => [placement.key, placement.position])),
    columns: COLUMNS,
    maxLabelColumns,
  });
}

const middle: Placement = { key: 'target', lane: 'ops', column: 4, position: 'bottom' };

describe('flowStepLabelColumns', () => {
  it.each([
    ['an isolated step spans maxLabelColumns', middle, [], 2],
    ['a first-column step spans 1 so it stays clear of the lane labels', { ...middle, column: 1 }, [], 1],
    ['a last-column step spans 1 so it stays inside the frame', { ...middle, column: COLUMNS }, [], 1],
    ['an isolated column-2 step spans 2', { ...middle, column: 2 }, [], 2],
    ['an adjacent same-lane step with the same label position limits the span to 1', middle, [{ ...middle, key: 'next', column: 5 }], 1],
    ['an adjacent same-lane step with the opposite label position leaves the span at 2', middle, [{ ...middle, key: 'next', column: 5, position: 'top' as const }], 2],
    ['an adjacent same-lane fullColor step with the opposite label position limits the span to 1', middle, [{ ...middle, key: 'next', column: 5, position: 'top' as const, fullColor: true }], 1],
    ['a conflicting same-lane step two columns away leaves the span at 2', middle, [{ ...middle, key: 'later', column: 6 }], 2],
    ['an adjacent step in a different lane leaves the span at 2', middle, [{ ...middle, key: 'next', lane: 'finance', column: 5 }], 2],
    ['a per-step labelColumns of 1 caps the span at 1', { ...middle, labelColumns: 1 }, [], 1],
  ] satisfies [string, Placement, Placement[], number][])('%s', (_name, target, others, expected) => {
    expect(spanOf(target, others)).toBe(expected);
  });

  it('an isolated step spans a fractional maxLabelColumns of 1.5', () => {
    expect(spanOf(middle, [], 1.5)).toBe(1.5);
  });
});
