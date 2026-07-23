import type { Page } from 'puppeteer-core';
import { assetPath } from './assets.js';

export interface PageReadinessOptions {
  timeoutMs?: number;
  waitForFacet?: boolean;
}

interface MermaidRuntime {
  initialize(config: Record<string, unknown>): void;
  run(options: { querySelector: string }): Promise<void>;
}

/** Replace Mermaid code fences with SVG using the Chromium page already rendering the document. */
export async function renderMermaidInPage(page: Page): Promise<boolean> {
  const count = await page.evaluate(() => {
    const blocks = document.querySelectorAll('pre > code.language-mermaid');
    blocks.forEach((code) => {
      const container = document.createElement('div');
      container.className = 'mermaid';
      container.textContent = code.textContent;
      code.parentElement?.replaceWith(container);
    });
    return blocks.length;
  });
  if (count === 0) return false;

  const script = await page.addScriptTag({ path: assetPath('mermaid.min.js') });
  try {
    await page.evaluate(async () => {
      const runtime = (window as typeof window & { mermaid?: MermaidRuntime }).mermaid;
      if (!runtime) throw new Error('Mermaid runtime did not initialize');
      runtime.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
      await runtime.run({ querySelector: '.mermaid' });
    });
  } finally {
    await script.evaluate((element) => element.remove());
  }
  return true;
}

/**
 * Wait for resources which can change print layout after DOMContentLoaded.
 * Templates may expose `window.__FACET_READY__` as a Promise for asynchronous
 * charts or layout work. Broken images do not block rendering indefinitely.
 */
export async function waitForPageReady(
  page: Page,
  options: PageReadinessOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const waitForFacet = options.waitForFacet ?? true;

  await page.evaluate(
    async ({ timeout, facet }) => {
      const deadline = performance.now() + timeout;
      const withTimeout = async (promise: Promise<unknown>): Promise<void> => {
        const remaining = Math.max(0, deadline - performance.now());
        if (remaining === 0) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            promise,
            new Promise<void>((resolve) => {
              timer = setTimeout(resolve, remaining);
            }),
          ]);
        } finally {
          if (timer) clearTimeout(timer);
        }
      };

      await withTimeout(document.fonts.ready);
      await withTimeout(Promise.all(
        Array.from(document.images, async (image) => {
          if (!image.complete) {
            await new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            });
          }
          if (typeof image.decode === 'function') {
            await image.decode().catch(() => undefined);
          }
        }),
      ));

      if (facet) {
        const ready = (window as typeof window & { __FACET_READY__?: Promise<unknown> }).__FACET_READY__;
        if (ready && typeof ready.then === 'function') await withTimeout(ready);
      }
    },
    { timeout: timeoutMs, facet: waitForFacet },
  );
}

/** Load self-contained HTML and wait until it is stable enough to print. */
export async function setPreparedContent(
  page: Page,
  html: string,
  options: PageReadinessOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await renderMermaidInPage(page);
  await waitForPageReady(page, options);
}
