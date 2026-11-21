import type { Browser } from 'puppeteer-core';
import { launchBrowser } from './pdf-generator.js';
import { renderMermaidInPage } from './browser-readiness.js';
import { applyBrowserLayout, type BrowserLayout } from './render-layout.js';

export function hasMermaidCodeBlocks(html: string): boolean {
  return /<code\b[^>]*\bclass=["'][^"']*\blanguage-mermaid\b/.test(html);
}

/** Materialize browser-backed Markdown extensions into self-contained HTML. */
export async function renderBrowserHTML(options: { html: string; browser?: Browser; layout?: BrowserLayout }): Promise<string> {
  const { html } = options;
  if (!hasMermaidCodeBlocks(html) && !options.layout) return html;

  const browser = options.browser ?? await launchBrowser();
  try {
    const page = await browser.newPage();
    try {
      if (options.layout) await page.setViewport({ ...options.layout.viewport, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      if (options.layout) await page.evaluate(applyBrowserLayout, options.layout);
      await renderMermaidInPage(page);
      return await page.content();
    } finally {
      await page.close();
    }
  } finally {
    if (!options.browser) await browser.close();
  }
}
