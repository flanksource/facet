/**
 * Live Snapshot (live render path)
 *
 * Loads a Vite-dev-served template in a real browser (so react-xarrows and other
 * DOM-measuring components render), waits for every diagram to settle, then either
 * captures the rendered DOM as self-contained static HTML or prints it to PDF.
 */

import type { Browser, Page } from 'puppeteer-core';
import { launchBrowser } from '../utils/pdf-generator.js';
import { Logger } from '../utils/logger.js';
import { renderMermaidInPage } from '../utils/browser-readiness.js';
import {
  DEFAULT_PNG_VIEWPORT,
  normalizePNGOptions,
  resolvePNGTarget,
} from '../utils/png-generator.js';
import type { PNGOptions } from '../types.js';
import { applyBrowserLayout, type BrowserLayout } from '../utils/render-layout.js';
import { DIAGRAM_SELECTOR, diagramReadiness, type DiagramState } from './diagram-readiness.js';

/** Max time to wait for every diagram to set `data-facet-ready` or `data-facet-error`. */
const READY_TIMEOUT_MS = 15_000;
const FALLBACK_SETTLE_MS = 800;

function readDiagramStates(page: Page): Promise<DiagramState[]> {
  return page.$$eval(DIAGRAM_SELECTOR, (diagrams) =>
    diagrams.map((diagram) => ({
      ready: diagram.getAttribute('data-facet-ready'),
      error: diagram.getAttribute('data-facet-error'),
      warning: diagram.getAttribute('data-facet-warning'),
    })),
  );
}

async function waitForDiagrams(page: Page, logger: Logger): Promise<void> {
  try {
    // Mirrors diagramReadiness().settled — page functions cannot import it.
    await page.waitForFunction(
      (selector: string) =>
        Array.from(document.querySelectorAll(selector)).every(
          (diagram) =>
            diagram.hasAttribute('data-facet-error') ||
            diagram.getAttribute('data-facet-ready') === 'true',
        ),
      { timeout: READY_TIMEOUT_MS },
      DIAGRAM_SELECTOR,
    );
  } catch (err) {
    const { pending } = diagramReadiness(await readDiagramStates(page));
    throw new Error(
      `${pending} diagram(s) did not settle within ${READY_TIMEOUT_MS}ms: ${(err as Error).message}`,
    );
  }
  const states = await readDiagramStates(page);
  const { errors, warnings } = diagramReadiness(states);
  warnings.forEach((warning) => logger.warn(warning));
  if (errors.length > 0) throw new Error(errors.join('\n'));
  logger.debug(`${states.length} diagram(s) settled`);
}

async function loadLivePage(
  browser: Browser,
  url: string,
  logger: Logger,
  options: { png?: PNGOptions; layout?: BrowserLayout } = {},
): Promise<Page> {
  const page = await browser.newPage();
  const normalizedPNG = options.png ? normalizePNGOptions(options.png) : undefined;
  await page.setViewport({
    ...(options.layout?.viewport ?? normalizedPNG?.viewport ?? DEFAULT_PNG_VIEWPORT),
    deviceScaleFactor: 1,
  });
  if (options.layout) await page.evaluateOnNewDocument(applyBrowserLayout, options.layout);

  // Surface browser-side failures loudly: a Vite transform/resolve error renders
  // as a `vite-error-overlay` element rather than the template, and would
  // otherwise be captured as a near-empty "successful" page.
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.stack ?? err.message));

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
  await renderMermaidInPage(page);
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
  // The template can mount after the network goes idle — later still on a busy
  // machine — so whether it has diagrams is only known once it has mounted.
  try {
    await page.waitForFunction(
      () => (document.getElementById('facet-root')?.childElementCount ?? 0) > 0,
      { timeout: READY_TIMEOUT_MS },
    );
  } catch {
    throw new Error(`Live render produced an empty #facet-root — the template did not mount within ${READY_TIMEOUT_MS}ms`);
  }
  if (normalizedPNG) await resolvePNGTarget(page, normalizedPNG);

  // A <Diagram> flips its root's data-facet-ready to "true" after react-xarrows
  // has measured and drawn. Wait for every diagram; if none is present, fall
  // back to a bounded settle delay.
  const hasDiagram = await page.$(DIAGRAM_SELECTOR);
  if (hasDiagram) {
    await waitForDiagrams(page, logger);
  } else {
    await new Promise((r) => setTimeout(r, FALLBACK_SETTLE_MS));
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
export async function snapshotHTML(
  url: string,
  logger: Logger,
  options: { png?: PNGOptions; layout?: BrowserLayout; signal?: AbortSignal } = {},
): Promise<string> {
  options.signal?.throwIfAborted();
  const browser = await launchBrowser();
  let closing: Promise<void> | undefined;
  const close = () => closing ??= browser.close();
  const abort = () => { void close().catch(() => undefined); };
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  try {
    options.signal?.throwIfAborted();
    const page = await loadLivePage(browser, url, logger, options);
    const content = await page.content();
    options.signal?.throwIfAborted();
    return makeSelfContained(content);
  } catch (error) {
    options.signal?.throwIfAborted();
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', abort);
    await close();
  }
}
