/**
 * React SSR Renderer
 *
 * Renders React components to static HTML using Server-Side Rendering.
 * Extracted and adapted from scripts/build-datasheet.js
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type { RenderedTemplate } from '../types.js';

export interface RenderOptions {
  component: React.ComponentType<{ data: Record<string, unknown>; css?: string }>;
  data: Record<string, unknown>;
  css?: string;
}

/**
 * Render React component to static HTML
 *
 * @param options - Rendering options
 * @returns Rendered HTML and CSS
 */
export function renderToHTML(options: RenderOptions): RenderedTemplate {
  const { component, data, css = '' } = options;

  // Create React element with data prop
  const element = React.createElement(component, { data, css });

  // Render to static HTML string
  const htmlString = ReactDOMServer.renderToStaticMarkup(element);

  // Prepend DOCTYPE
  const html = '<!DOCTYPE html>\n' + htmlString;

  return {
    html,
    css,
  };
}

/**
 * Combine HTML and CSS into a self-contained HTML document
 *
 * If the HTML already contains a <style> tag with the CSS (from the component),
 * this returns the HTML as-is. Otherwise, it inlines the CSS.
 *
 * @param html - HTML content
 * @param css - CSS content to inline
 * @returns Complete HTML document
 */
export function combineHTMLAndCSS(html: string, css: string): string {

  // If no CSS provided, return HTML as-is
  if (!css) {
    return html;
  }

  // Otherwise, inline the CSS into the <head>
  // Find the </head> tag and insert CSS before it
  if (html.includes('</head>')) {
    return html.replace('</head>', `<style>${css}</style></head>`);
  }

  // If no <head>, try to insert after <html>
  if (html.includes('<html')) {
    return html.replace(/<html[^>]*>/, (match) => `${match}<head><style>${css}</style></head>`);
  }

  // Fallback: wrap in complete HTML document
  return `<!DOCTYPE html>
<html>
<head>
<style>${css}</style>
</head>
<body>
${html}
</body>
</html>`;
}
