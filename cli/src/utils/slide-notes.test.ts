import { describe, expect, it } from 'vitest';
import { showSlideNotes } from './slide-notes.js';

describe('showSlideNotes', () => {
  it.each([
    ['<!doctype html><html lang="en"><body></body></html>', '<!doctype html><html data-facet-notes="show" lang="en"><body></body></html>'],
    ['<HTML><body></body></HTML>', '<html data-facet-notes="show"><body></body></HTML>'],
  ])('marks the root element of %s', (input, expected) => expect(showSlideNotes(input)).toBe(expected));

  it('leaves an already marked document unchanged', () => {
    const marked = '<html data-facet-notes="show"><body></body></html>';
    expect(showSlideNotes(marked)).toBe(marked);
  });

  it('rejects a fragment without an html element', () => {
    expect(() => showSlideNotes('<div>fragment</div>')).toThrow(/no <html> element/);
  });
});
