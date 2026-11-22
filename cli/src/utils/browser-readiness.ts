import type { HTTPRequest, HTTPResponse, Page } from 'puppeteer-core';
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
  await page.evaluate(waitForBrowserResources, { timeout: options.timeoutMs ?? 30_000, facet: options.waitForFacet ?? true });
}

async function waitForBrowserResources({ timeout, facet }: { timeout: number; facet: boolean }): Promise<void> {
  let phase = 'the live Facet document';
  let observer: MutationObserver | undefined;
  const ready = async () => {
    if (facet && document.getElementById('facet-document-status')) {
      await new Promise<void>((resolve, reject) => {
        const check = () => {
          const status = document.getElementById('facet-document-status');
          if (status?.getAttribute('role') === 'alert') reject(new Error(status.textContent?.trim() || 'Live Facet document failed'));
          if (!status) resolve();
        };
        observer = new MutationObserver(check);
        observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['role'] });
        check();
      });
      observer?.disconnect();
    }
    phase = 'the template readiness hook';
    if (facet) await (window as typeof window & { __FACET_READY__?: Promise<unknown> }).__FACET_READY__;
    phase = 'page fonts and images';
    await Promise.all([document.fonts.ready, ...Array.from(document.images, async (image) => {
      if (!image.complete) await new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
      if (typeof image.decode === 'function') await image.decode().catch(() => undefined);
    })]);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([ready(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out waiting for ${phase} after ${timeout}ms`)), timeout);
    })]);
  } finally {
    clearTimeout(timer);
    observer?.disconnect();
  }
}

/** Load self-contained HTML and wait until it is stable enough to print. */
export async function setPreparedContent(
  page: Page,
  html: string,
  options: PageReadinessOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const failedAssets = new Set<string>();
  const trackRequestFailure = (request: HTTPRequest) => {
    if (request.resourceType() === 'stylesheet' || request.resourceType() === 'font') {
      failedAssets.add(`${request.resourceType()} (${request.failure()?.errorText ?? 'network error'})`);
    }
  };
  const trackResponseFailure = (response: HTTPResponse) => {
    const resource = response.request().resourceType();
    if ((resource === 'stylesheet' || resource === 'font') && response.status() >= 400) {
      failedAssets.add(`${resource} (HTTP ${response.status()})`);
    }
  };
  page.on('requestfailed', trackRequestFailure);
  page.on('response', trackResponseFailure);
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: timeoutMs });
    await waitForPageReady(page, options);
    if (await renderMermaidInPage(page)) await waitForPageReady(page, { ...options, waitForFacet: false });
    const failedFonts = await page.evaluate(() => {
      const families: string[] = [];
      document.fonts.forEach((font) => {
        if (font.status === 'error') families.push(font.family);
      });
      return families;
    });
    if (failedFonts.length > 0) failedAssets.add(`font faces (${failedFonts.join(', ')})`);
    if (failedAssets.size > 0) throw new Error(`Page resources failed to load: ${[...failedAssets].join(', ')}`);
  } finally {
    page.off('requestfailed', trackRequestFailure);
    page.off('response', trackResponseFailure);
  }
}
