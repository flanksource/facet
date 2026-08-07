// Renders a markdown string as styled HTML for print and screen.
// Input that isn't markdown still renders: plain text comes through as text,
// and raw HTML is reduced to a formatting-only allowlist.
import React from 'react';
import { marked } from 'marked';

export interface MarkdownProps {
  /** Markdown source. Plain text and text containing raw HTML are both accepted. */
  children?: string | null;
  /** Extra classes on the wrapper. */
  className?: string;
  /**
   * Strip block-level wrappers so the result sits inside a line of text.
   * Useful for table cells and summary rows.
   */
  inline?: boolean;
}

// Formatting tags survive; anything else is dropped along with its attributes.
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'span', 'div',
  'strong', 'em', 'b', 'i', 'del', 'ins', 'mark', 'sub', 'sup',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'code', 'pre', 'kbd', 'samp', 'blockquote',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

const ALLOWED_ATTRS = /^(href|title|align|colspan|rowspan|start|type)$/i;

const ESCAPE: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPE[c]);
}

/**
 * Reduces HTML to a formatting-only subset. Markdown permits raw HTML, and
 * markdown reaching a report is usually third-party text from an upstream
 * advisory or scraper, so scripts, embedded frames, event handlers and
 * javascript: URLs are removed before the result is injected.
 */
export function sanitizeHTML(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|form|link|meta)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|link|meta)\b[^>]*>/gi, '')
    .replace(/<(\/?)(\w+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (_tag, close: string, name: string, attrs: string) => {
      if (!ALLOWED_TAGS.has(name.toLowerCase())) return '';
      if (close) return `</${name.toLowerCase()}>`;

      const kept: string[] = [];
      const pattern = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(attrs)) !== null) {
        const [, attr, dq, sq, bare] = match;
        if (!ALLOWED_ATTRS.test(attr)) continue;
        const value = dq ?? sq ?? bare ?? '';
        if (/^\s*(javascript|data|vbscript):/i.test(value)) continue;
        kept.push(`${attr.toLowerCase()}="${escapeHTML(value)}"`);
      }
      return `<${name.toLowerCase()}${kept.length ? ' ' + kept.join(' ') : ''}>`;
    });
}

/**
 * Renders markdown to sanitized HTML. Never throws: if the source cannot be
 * parsed it is returned as escaped text so the surrounding page still renders.
 */
export function renderMarkdown(source: string, options?: { inline?: boolean }): string {
  try {
    const parsed = options?.inline
      ? marked.parseInline(source, { async: false, gfm: true })
      : marked.parse(source, { async: false, gfm: true, breaks: true });
    return sanitizeHTML(parsed as string);
  } catch {
    return escapeHTML(source);
  }
}

/**
 * Flattens markdown to a single line of text, for summary rows and other places
 * that need the prose without any markup.
 */
export function markdownToPlainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[#>*-]+\s*/gm, '')
    .replace(/(\*\*|__|\*|_)/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Markdown({ children, className, inline }: MarkdownProps) {
  const source = typeof children === 'string' ? children : '';
  const html = React.useMemo(
    () => (source.trim() ? renderMarkdown(source, { inline }) : ''),
    [source, inline],
  );

  if (!html) return null;

  const classes = ['facet-markdown', inline ? 'facet-markdown--inline' : '', className]
    .filter(Boolean)
    .join(' ');

  if (inline) {
    return <span className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
}
