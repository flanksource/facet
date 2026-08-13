/**
 * Computed typography tests.
 *
 * Nothing in the suite ever asserted a *rendered* font size — `font-size`
 * appeared only as test input — so the entire print type scale could be, and
 * was, outranked into oblivion by a cascade-layer ordering bug without a single
 * test going red. These tests build a real document through the CLI, load it
 * under print emulation, and read `getComputedStyle` back.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { type Browser } from 'puppeteer';
import { launchBrowser } from '../src/utils/pdf-generator.js';
import { fontScaleCss } from '../src/utils/font-size.js';
import { ELEMENT_SCALE, TEXT_SCALE } from '../src/utils/type-scale.js';

const KITCHEN_SINK = join(import.meta.dirname, '../../examples/kitchen-sink');
const TEMPLATE = 'TableExamples.tsx';

/** Sizes are read in px and asserted in pt; sub-pixel rounding costs ~0.01pt. */
const PT_PRECISION = 1; // toBeCloseTo digits => ±0.05pt

async function buildHtml(): Promise<string> {
  // Run the CLI from source via tsx rather than the packaged `dist/facet` SEA:
  // the stylesheet under test is assembled at build time, so this must exercise
  // the current tree, not whatever binary happens to be lying around.
  const tsx = join(import.meta.dirname, '../../node_modules/.bin/tsx');
  const cli = join(import.meta.dirname, '../src/cli.ts');
  const outDir = await mkdtemp(join(tmpdir(), 'facet-type-'));
  execSync(`${tsx} ${cli} html ${TEMPLATE} -o ${outDir}`, {
    cwd: KITCHEN_SINK, timeout: 300000, stdio: 'pipe',
  });
  const html = readFileSync(join(outDir, TEMPLATE.replace('.tsx', '.html')), 'utf-8');
  execSync(`rm -rf "${outDir}"`);
  return html;
}

/**
 * Read the computed size in pt for each `tag[.class]` probe. Probes other than
 * `body` are injected rather than looked up, so the assertion is about the
 * *stylesheet* — the thing that broke — and not about one example's markup.
 */
async function probePoints(browser: Browser, html: string, probes: string[]): Promise<Record<string, number>> {
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('print');
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'load' });

    return await page.evaluate((specs: string[]) => {
      const out: Record<string, number> = {};
      for (const spec of specs) {
        const [tag, className] = spec.split('.');
        let el: HTMLElement;
        if (tag === 'body') {
          el = document.body;
        } else {
          el = document.createElement(tag);
          if (className) el.className = className;
          el.textContent = 'Ag';
          document.body.appendChild(el);
        }
        out[spec] = parseFloat(getComputedStyle(el).fontSize) * 72 / 96;
      }
      return out;
    }, probes);
  } finally {
    await page.close();
  }
}

/** Computed `line-height` in pt for each injected probe. */
async function probeLeading(browser: Browser, html: string, probes: string[]): Promise<Record<string, number>> {
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('print');
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'load' });

    return await page.evaluate((specs: string[]) => {
      const out: Record<string, number> = {};
      for (const spec of specs) {
        const [tag, className] = spec.split('.');
        const el = document.createElement(tag);
        if (className) el.className = className;
        el.textContent = 'Ag';
        document.body.appendChild(el);
        out[spec] = parseFloat(getComputedStyle(el).lineHeight) * 72 / 96;
      }
      return out;
    }, probes);
  } finally {
    await page.close();
  }
}

/** Rendered height in mm of every page box, with the renderer's variable set. */
async function probePageHeights(browser: Browser, html: string, printableMm: number): Promise<number[]> {
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('print');
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'load' });
    // Matches what the PDF renderer injects, minus the same rounding margin.
    await page.addStyleTag({ content: `:root { --facet-printable-height: ${printableMm - 0.5}mm; }` });

    return await page.evaluate(() => [...document.querySelectorAll('[data-page-size]')]
      .map(el => +(el.getBoundingClientRect().height * 25.4 / 96).toFixed(1)));
  } finally {
    await page.close();
  }
}

