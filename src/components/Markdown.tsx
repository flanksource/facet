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

// Inline formatting survives everywhere; block tags only outside inline mode.
const INLINE_TAGS = new Set([
  'br', 'span', 'strong', 'em', 'b', 'i', 'del', 'ins', 'mark', 'sub', 'sup',
  'a', 'code', 'kbd', 'samp',
]);

const BLOCK_TAGS = new Set([
  'p', 'hr', 'div', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'pre', 'blockquote',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

const ALLOWED_TAGS = new Set([...INLINE_TAGS, ...BLOCK_TAGS]);

// Dropped along with everything up to their closing tag.
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta',
  'template', 'noscript', 'svg', 'math', 'base', 'title',
]);

const ALLOWED_ATTRS = /^(href|title|align|colspan|rowspan|start|type)$/i;

// A URL without a scheme is relative and always fine; one with a scheme has to
// name a scheme that cannot execute.
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel', 'ftp']);

const ESCAPE: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  tab: '\t', newline: '\n', colon: ':', sol: '/',
};

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPE[c]);
}

function codePoint(value: number): string {
  try {
    return String.fromCodePoint(value);
  } catch {
    return '';
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_m, hex: string) => codePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_m, dec: string) => codePoint(parseInt(dec, 10)))
    .replace(/&(\w+);/g, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * Decides whether a URL is safe to keep. Browsers decode entities and discard
 * ASCII whitespace and control characters before resolving a scheme, so
 * `java\nscript:` reaches the network stack as `javascript:`. The comparison
 * has to run on the same normalized form the browser will see.
 */
function isSafeURL(value: string): boolean {
  const normalized = decodeEntities(value)
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, '')
    .toLowerCase();
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(normalized);
  return !scheme || SAFE_SCHEMES.has(scheme[1]);
}

function renderAttrs(attrs: string): string {
  const kept: string[] = [];
  const pattern = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(attrs)) !== null) {
    const [, attr, dq, sq, bare] = match;
    if (!ALLOWED_ATTRS.test(attr)) continue;
    const value = dq ?? sq ?? bare ?? '';
    if ((attr.toLowerCase() === 'href' || attr.toLowerCase() === 'src') && !isSafeURL(value)) continue;
    kept.push(`${attr.toLowerCase()}="${escapeHTML(decodeEntities(value))}"`);
  }
  return kept.length ? ' ' + kept.join(' ') : '';
}

/** Index just past the closing tag for `name`, or the end of the input. */
function endOfElement(html: string, from: number, name: string): number {
  const close = html.toLowerCase().indexOf(`</${name}`, from);
  if (close < 0) return html.length;
  const gt = html.indexOf('>', close);
  return gt < 0 ? html.length : gt + 1;
}

/**
 * Reduces HTML to a formatting-only subset. Markdown permits raw HTML, and
 * markdown reaching a report is usually third-party text from an upstream
 * advisory or scraper, so scripts, embedded frames, event handlers and
 * javascript: URLs are removed before the result is injected.
 */
export function sanitizeHTML(html: string, options?: { inline?: boolean }): string {
  const allowed = options?.inline ? INLINE_TAGS : ALLOWED_TAGS;
  // Anchored so a tag is only recognised where one actually starts. Scanning
  // forward and rebuilding, rather than deleting substrings in place, is what
  // keeps a removal from splicing its neighbours into a fresh tag.
  const tag = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/y;

  let out = '';
  let i = 0;
  while (i < html.length) {
    const next = html.indexOf('<', i);
    if (next < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, next);

    if (html.startsWith('<!--', next)) {
      const end = html.indexOf('-->', next + 4);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith('<!', next) || html.startsWith('<?', next)) {
      const end = html.indexOf('>', next + 1);
      i = end < 0 ? html.length : end + 1;
      continue;
    }

    tag.lastIndex = next;
    const match = tag.exec(html);
    if (!match) {
      // Not the start of a tag, so it is text and must not stay a bare '<'.
      out += '&lt;';
      i = next + 1;
      continue;
    }

    const [, close, rawName, attrs] = match;
    const name = rawName.toLowerCase();
    i = tag.lastIndex;

    if (DROP_WITH_CONTENT.has(name)) {
      if (!close) i = endOfElement(html, i, name);
      continue;
    }
    if (!allowed.has(name)) continue;

    out += close ? `</${name}>` : `<${name}${renderAttrs(attrs)}>`;
  }
  return out;
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
    return sanitizeHTML(parsed as string, { inline: options?.inline });
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
