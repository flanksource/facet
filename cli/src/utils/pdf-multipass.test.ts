import { describe, expect, it } from 'vitest';
import { pageSizesForType } from './pdf-multipass.js';

describe('pageSizesForType', () => {
  it('returns only type/size combinations that occur', () => {
    const types = ['first', 'default', 'default', 'last'] as const;
    const sizes = ['a4', 'a4-landscape', 'letter', 'legal'];
    expect(pageSizesForType([...types], sizes, 'first')).toEqual(['a4']);
    expect(pageSizesForType([...types], sizes, 'default')).toEqual(['a4-landscape', 'letter']);
    expect(pageSizesForType([...types], sizes, 'last')).toEqual(['legal']);
  });

  it('deduplicates repeated combinations', () => {
    expect(pageSizesForType(['default', 'default'], ['a4', 'a4'], 'default')).toEqual(['a4']);
  });
});
