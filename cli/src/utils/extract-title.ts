/**
 * Extract title from HTML <title> tag and sanitize for use as filename
 */
export function extractTitleFromHTML(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim();

  if (!title || title.length === 0) {
    return 'output';
  }

  return sanitizeFilename(title);
}

/**
 * Sanitize a string to be a valid filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'output';
}
