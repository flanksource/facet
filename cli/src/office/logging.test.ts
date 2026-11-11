import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { launchBrowser } from '../utils/pdf-generator.js';
import { generateOfficeBuffer } from './index.js';

const html = `<html><body><figure id="architecture" style="margin:0;width:320px;height:120px">
<figcaption><strong>Architecture figure.</strong> Supporting description.</figcaption>
<div data-facet-ready="true" style="width:320px;height:120px"><svg width="100" height="50"><path d="M0 0L100 50" stroke="blue"/></svg></div>
</figure><p>Editable conclusion</p></body></html>`;

describe('Office diagram logging', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it.each([
    { format: 'docx', media: 'PDF', verbose: 1 },
    { format: 'pptx', media: 'PNG', verbose: 1 },
    { format: 'docx', media: 'PDF', verbose: 0 },
    { format: 'pptx', media: 'PNG', verbose: 0 },
  ] as const)('logs each $format diagram generation and insertion with format and timing at verbosity $verbose', async ({ format, media, verbose }) => {
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await generateOfficeBuffer({ browser, html, format, verbose });
    const messages = output.mock.calls.map((args) => args.join(' ')).filter((message) => /visual (generated|inserted):/.test(message));
    expect(messages).toEqual(verbose ? [
      expect.stringMatching(new RegExp(`${format.toUpperCase()} visual generated: .*office-media-\\d+.*Architecture figure\\..*\\b${media}\\b.*\\d+\\.\\dms`)),
      ...(format === 'docx' ? [
        expect.stringMatching(/DOCX visual generated: .*office-media-\d+.*Architecture figure\..*\bPNG\b.*\d+\.\dms/),
        expect.stringMatching(/DOCX visual generated: .*office-media-\d+.*Architecture figure\..*PDF-in-EMF.*\d+\.\dms.*word\/media\/facetPdf\d+\.emf/),
      ] : []),
      expect.stringMatching(new RegExp(`${format.toUpperCase()} visual inserted: .*office-media-\\d+.*Architecture figure\\..*\\b${media}\\b.*\\d+\\.\\dms`)),
    ] : []);
  });
});
