/**
 * HTML assembly utilities — inline rendered CSS into the rendered HTML so the
 * output is a single self-contained document.
 */

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