describe('computed print typography', () => {
  let browser: Browser;
  let html: string;

  beforeAll(async () => {
    browser = await launchBrowser();
    html = await buildHtml();
  }, 300000);

  afterAll(async () => { await browser?.close(); });

  it('renders headings and body at the declared element scale', async () => {
    const points = await probePoints(browser, html, Object.keys(ELEMENT_SCALE));

    // Tailwind preflight resets headings to `font-size:inherit` in `@layer
    // base`. If the facet layer is declared before base it loses, every heading
    // collapses to body size, and only this assertion notices.
    for (const [tag, step] of Object.entries(ELEMENT_SCALE)) {
      expect(points[tag], `${tag} font-size`).toBeCloseTo(step.pt, PT_PRECISION);
    }
  }, 120000);

  it('renders each text utility at the declared point scale', async () => {
    const probes = Object.keys(TEXT_SCALE).map(step => `span.text-${step}`);
    const points = await probePoints(browser, html, probes);

    // These are `rem`-based in stock Tailwind: without the pt theme they land
    // at 1rem-relative sizes, making text-xs 9pt instead of 7pt (+29%).
    for (const [step, { pt }] of Object.entries(TEXT_SCALE)) {
      expect(points[`span.text-${step}`], `text-${step}`).toBeCloseTo(pt, PT_PRECISION);
    }
  }, 120000);

  it('lets a text utility override the element default it sits on', async () => {
    const points = await probePoints(browser, html, ['p.text-lg', 'p']);

    // The fix for the layer bug moves `facet` above `base`. It must not go so
    // far as to outrank `utilities`, or every utility class stops working.
    expect(points['p']).toBeCloseTo(ELEMENT_SCALE.p.pt, PT_PRECISION);
    expect(points['p.text-lg']).toBeCloseTo(TEXT_SCALE.lg.pt, PT_PRECISION);
  }, 120000);

  it('carries a line-height with every text utility', async () => {
    const probes = Object.keys(TEXT_SCALE).map(step => `p.text-${step}`);
    const leadings = await probeLeading(browser, html, probes);

    // Size without leading is worse than no scale at all: text-2xl drew 24pt
    // glyphs on the p rule's 12pt leading, so any sample that wrapped
    // overlapped itself. Nothing caught it, because every test asked only
    // about font-size.
    for (const [step, { leading }] of Object.entries(TEXT_SCALE)) {
      expect(leadings[`p.text-${step}`], `text-${step} line-height`).toBeCloseTo(leading, PT_PRECISION);
    }
  }, 120000);

  it('fits each page box inside the printable area', async () => {
    // A page box taller than the sheet-minus-margins spills a second, near-empty
    // physical page. A flat 240mm floor on <main> ignored the page title above
    // it, so every page of every document overflowed by ~2mm and printed twice.
    // The renderer now injects the real figure; this asserts the box respects it.
    const printableMm = 297 - 24 - 16;
    const heights = await probePageHeights(browser, html, printableMm);

    expect(heights.length).toBeGreaterThan(0);
    for (const [index, mm] of heights.entries()) {
      expect(mm, `page ${index + 1} height in mm`).toBeLessThanOrEqual(printableMm);
    }
  }, 120000);

  it('rescales every surface proportionally, not just the ones a rule names', async () => {
    // The old --font-size emitted absolute CSS for twenty selectors. Everything
    // else — tables, footers, code, and the 143 arbitrary text-[Npt] classes the
    // components use — kept its literal size, so raising the base size distorted
    // the hierarchy instead of growing it. These are the surfaces it missed.
    const page = await browser.newPage();
    try {
      await page.emulateMediaType('print');
      await page.setViewport({ width: 794, height: 1123 });
      await page.setContent(html, { waitUntil: 'load' });
      await page.addStyleTag({ content: fontScaleCss(ELEMENT_SCALE.body.pt / 2) });

      const points = await page.evaluate(() => {
        const pt = (el: Element) => parseFloat(getComputedStyle(el).fontSize) * 72 / 96;
        const inject = (html: string) => {
          const host = document.createElement('div');
          host.innerHTML = html;
          document.body.appendChild(host);
          return host.firstElementChild!;
        };
        return {
          h1: pt(inject('<h1>Ag</h1>')),
          table: pt(inject('<table><tbody><tr><td>x</td></tr></tbody></table>')),
          footer: pt(inject('<div class="datasheet-footer"><p>x</p></div>').querySelector('p')!),
          code: pt(inject('<code>x</code>')),
          arbitrary: pt(inject('<span class="text-[8pt]">Ag</span>')),
          utility: pt(inject('<span class="text-xs">Ag</span>')),
        };
      });

      expect(points.h1).toBeCloseTo(ELEMENT_SCALE.h1.pt / 2, PT_PRECISION);
      expect(points.table).toBeCloseTo(4.5, PT_PRECISION);
      expect(points.footer).toBeCloseTo(4, PT_PRECISION);
      expect(points.code).toBeCloseTo(4.5, PT_PRECISION);
      expect(points.arbitrary).toBeCloseTo(4, PT_PRECISION);
      expect(points.utility).toBeCloseTo(TEXT_SCALE.xs.pt / 2, PT_PRECISION);
    } finally {
      await page.close();
    }
  }, 120000);
});
