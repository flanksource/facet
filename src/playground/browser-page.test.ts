import { describe, expect, it } from 'vitest';
import { browserPageFiles } from './browser-page';

describe('browser template formats', () => {
  it.each(['tsx', 'jsx'])('renders %s as an authored React component', (ext) => {
    const result = browserPageFiles({ ext, code: 'export default () => <h1>Hello</h1>', header: '', footer: '', css: '' });
    expect(result.page).toBe(`report.${ext}`);
    expect(result.files['layout.tsx']).toContain('const props = { data }');
    expect(result.files['layout.tsx']).not.toContain('<Document title=');
  });
  it('wraps MDX in a document and page', () => {
    const result = browserPageFiles({ ext: 'mdx', code: '# Hello', header: '', footer: '', css: '' });
    expect(result.files['layout.tsx']).toContain('<Document title=');
  });
});
