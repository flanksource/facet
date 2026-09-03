import { describe, it, expect } from 'vitest';
import {
  extractFrontmatter,
  remarkConfigFromFrontmatter,
  generatePluginCodegen,
  rehypePluginsArray,
  remarkPluginsArray,
  parseRedactAllow,
  hasPlugins,
} from './remark-config.js';

describe('extractFrontmatter', () => {
  it('returns the YAML body of a leading --- block', () => {
    expect(extractFrontmatter('---\nremarkPlugins:\n  - ./x.ts\n---\n# Title')).toBe(
      'remarkPlugins:\n  - ./x.ts',
    );
  });

  it('returns null when there is no frontmatter', () => {
    expect(extractFrontmatter('# Just a heading\n')).toBeNull();
  });
});

describe('remarkConfigFromFrontmatter', () => {
  it('normalizes string and [name, options] entries', () => {
    const config = remarkConfigFromFrontmatter({
      remarkPlugins: ['./remark-financial-table.ts', ['remark-x', { strict: true }]],
      rehypePlugins: ['rehype-y'],
    });
    expect(config.remarkPlugins).toEqual(['./remark-financial-table.ts', ['remark-x', { strict: true }]]);
    expect(config.rehypePlugins).toEqual(['rehype-y']);
  });

  it('defaults to empty lists when fields are absent', () => {
    expect(remarkConfigFromFrontmatter({})).toEqual({ remarkPlugins: [], rehypePlugins: [] });
    expect(remarkConfigFromFrontmatter(null)).toEqual({ remarkPlugins: [], rehypePlugins: [] });
  });

  it('throws when a plugin field is not a list', () => {
    expect(() => remarkConfigFromFrontmatter({ remarkPlugins: 'nope' })).toThrow(/must be a list/);
  });
});

describe('generatePluginCodegen', () => {
  it('resolves local paths to absolute imports anchored at the project root', () => {
    const code = generatePluginCodegen(
      { remarkPlugins: ['./remark-financial-table.ts'], rehypePlugins: [] },
      '/proj',
    );
    expect(code.imports).toEqual(['import _remarkPlugin0 from "/proj/remark-financial-table.ts";']);
    expect(code.remarkItems).toEqual(['_remarkPlugin0']);
  });

  it('passes bare package names through and inlines options', () => {
    const code = generatePluginCodegen(
      { remarkPlugins: [['remark-x', { a: 1 }]], rehypePlugins: ['rehype-y'] },
      '/proj',
    );
    expect(code.imports).toEqual([
      'import _remarkPlugin0 from "remark-x";',
      'import _rehypePlugin0 from "rehype-y";',
    ]);
    expect(code.remarkItems).toEqual(['[_remarkPlugin0, {"a":1}]']);
    expect(code.rehypeItems).toEqual(['_rehypePlugin0']);
  });
});

describe('remarkPluginsArray', () => {
  const DEFAULTS = "remarkFrontmatter, remarkGfm, [remarkAlert, { tagName: 'blockquote' }]";

  it('keeps the always-on defaults first and appends user items', () => {
    expect(remarkPluginsArray([])).toBe(`[${DEFAULTS}, [facetRedact, {"allow":{}}]]`);
    expect(remarkPluginsArray(['_remarkPlugin0'])).toBe(
      `[${DEFAULTS}, [facetRedact, {"allow":{}}], _remarkPlugin0]`,
    );
  });

  it('places redaction after the defaults and before user plugins', () => {
    // Ordering is load-bearing: a frontmatter-declared plugin must not be able
    // to observe content the build is not permitted to carry.
    expect(remarkPluginsArray(['_remarkPlugin0'], { allow: { tier: ['Public'] } })).toBe(
      `[${DEFAULTS}, [facetRedact, {"allow":{"tier":["Public"]}}], _remarkPlugin0]`,
    );
  });

  it('installs redaction even when no policy is given', () => {
    // Omitting the plugin without a policy would make a forgotten --allow
    // publish every classified region rather than fail the build.
    expect(remarkPluginsArray([])).toContain('facetRedact');
  });
});

describe('parseRedactAllow', () => {
  it('collects declarations into a permitted set per attribute', () => {
    expect(parseRedactAllow(['tier=Public,Customer-Shared', 'status=published'])).toEqual({
      allow: { tier: ['Public', 'Customer-Shared'], status: ['published'] },
    });
  });

  it('merges repeated declarations for one attribute', () => {
    expect(parseRedactAllow(['tier=Public', 'tier=Internal'])).toEqual({
      allow: { tier: ['Public', 'Internal'] },
    });
  });

  it('yields no policy when nothing is declared, which the caller treats as deny', () => {
    expect(parseRedactAllow([])).toBeUndefined();
  });

  it.each([
    ['no separator', 'tier'],
    ['an empty attribute', '=Public'],
    ['no values', 'tier='],
  ])('rejects %s', (_description, declaration) => {
    expect(() => parseRedactAllow([declaration])).toThrow();
  });
});

describe('rehypePluginsArray', () => {
  it('keeps raw HTML before user items', () => {
      expect(rehypePluginsArray([])).toBe(
        "[[rehypeRaw, { passThrough: ['mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression', 'mdxjsEsm'] }]]",
      );
    expect(rehypePluginsArray(['_rehypePlugin0'])).toBe(
      "[[rehypeRaw, { passThrough: ['mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression', 'mdxjsEsm'] }], _rehypePlugin0]",
    );
  });
});

describe('hasPlugins', () => {
  it('is true only when a list is non-empty', () => {
    expect(hasPlugins({ remarkPlugins: [], rehypePlugins: [] })).toBe(false);
    expect(hasPlugins({ remarkPlugins: ['x'], rehypePlugins: [] })).toBe(true);
  });
});
