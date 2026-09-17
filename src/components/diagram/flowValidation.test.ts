import { describe, expect, it } from 'vitest';

import type { FlowStep } from './flowTypes';
import { validateFlow } from './flowValidation';

const lanes = [
  { key: 'requester', label: 'Requester', color: '#2563eb' },
  { key: 'approver', label: 'Approver', color: '#d97706' },
];

const submit: FlowStep = { key: 'submit', lane: 'requester', column: 1, number: 1, action: 'Submit' };
const approve: FlowStep = { key: 'approve', lane: 'approver', column: 2, number: 2, action: 'Approve' };

function validate({ steps = [submit, approve], maxLabelColumns = 2 }: { steps?: FlowStep[]; maxLabelColumns?: number }) {
  return () => validateFlow({ lanes, steps, edges: [], columns: 2, maxLabelColumns });
}

describe('validateFlow label columns', () => {
  it.each([0.5, 0, Number.NaN, Number.POSITIVE_INFINITY])('fails when maxLabelColumns is %s', (maxLabelColumns) => {
    expect(validate({ maxLabelColumns })).toThrow(`FlowDiagram: maxLabelColumns must be a finite number ≥ 1, received ${maxLabelColumns}`);
  });

  it.each([0.5, 0, Number.NaN, Number.POSITIVE_INFINITY])('fails when a step labelColumns is %s', (labelColumns) => {
    expect(validate({ steps: [{ ...submit, labelColumns }, approve] })).toThrow(`FlowDiagram: step "submit" labelColumns must be a finite number ≥ 1, received ${labelColumns}`);
  });

  it('accepts fractional label columns of at least 1', () => {
    expect(validate({ steps: [{ ...submit, labelColumns: 1.5 }, approve], maxLabelColumns: 1.25 })).not.toThrow();
  });
});

describe('validateFlow step placement', () => {
  it('fails when two steps share a lane and column, because their badges would stack', () => {
    expect(validate({ steps: [submit, { ...approve, lane: 'requester', column: 1 }] })).toThrow('FlowDiagram: steps "submit" and "approve" share lane "requester" column 1');
  });

  it('accepts two steps in the same column of different lanes', () => {
    expect(validate({ steps: [submit, { ...approve, column: 1 }] })).not.toThrow();
  });
});
