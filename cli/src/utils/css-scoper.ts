/**
 * CSS Scoping Utility
 *
 * Transforms HTML and CSS by prefixing all CSS selectors with a scope class
 * and wrapping HTML content in a scoped div. This ensures complete style
 * isolation when embedding in documentation sites like Docusaurus.
 *
 * Extracted from scripts/scope-css.js
 */

export interface ScopeOptions {
  scopeClass?: string;
}

const DEFAULT_SCOPE_CLASS = 'datasheet-wrapper';

/**
 * Parse CSS and prefix all selectors with scope class
 * Handles complex selectors, media queries, and keyframes
 */
export function scopeCSS(css: string, options: ScopeOptions = {}): string {
  const scopeClass = options.scopeClass || DEFAULT_SCOPE_CLASS;

  // Remove comments first to avoid processing them
  let scoped = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Process the CSS in chunks to handle different rule types
  scoped = scoped.replace(/([^{}]+)\{([^{}]*)\}/g, (match, selector, rules) => {
    // Skip @keyframes, @font-face, @page
    if (
      selector.trim().startsWith('@keyframes') ||
      selector.trim().startsWith('@font-face') ||
      selector.trim().startsWith('@page')
    ) {
      return match;
    }

    // Handle @media and @supports by recursively scoping the inner rules
    if (selector.trim().startsWith('@media') || selector.trim().startsWith('@supports')) {
      const scopedInner = scopeCSS(rules, options);
      return `${selector}{${scopedInner}}`;
    }

    // Split multiple selectors (e.g., "h1, h2, .class")
    const selectors = selector.split(',').map((s) => s.trim());

    // Prefix each selector
    const scopedSelectors = selectors.map((sel) => {
      // Skip if already scoped
      if (sel.includes(`.${scopeClass}`)) {
        return sel;
      }

      // Handle :root specially
      if (sel === ':root') {
        return `.${scopeClass}`;
      }

      // Handle html and body
      if (sel === 'html' || sel === 'body') {
        return `.${scopeClass}`;
      }

      // Add wrapper as ancestor
      return `.${scopeClass} ${sel}`;
    });

    return `${scopedSelectors.join(', ')}{${rules}}`;
  });

  return scoped;
}

/**
 * Extract inline styles from HTML and scope them
 */
export function scopeInlineStyles(html: string, options: ScopeOptions = {}): string {
  return html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
    const scopedCSS = scopeCSS(css, options);
    return `<style>${scopedCSS}</style>`;
  });
}

/**
 * Wrap HTML body content in scope div
 * Preserves DOCTYPE, html, head, and body tags
 */
export function wrapHTMLContent(html: string, options: ScopeOptions = {}): string {
  const scopeClass = options.scopeClass || DEFAULT_SCOPE_CLASS;

  // Extract the body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) {
    // No body tag, wrap entire content
    return `<div class="${scopeClass}">${html}</div>`;
  }

  const bodyContent = bodyMatch[1];
  const bodyTagMatch = bodyMatch[0].match(/<body[^>]*>/i);
  if (!bodyTagMatch) {
    return html;
  }
  const bodyTag = bodyTagMatch[0];

  // Wrap body content
  const wrappedBody = bodyTag + `<div class="${scopeClass}">${bodyContent}</div></body>`;

  // Replace in original HTML
  return html.replace(/<body[^>]*>[\s\S]*<\/body>/i, wrappedBody);
}

/**
 * Process HTML: scope CSS and wrap content
 * This is the main function to use for WebComponent generation
 */
export function scopeHTML(html: string, options: ScopeOptions = {}): string {
  // Scope inline styles
  let processed = scopeInlineStyles(html, options);

  // Wrap content in scope div
  processed = wrapHTMLContent(processed, options);

  return processed;
}

/**
 * Process standalone CSS file content
 */
export function scopeCSSFile(css: string, options: ScopeOptions = {}): string {
  return scopeCSS(css, options);
}
