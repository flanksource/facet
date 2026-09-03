import type { Browser } from 'puppeteer-core';
import { launchBrowser } from './pdf-generator.js';
import { renderMermaidInPage } from './browser-readiness.js';

export function hasMermaidCodeBlocks(html: string): boolean {
  return /<code\b[^>]*\bclass=["'][^"']*\blanguage-mermaid\b/.test(html);
}

/** Materialize browser-backed Markdown extensions into self-contained HTML. */
export async function renderBrowserHTML(options: { html: string; browser?: Browser }): Promise<string> {
  const { html } = options;
  if (!hasMermaidCodeBlocks(html)) return html;

  const browser = options.browser ?? await launchBrowser();
  try {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await renderMermaidInPage(page);
      return await page.content();
    } finally {
      await page.close();
    }
  } finally {
    if (!options.browser) await browser.close();
  }
}
