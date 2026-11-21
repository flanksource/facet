/**
 * <SlideNotes> render hidden everywhere (PDF, PNG and the Office capture read the same HTML);
 * HTML output opts in to its speaker-notes panels by marking the root element.
 */
export function showSlideNotes(html: string): string {
  if (!/<html\b/i.test(html)) throw new Error('Cannot show slide notes: the rendered HTML has no <html> element');
  if (/<html\b[^>]*\bdata-facet-notes=/i.test(html)) return html;
  return html.replace(/<html\b/i, '<html data-facet-notes="show"');
}
