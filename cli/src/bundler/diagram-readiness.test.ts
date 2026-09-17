import { describe, expect, it } from 'vitest';
import { diagramReadiness, type DiagramReadiness, type DiagramState } from './diagram-readiness.js';

const ready: DiagramState = { ready: 'true', error: null };
const loading: DiagramState = { ready: 'false', error: null };
const unmarked: DiagramState = { ready: null, error: null };
const failed = (message: string): DiagramState => ({ ready: 'false', error: message });

const cases: { name: string; states: DiagramState[]; expected: DiagramReadiness }[] = [
  {
    name: 'empty list is settled',
    states: [],
    expected: { settled: true, errors: [], pending: 0 },
  },
  {
    name: 'all ready is settled with no errors',
    states: [ready, ready, ready],
    expected: { settled: true, errors: [], pending: 0 },
  },
  {
    name: 'ready plus errored is settled and reports the 1-based index',
    states: [ready, failed('layout overflow')],
    expected: { settled: true, errors: ['Diagram 2: layout overflow'], pending: 0 },
  },
  {
    name: 'a loading diagram keeps it unsettled',
    states: [ready, loading],
    expected: { settled: false, errors: [], pending: 1 },
  },
  {
    name: 'a diagram without a ready attribute counts as pending',
    states: [unmarked, ready],
    expected: { settled: false, errors: [], pending: 1 },
  },
  {
    name: 'multiple errors keep document order, indices and multi-line messages',
    states: [failed('first\ndetail'), ready, loading, failed('third')],
    expected: {
      settled: false,
      errors: ['Diagram 1: first\ndetail', 'Diagram 4: third'],
      pending: 1,
    },
  },
  {
    name: 'an error attribute wins even when ready is "true"',
    states: [{ ready: 'true', error: 'late failure' }],
    expected: { settled: true, errors: ['Diagram 1: late failure'], pending: 0 },
  },
];

describe('diagramReadiness', () => {
  it.each(cases)('$name', ({ states, expected }) => {
    expect(diagramReadiness(states)).toEqual(expected);
  });
});
