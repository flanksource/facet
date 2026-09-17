import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(fileURLToPath(new URL('../../../dist/styles.css', import.meta.url)), 'utf-8');

describe('print table pagination', () => {
  it('allows Markdown tables to continue across pages without splitting rows', () => {
    const unbreakableTableRules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , declarations]) => /(?:page-break-inside|break-inside):\s*avoid/.test(declarations))
      .map(([, selector]) => selector.trim())
      .filter((selector) => selector.includes('.facet-markdown table'));

    expect(unbreakableTableRules).toEqual([]);
    expect(CSS).toMatch(/table\s*\{[^}]*page-break-inside:\s*auto/);
    expect(CSS).toMatch(/tr\s*\{[^}]*page-break-inside:\s*avoid/);
  });
});
