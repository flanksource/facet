import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readRemarkFrontmatter } from './frontmatter.js';

describe('readRemarkFrontmatter', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'facet-fm-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads remark/rehype plugins from an .mdx frontmatter block', () => {
    const file = join(dir, 'doc.mdx');
    writeFileSync(file, '---\nremarkPlugins:\n  - ./remark-financial-table.ts\nrehypePlugins:\n  - rehype-slug\n---\n# Hi\n');
    expect(readRemarkFrontmatter(file)).toEqual({
      remarkPlugins: ['./remark-financial-table.ts'],
      rehypePlugins: ['rehype-slug'],
    });
  });

  it('returns empty config for a markdown file without frontmatter', () => {
    const file = join(dir, 'plain.md');
    writeFileSync(file, '# No frontmatter here\n');
    expect(readRemarkFrontmatter(file)).toEqual({ remarkPlugins: [], rehypePlugins: [] });
  });

  it('returns empty config for non-markdown templates', () => {
    const file = join(dir, 'Wrapper.tsx');
    writeFileSync(file, '---\nremarkPlugins:\n  - ./x.ts\n---\n'); // ignored: not .md/.mdx
    expect(readRemarkFrontmatter(file)).toEqual({ remarkPlugins: [], rehypePlugins: [] });
  });
});
