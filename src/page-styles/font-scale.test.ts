// @vitest-environment node
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { scaleValue } from './font-scale.mjs';

describe('scaleValue', () => {
  it.each(['0', '9', '12.5', '.5', '0009.50'])('scales the numeric form %s', (number) => {
    expect(scaleValue(`${number}pt`)).toBe(`calc(${number}pt * var(--facet-font-scale, 1))`);
  });

  it.each(['px', 'pt', 'pc', 'in', 'cm', 'mm', 'q', 'rem', 'PX', 'REM'])(
    'scales the absolute unit %s', (unit) => {
      expect(scaleValue(`9${unit}`)).toBe(`calc(9${unit} * var(--facet-font-scale, 1))`);
    },
  );

  it.each(['9', '1.2em', '80%', '9.pt', '..5pt', '1.2.3pt', '#12pt', 'text9pt', '--9pt', '-9pt', '9ptx', '9pt_'])(
    'preserves excluded or malformed value %s', (input) => {
      expect(scaleValue(input)).toBe(input);
    },
  );

  it('scales multiple tokens inside a function exactly once', () => {
    const input = 'clamp(.5pt, calc(1em + 12.5px), 2rem)';
    const expected = 'clamp(calc(.5pt * var(--facet-font-scale, 1)), calc(1em + calc(12.5px * var(--facet-font-scale, 1))), calc(2rem * var(--facet-font-scale, 1)))';
    expect(scaleValue(input)).toBe(expected);
    expect(scaleValue(expected)).toBe(expected);
  });

  it.each(['', 'em', 'pxx', '.9em'])(
    'processes a long digit run with suffix "%s" within the time budget', (suffix) => {
      const digitCount = 50_000;
      const budgetMs = 500;
      const input = `${'9'.repeat(digitCount)}${suffix}`;
      const start = performance.now();
      const result = scaleValue(input);
      const elapsed = performance.now() - start;
      expect(result).toBe(input);
      expect(elapsed).toBeLessThan(budgetMs);
    },
  );
});
