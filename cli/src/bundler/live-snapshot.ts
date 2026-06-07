/**
 * Live Snapshot (live render path)
 *
 * Loads a Vite-dev-served template in a real browser (so react-xarrows and other
 * DOM-measuring components render), waits for the diagram to settle, then either
 * captures the rendered DOM as self-contained static HTML or prints it to PDF.
 */

import type { Browser, Page } from 'puppeteer-core';
import { launchBrowser } from '../utils/pdf-generator.js';
import { Logger } from '../utils/logger.js';

/** Max time to wait for `data-facet-ready` before falling back to a fixed delay. */
const READY_TIMEOUT_MS = 15_000;
const FALLBACK_SETTLE_MS = 800;

async function loadLivePage(browser: Browser, url: string, logger: Logger): Promise<Page> {
  const page = await browser.newPage();

  // Surface browser-side failures loudly: a Vite transform/resolve error renders
  // as a `vite-error-overlay` element rather than the template, and would
  // otherwise be captured as a near-empty "successful" page.
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluateHandle('document.fonts.ready');

  const overlay = await page.evaluate(() => {
    const el = document.querySelector('vite-error-overlay');
    if (!el) return null;
    const msg = el.shadowRoot?.querySelector('.message')?.textContent;
    return msg ?? el.textContent ?? 'unknown Vite error';
  });
  if (overlay) {
    throw new Error(`Live render failed — Vite reported an error:\n${overlay.trim()}`);
  }
  if (pageErrors.length > 0) {
    throw new Error(`Live render failed — browser errors:\n${pageErrors.join('\n')}`);
  }

  // A <Diagram> flips its root's data-facet-ready to "true" after react-xarrows
  // has measured and drawn. Wait for that; if no diagram is present, fall back
  // to a bounded settle delay.
  const hasDiagram = await page.$('[data-facet-diagram]');
  if (hasDiagram) {
    try {
      await page.waitForFunction(
        () => !!document.querySelector('[data-facet-diagram][data-facet-ready="true"]'),
        { timeout: READY_TIMEOUT_MS },
      );
    } catch {
      logger.warn(`Diagram did not signal ready within ${READY_TIMEOUT_MS}ms; capturing anyway`);
    }
  } else {
    await new Promise((r) => setTimeout(r, FALLBACK_SETTLE_MS));
  }

  const rendered = await page.evaluate(() => {
    const root = document.getElementById('facet-root');
    return (root?.childElementCount ?? 0) > 0;
  });
  if (!rendered) {
    throw new Error('Live render produced an empty #facet-root — the template did not mount');
  }
  return page;
}

/**
 * Strip dev-only artifacts from the captured DOM so the HTML is self-contained:
 * the Vite client runtime, the module entry, and the injected data global. The
 * Vite-injected <style> tags stay (they carry the rendered CSS); xarrows arrows
 * are already serialized as positioned SVG.
 */
function makeSelfContained(html: string): string {
  // All dev-runtime module scripts: the entry, the Vite client, the React
  // Fast Refresh preamble (inline-bodied), plus the injected data global.
  // Apply each pattern repeatedly until the string stabilizes so a single
  // pass can't leave a re-formed `<script>` behind (defeats nested-tag bypass;
  // CWE-116 / js/incomplete-multi-character-sanitization).
  const patterns = [
    /<script\b[^>]*\btype=["']module["'][^>]*>[\s\S]*?<\/script>/gi,
    /<script\b[^>]*\bsrc=["'][^"']*facet-data\.js["'][^>]*><\/script>/gi,
  ];
  let out = html;
  for (const pattern of patterns) {
    let prev: string;
    do {
      prev = out;
      out = out.replace(pattern, '');
    } while (out !== prev);
  }
  return out;
}

/** Capture the live-rendered template as a self-contained static HTML string. */
export async function snapshotHTML(url: string, logger: Logger): Promise<string> {
  const browser = await launchBrowser();
  try {
    const page = await loadLivePage(browser, url, logger);
    const content = await page.content();
    return makeSelfContained(content);
  } finally {
    await browser.close();
  }
}
