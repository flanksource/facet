/**
 * PDF Generation Utilities
 *
 * Uses Puppeteer to convert HTML to PDF.
 * Extracted and adapted from scripts/generate-pdfs.js
 */

import { existsSync } from 'fs';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { Logger } from './logger.js';

const SYSTEM_CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
};

function resolveChromePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  return (SYSTEM_CHROME_PATHS[process.platform] ?? []).find(existsSync);
}

async function injectFixedHeaderFooter(page: Page): Promise<void> {
  await page.evaluate(() => {
    const pageEl = document.querySelector('[data-page-size]');
    const headerHeight = parseInt(pageEl?.getAttribute('data-header-height') || '0', 10);
    const footerHeight = parseInt(pageEl?.getAttribute('data-footer-height') || '0', 10);
    const header = document.querySelector('.datasheet-header');
    const footer = document.querySelector('.datasheet-footer');

    if (header) {
      const clone = header.cloneNode(true) as HTMLElement;
      clone.className = 'fixed-header';
      Object.assign(clone.style, {
        position: 'fixed', top: `-${headerHeight}mm`, left: '0', right: '0',
        zIndex: '10000', width: '100%',
      });
      document.body.prepend(clone);
    }

    if (footer) {
      const clone = footer.cloneNode(true) as HTMLElement;
      clone.className = 'fixed-footer';
      Object.assign(clone.style, {
        position: 'fixed', bottom: `-${footerHeight}mm`, left: '0', right: '0',
        zIndex: '10000', width: '100%',
      });
      document.body.append(clone);
    }

    document.querySelectorAll('.datasheet-header, .datasheet-footer').forEach(el => {
      (el as HTMLElement).style.visibility = 'hidden';
      (el as HTMLElement).style.height = '0';
      (el as HTMLElement).style.overflow = 'hidden';
    });
  });
}

async function extractPageMargins(page: Page): Promise<{ top: number; bottom: number }> {
  return page.evaluate(() => {
    const pages = document.querySelectorAll('[data-page-size]');
    let maxTop = 0, maxBottom = 0;
    pages.forEach(p => {
      maxTop = Math.max(maxTop, parseInt(p.getAttribute('data-header-height') || '0', 10));
      maxBottom = Math.max(maxBottom, parseInt(p.getAttribute('data-footer-height') || '0', 10));
    });
    return { top: maxTop, bottom: maxBottom };
  });
}

export interface PDFOptions {
  html: string;
  outputPath: string;
  logger?: Logger;
}

/**
 * Generate PDF from HTML content
 */
export async function generatePDFFromHTML(options: PDFOptions): Promise<void> {
  const { html, outputPath, logger } = options;

  const log = logger || new Logger(false);

  const chromePath = resolveChromePath();
  log.debug(`Using browser: ${chromePath ?? 'Puppeteer bundled Chromium'}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    log.debug('Creating new page');
    const page = await browser.newPage();

    // Set content directly (no need for file:// URL)
    log.debug('Setting HTML content');
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for fonts to load
    log.debug('Waiting for fonts to load');
    await page.evaluateHandle('document.fonts.ready');

    // Additional wait for any dynamic content
    await new Promise((resolve) => setTimeout(resolve, 500));

    log.debug('Injecting fixed header/footer');
    await injectFixedHeaderFooter(page);

    log.debug('Generating PDF');

    const margins = await extractPageMargins(page);
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: `${margins.top}mm`,
        bottom: `${margins.bottom}mm`,
        left: 0,
        right: 0,
      },
      omitBackground: false,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    log.debug(`PDF saved to: ${outputPath}`);

    await page.close();
  } finally {
    await browser.close();
    log.debug('Browser closed');
  }
}

/**
 * Launch a browser instance for multiple PDF generations
 * Useful for batch operations
 */
export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    executablePath: resolveChromePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

/**
 * Generate PDF from HTML using an existing browser instance
 */
export async function generatePDFWithBrowser(
  browser: Browser,
  html: string,
  outputPath: string,
  logger?: Logger
): Promise<void> {
  const log = logger || new Logger(false);

  log.debug('Creating new page');
  const page = await browser.newPage();

  try {
    log.debug('Setting HTML content');
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Additional wait
    await new Promise((resolve) => setTimeout(resolve, 500));

    await injectFixedHeaderFooter(page);

    log.debug('Generating PDF');

    const margins2 = await extractPageMargins(page);
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: `${margins2.top}mm`,
        bottom: `${margins2.bottom}mm`,
        left: 0,
        right: 0,
      },
      omitBackground: false,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    log.debug(`PDF saved to: ${outputPath}`);
  } finally {
    await page.close();
  }
}

export interface BufferPDFOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
}

/**
 * Generate PDF from HTML using an existing browser, returning a Buffer
 */
export async function generatePDFBuffer(
  browser: Browser,
  html: string,
  options?: BufferPDFOptions,
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluateHandle('document.fonts.ready');
    await new Promise((resolve) => setTimeout(resolve, 500));

    await injectFixedHeaderFooter(page);

    const margins = await extractPageMargins(page);
    const pdf = await page.pdf({
      format: options?.format ?? 'A4',
      landscape: options?.landscape ?? false,
      margin: { top: `${margins.top}mm`, bottom: `${margins.bottom}mm`, left: 0, right: 0 },
      omitBackground: false,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
