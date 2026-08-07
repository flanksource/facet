// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import Markdown, { renderMarkdown, markdownToPlainText, sanitizeHTML } from './Markdown';

describe('Markdown', () => {
  describe('non-markdown input still renders', () => {
    it('renders plain prose unchanged', () => {
      const { container } = render(<Markdown>Just a sentence with no markup.</Markdown>);
      expect(container.textContent?.trim()).toBe('Just a sentence with no markup.');
    });

    it('renders nothing for empty, blank and missing sources', () => {
      expect(render(<Markdown>{''}</Markdown>).container.firstChild).toBeNull();
      expect(render(<Markdown>{'   '}</Markdown>).container.firstChild).toBeNull();
      expect(render(<Markdown>{null}</Markdown>).container.firstChild).toBeNull();
      expect(render(<Markdown />).container.firstChild).toBeNull();
    });

    it('tolerates a non-string source instead of throwing', () => {
      const { container } = render(<Markdown>{42 as unknown as string}</Markdown>);
      expect(container.firstChild).toBeNull();
    });

    it('keeps text that only looks like markup', () => {
      expect(markdownToPlainText('a * b * c')).toBe('a b c');
      expect(renderMarkdown('5 < 6 and 7 > 3')).toContain('5 ');
    });
  });

  describe('formatting', () => {
    it('renders emphasis, code, lists, links and tables', () => {
      const html = renderMarkdown([
        '# Heading',
        '',
        'A **bold** word and `inline code`.',
        '',
        '- first',
        '- second',
        '',
        '[docs](https://example.com/docs)',
        '',
        '| Package | Patched |',
        '| --- | --- |',
        '| js-yaml | 4.1.1 |',
      ].join('\n'));

      expect(html).toContain('<h1>Heading</h1>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<code>inline code</code>');
      expect(html).toContain('<li>first</li>');
      expect(html).toContain('<a href="https://example.com/docs">docs</a>');
      expect(html).toContain('<table>');
      expect(html).toContain('<td>js-yaml</td>');
    });

    it('renders fenced blocks', () => {
      const html = renderMarkdown('```js\nconst a = 1;\n```');
      expect(html).toContain('<pre>');
      expect(html).toContain('const a = 1;');
    });

    it('keeps line-break tags that upstream sources embed', () => {
      const html = renderMarkdown('Warn: one<br><br>Warn: two');
      expect(html).toContain('<br>');
      expect(html).toContain('Warn: two');
    });

    it('drops block wrappers in inline mode', () => {
      const { container } = render(<Markdown inline>A **bold** word.</Markdown>);
      expect(container.querySelector('p')).toBeNull();
      expect(container.querySelector('strong')).not.toBeNull();
      expect(container.firstElementChild?.tagName).toBe('SPAN');
    });

    it('marks the wrapper so the stylesheet can reach it', () => {
      const { container } = render(<Markdown className="text-xs">hello</Markdown>);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain('facet-markdown');
      expect(wrapper.className).toContain('text-xs');
    });
  });

  describe('sanitizing untrusted source text', () => {
    it('removes script, iframe and style elements with their contents', () => {
      const html = sanitizeHTML('a<script>alert(1)</script>b<iframe src="x"></iframe>c');
      expect(html).not.toContain('alert');
      expect(html).not.toContain('iframe');
      expect(html).toBe('abc');
    });

    it('removes event handler attributes', () => {
      expect(sanitizeHTML('<img src=x onerror=alert(1)>')).not.toContain('onerror');
      expect(sanitizeHTML('<p onclick="steal()">hi</p>')).toBe('<p>hi</p>');
    });

    it('removes javascript and data URLs but keeps ordinary links', () => {
      expect(sanitizeHTML('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
      expect(sanitizeHTML('<a href="data:text/html,<b>">x</a>')).toBe('<a>x</a>');
      expect(sanitizeHTML('<a href="https://example.com">x</a>')).toBe('<a href="https://example.com">x</a>');
    });

    it('drops unknown elements but keeps their text', () => {
      expect(sanitizeHTML('<custom-tag>kept</custom-tag>')).toBe('kept');
    });

    it('sanitizes markdown that carries raw HTML', () => {
      const html = renderMarkdown('Info: fine<br><script>alert(1)</script>');
      expect(html).toContain('<br>');
      expect(html).not.toContain('alert');
    });

    it('strips HTML comments', () => {
      expect(sanitizeHTML('a<!-- secret -->b')).toBe('ab');
    });
  });

  describe('markdownToPlainText', () => {
    it('flattens markup to a single line', () => {
      const text = markdownToPlainText('## Summary\n\nThe call to `eval` is **unsafe**.\n\nSee [docs](https://x.dev).');
      expect(text).toBe('Summary The call to eval is unsafe. See docs.');
    });

    it('drops fenced blocks and raw tags', () => {
      expect(markdownToPlainText('before\n\n```js\nconst a = 1;\n```\n\nafter')).toBe('before after');
      expect(markdownToPlainText('one<br><br>two')).toBe('one two');
    });
  });
});
