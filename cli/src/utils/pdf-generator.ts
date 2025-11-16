/**
 * PDF Generation Utilities
 *
 * Uses Puppeteer to convert HTML to PDF.
 * Extracted and adapted from scripts/generate-pdfs.js
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import { Logger } from './logger.js';

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

  log.debug('Launching Puppeteer browser');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
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

    log.debug('Generating PDF');

    // Generate PDF with zero margins (spacing controlled by CSS)
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      omitBackground: false,
      printBackground: true,
      displayHeaderFooter: false, // Simplified - no custom headers/footers for now
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

    log.debug('Generating PDF');

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: 0,
        bottom: 0,
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
