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

    // Browsers strip ASCII whitespace and control characters out of a URL
    // before resolving its scheme, so the scheme has to be checked against a
    // normalized value rather than the raw attribute text.
    it.each([
      ['newline', '\n'],
      ['tab', '\t'],
      ['carriage return', '\r'],
      ['form feed', '\f'],
      ['null byte', '\0'],
    ])('rejects a scheme split by a literal %s', (_name, char) => {
      const html = sanitizeHTML(`<a href="java${char}script:alert(1)">x</a>`);
      expect(html).toBe('<a>x</a>');
    });

    it('rejects a scheme split by an HTML entity', () => {
      expect(sanitizeHTML('<a href="java&#10;script:alert(1)">x</a>')).toBe('<a>x</a>');
      expect(sanitizeHTML('<a href="&#106;avascript:alert(1)">x</a>')).toBe('<a>x</a>');
      expect(sanitizeHTML('<a href="&#x6a;avascript:alert(1)">x</a>')).toBe('<a>x</a>');
    });

    it('rejects a scheme padded with leading whitespace or controls', () => {
      expect(sanitizeHTML('<a href=" \t javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    });

    it('keeps ordinary and relative URLs', () => {
      expect(sanitizeHTML('<a href="https://example.com/a?b=1#c">x</a>'))
        .toBe('<a href="https://example.com/a?b=1#c">x</a>');
      expect(sanitizeHTML('<a href="/docs/page">x</a>')).toBe('<a href="/docs/page">x</a>');
      expect(sanitizeHTML('<a href="#section">x</a>')).toBe('<a href="#section">x</a>');
      expect(sanitizeHTML('<a href="mailto:a@b.dev">x</a>')).toBe('<a href="mailto:a@b.dev">x</a>');
    });

    // Removing a substring can splice the surrounding text into a new tag, so
    // the sanitizer must never re-expose a tag it has already stepped past.
    it.each([
      '<scr<script>ipt>alert(1)</script>',
      '<<script>script>alert(1)</script>',
      '<scri<!-- -->pt>alert(1)</scri<!-- -->pt>',
      '<sty<style>le>body{}</style>',
      '<img<img src=x onerror=alert(1)>>',
    ])('cannot be spliced into a live element: %s', (input) => {
      // Parsing the result is what matters: leftover characters may still read
      // as the text "ipt>alert(1)", which renders harmlessly. What must never
      // happen is the browser building an executable element out of them.
      const host = document.createElement('div');
      host.innerHTML = sanitizeHTML(input);
      expect(host.querySelector('script, style, iframe, object, embed, img')).toBeNull();
      expect(host.querySelectorAll('*')).toHaveLength(0);
    });

    it('discards the contents of dropped elements', () => {
      expect(sanitizeHTML('a<script>var x = 1;</script>b')).toBe('ab');
      expect(sanitizeHTML('a<style>.x{color:red}</style>b')).toBe('ab');
      expect(sanitizeHTML('a<script>unclosed')).toBe('a');
    });

    it('escapes a stray angle bracket instead of leaving it loose', () => {
      expect(sanitizeHTML('a < b')).toBe('a &lt; b');
      expect(sanitizeHTML('<notatag')).toBe('&lt;notatag');
    });

    it('completes quickly on input designed to backtrack', () => {
      const hostile = '<!--'.repeat(20000);
      const started = Date.now();
      sanitizeHTML(hostile);
      expect(Date.now() - started).toBeLessThan(1000);
    });
  });

  describe('inline mode', () => {
    it('drops block-level elements so a span never wraps block content', () => {
      const html = renderMarkdown('a<div>block</div><table><tr><td>c</td></tr></table>b', { inline: true });
      expect(html).not.toContain('<div');
      expect(html).not.toContain('<table');
      expect(html).not.toContain('<td');
      expect(html).toContain('block');
      expect(html).toContain('b');
    });

    it('keeps inline formatting', () => {
      const html = renderMarkdown('a **b** `c` <em>d</em>', { inline: true });
      expect(html).toContain('<strong>b</strong>');
      expect(html).toContain('<code>c</code>');
      expect(html).toContain('<em>d</em>');
    });

    it('still renders block elements in block mode', () => {
      const html = renderMarkdown('a<div>block</div>b');
      expect(html).toContain('<div>');
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
