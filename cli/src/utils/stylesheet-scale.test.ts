import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The shipped stylesheet must be scalable end to end.
 *
 * Every `--font-size` bug in this area has been a coverage bug: some rule kept
 * its literal size while the rest of the document moved, and the result looked
 * plausible enough that nothing caught it. This asserts the property over the
 * real build output rather than over the plugin in isolation, so a rule added
 * later — or a build step that quietly stops applying the plugin — fails here.
 */
const CSS = readFileSync(
  fileURLToPath(new URL('../../../dist/styles.css', import.meta.url)),
  'utf-8',
);

/** Absolute lengths; the same set the plugin rewrites. */
const ABSOLUTE_LENGTH = /(?<![\w.#-])\d*\.?\d+(px|pt|pc|in|cm|mm|q|rem)\b/i;

interface Declaration {
  selector: string;
  prop: string;
  value: string;
}

/**
 * Pull out every font-size / line-height declaration with the selector that
 * introduced it. Brace-counting rather than a CSS parser keeps this test free
 * of the plugin's own machinery — if both shared a parser, a parser bug would
 * hide from both.
 */
function typographyDeclarations(css: string): Declaration[] {
  const out: Declaration[] = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let rule: RegExpExecArray | null;

  while ((rule = rulePattern.exec(css)) !== null) {
    const selector = rule[1].trim().split('\n').pop()!.trim();
    for (const decl of rule[2].split(';')) {
      const [rawProp, ...rest] = decl.split(':');
      const prop = rawProp.trim().toLowerCase();
      if (prop !== 'font-size' && prop !== 'line-height') continue;
      out.push({ selector, prop, value: rest.join(':').trim() });
    }
  }
  return out;
}

/** `html`/`:root` anchor rem and are deliberately left unscaled. */
function isRootSelector(selector: string): boolean {
  return selector.split(',').some(part => /^\s*(html|:root)\s*$/.test(part));
}

describe('dist/styles.css font scaling', () => {
  it('was built with the font-scale plugin applied', () => {
    expect(CSS).toContain('--facet-font-scale');
  });

  it('scales every typographic declaration that carries an absolute length', () => {
    const unscaled = typographyDeclarations(CSS).filter(d =>
      !d.value.includes('--facet-font-scale')
      && ABSOLUTE_LENGTH.test(d.value)
      && !(d.prop === 'font-size' && isRootSelector(d.selector)));

    expect(unscaled.map(d => `${d.selector} { ${d.prop}: ${d.value} }`)).toEqual([]);
  });

  it('leaves the rem anchor alone', () => {
    // Scaling `html` as well as the rem tokens inside other rules would apply
    // the ratio twice to every rem length.
    const root = typographyDeclarations(CSS)
      .filter(d => d.prop === 'font-size' && isRootSelector(d.selector));

    expect(root.length).toBeGreaterThan(0);
    for (const decl of root) expect(decl.value).not.toContain('--facet-font-scale');
  });

  it('does not scale unitless line-heights', () => {
    // These are ratios of the font size and already scale with it.
    const ratios = typographyDeclarations(CSS)
      .filter(d => d.prop === 'line-height' && /^\d*\.?\d+$/.test(d.value));

    expect(ratios.length).toBeGreaterThan(0);
    for (const decl of ratios) expect(decl.value).not.toContain('calc');
  });

  it('uses no font shorthand carrying a size, which the plugin cannot reach', () => {
    // `font: inherit` from Tailwind preflight is fine — it has no size. A
    // shorthand with a length in it would smuggle an unscalable size past
    // every other assertion here, because the plugin only visits `font-size`.
    const shorthands = [...CSS.matchAll(/(?<![\w-])font\s*:([^;{}]+)/g)]
      .map(m => m[1].trim())
      .filter(value => ABSOLUTE_LENGTH.test(value));

    expect(shorthands).toEqual([]);
  });
});
