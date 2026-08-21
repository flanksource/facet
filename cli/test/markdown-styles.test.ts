import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const CSS = readFileSync(fileURLToPath(new URL('../../dist/styles.css', import.meta.url)), 'utf8');

/**
 * Accent colour per GitHub alert tone.
 *
 * `remark-github-blockquote-alert` is always on, so every `.md` can emit these
 * classes — but the plugin ships no styling that facet imports, and for a long
 * time this stylesheet carried no rule for them at all. All five tones then
 * rendered as the same grey aside while MarkdownReport.md advertised "its label
 * and icon". Asserting the built CSS is what stops that regressing silently:
 * nothing else in the suite renders a document and looks at it.
 */
/** Tailwind's `-500` step per tone, as the built stylesheet writes it. */
const ALERT_ACCENTS: Record<string, string> = {
  note: '59 130 246', // blue-500
  tip: '16 185 129', // emerald-500
  important: '168 85 247', // purple-500
  warning: '245 158 11', // amber-500
  caution: '239 68 68', // red-500
};

describe('Markdown styles', () => {
  test('emits decimal markers and indentation for ordered lists', () => {
    const orderedListRule = [...CSS.matchAll(/(?:^|})\s*ol\s*\{([^}]*)\}/g)].at(-1)?.[1];

    expect(orderedListRule).toMatch(
      /margin:\s*3mm 0 4mm 8mm;[\s\S]*padding:\s*0;[\s\S]*list-style-type:\s*decimal/,
    );
  });

  test.each(Object.entries(ALERT_ACCENTS))(
    'gives the %s alert its own accent and background',
    (tone, rgb) => {
      const rule = [...CSS.matchAll(
        new RegExp(`blockquote\\.markdown-alert-${tone}\\s*\\{([^}]*)\\}`, 'g'),
      )].at(-1)?.[1];

      expect(rule, `no rule for blockquote.markdown-alert-${tone}`).toBeDefined();
      expect(rule).toMatch(new RegExp(`border-left-color:\\s*rgb\\(${rgb}`));
      expect(rule).toMatch(/background-color:\s*rgb\(/);
    },
  );

  test('gives each alert a distinct accent', () => {
    // Five rules that all resolved to the same colour would satisfy the check
    // above tone by tone while still being the single grey box this replaced.
    expect(new Set(Object.values(ALERT_ACCENTS)).size).toBe(5);
  });

  test('lays the alert title out as a row and sizes its icon', () => {
    const title = [...CSS.matchAll(/\.markdown-alert-title\s*\{([^}]*)\}/g)]
      .map(m => m[1])
      .join('\n');

    expect(title).toMatch(/display:\s*flex/);
    expect(title).toMatch(/text-transform:\s*uppercase/);

    // Without an explicit box the injected 16x16 SVG sets at its intrinsic size
    // and dwarfs a 7pt label.
    expect(CSS).toMatch(/\.octicon\s*\{[^}]*width:\s*3mm/);
    expect(CSS).toMatch(/\.octicon\s*\{[^}]*fill:\s*currentColor/);
  });

  test('does not leak table padding rules onto the alert title', () => {
    // `@apply text-xs` would pull facet's compound `table.text-xs th|td` rules
    // in under the applied class name. Matched as a selector rather than as a
    // bare string, since source comments naming it survive into the build.
    expect(CSS).not.toMatch(/table\.markdown-alert-title\s*(\{|th|td|,)/);
  });

  test('keeps a heading block-level so the next one starts its own line', () => {
    // `## Heading` immediately followed by `### Heading` is ordinary markdown,
    // and an inline-level heading box lets the second run into the first — the
    // print rules made headings flex containers so an `.icon` child centres,
    // and `inline-flex` shrink-wrapped them back onto one line. It only shows
    // between two adjacent headings: any block after one supplies the break.
    const headingRules = [...CSS.matchAll(/(?:^|[},])\s*((?:h[1-6]\s*,\s*)*h[1-6])\s*\{([^}]*)\}/g)];

    expect(headingRules.length).toBeGreaterThan(0);
    for (const [, selector, declarations] of headingRules) {
      expect(declarations, `${selector} is inline-level`).not.toMatch(/display:\s*inline/);
    }
  });
});
