import type { Page } from 'puppeteer-core';

export interface PageReadinessOptions {
  timeoutMs?: number;
  waitForFacet?: boolean;
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
  await waitForPageReady(page, options);
}
