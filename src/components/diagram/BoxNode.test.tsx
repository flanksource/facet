import { describe, it, expect } from 'vitest';
import { deriveBorderClass } from './BoxNode';

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
