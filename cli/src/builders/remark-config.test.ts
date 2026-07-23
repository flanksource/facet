import { describe, it, expect } from 'vitest';
import {
  extractFrontmatter,
  remarkConfigFromFrontmatter,
  generatePluginCodegen,
  rehypePluginsArray,
  remarkPluginsArray,
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
  it('keeps the always-on defaults first and appends user items', () => {
    expect(remarkPluginsArray([])).toBe("[remarkFrontmatter, remarkGfm, [remarkAlert, { tagName: 'blockquote' }]]");
    expect(remarkPluginsArray(['_remarkPlugin0'])).toBe(
      "[remarkFrontmatter, remarkGfm, [remarkAlert, { tagName: 'blockquote' }], _remarkPlugin0]",
    );
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
