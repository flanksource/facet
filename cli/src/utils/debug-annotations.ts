import type { Page } from 'puppeteer-core';
import { ELEMENT_SCALE, TEXT_SCALE } from './type-scale.js';

export interface FontCombo {
  family: string;
  size: string;
  weight: string;
  color: string;
  tag: string;
  sample: string;
}

export async function extractTypographyInfo(page: Page): Promise<FontCombo[]> {
  return page.evaluate(() => {
    const pxToPt = (px: string) => {
      const n = parseFloat(px);
      return isNaN(n) ? px : `${(n * 72 / 96).toFixed(1)}pt`;
    };

    const seen = new Set<string>();
    const combos: { family: string; size: string; weight: string; color: string; tag: string; sample: string }[] = [];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node: Element | null;
    while ((node = walker.nextNode() as Element | null)) {
      if (node.classList?.contains('debug-annotation')) continue;
      if (!node.textContent?.trim()) continue;

      const s = window.getComputedStyle(node);
      const family = s.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      const size = pxToPt(s.fontSize);
      const weight = s.fontWeight;
      const color = s.color;
      const key = `${family}|${size}|${weight}|${color}`;

      if (!seen.has(key)) {
        seen.add(key);
        const text = (node.textContent || '').trim().slice(0, 40);
        combos.push({ family, size, weight, color, tag: node.tagName.toLowerCase(), sample: text });
      }
    }
    return combos;
  });
}

export async function injectTypographyAnnotations(page: Page): Promise<void> {
  await page.evaluate(() => {
    const labelStyle = 'font-size:6pt;color:#9333ea;background:rgba(255,255,255,0.92);padding:0 2px;border-radius:2px;margin-left:4px;font-weight:normal;font-style:normal;line-height:1;white-space:nowrap;display:inline;vertical-align:baseline;border:1px solid #c084fc';

    const pxToPt = (px: string) => {
      const n = parseFloat(px);
      return isNaN(n) ? px : `${(n * 72 / 96).toFixed(1)}pt`;
    };

    const rgbToHex = (rgb: string) => {
      const m = rgb.match(/(\d+)/g);
      if (!m || m.length < 3) return rgb;
      return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    };

    const seen = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node: Element | null;
    while ((node = walker.nextNode() as Element | null)) {
      if (node.classList?.contains('debug-annotation')) continue;
      if (!node.textContent?.trim()) continue;

      const s = window.getComputedStyle(node);
      const family = s.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      const size = pxToPt(s.fontSize);
      const weight = s.fontWeight;
      const color = s.color;
      const key = `${family}|${size}|${weight}|${color}`;

      if (!seen.has(key)) {
        seen.add(key);
        const hex = rgbToHex(color);
        const span = document.createElement('span');
        span.setAttribute('style', labelStyle);
        span.textContent = ` [${size} w${weight} ${hex} ${family}]`;
        span.className = 'debug-annotation';
        node.appendChild(span);
      }
    }
  });
}

export interface TypographyProbe {
  tagName: string;
  classNames: string[];
  hasInlineFontSize: boolean;
  /**
   * Whether a stylesheet rule sets this element's `font-size` through a
   * selector more specific than its bare tag name — `blockquote p`,
   * `.datasheet-footer p`, `.section-header-bar h2`. Those are deliberate
   * component sizes, so the element scale is not what they should match.
   *
   * Bare-tag rules deliberately do not count: Tailwind preflight's
   * `h1 { font-size: inherit }` is one, and it collapsing the headings is the
   * exact bug this overlay exists to catch.
   */
  hasSpecificFontSizeRule?: boolean;
}

const PT_PER_UNIT: Record<string, number> = { pt: 1, px: 72 / 96, rem: 12 };

/** `text-[8pt]` -> 8. Null for parent-relative units, which have no fixed size. */
function arbitraryUtilityPoints(className: string): number | null {
  const match = className.match(/^text-\[(\d*\.?\d+)([a-z%]+)\]$/);
  const factor = match ? PT_PER_UNIT[match[2]] : undefined;
  return factor == null ? null : Number((Number(match![1]) * factor).toFixed(4));
}

/**
 * The unscaled size the cascade should land on, resolved in the order the
 * cascade itself resolves it: arbitrary utility, then named step, then the
 * element rule.
 */
function resolvePoints({ tagName, classNames }: TypographyProbe): number | null {
  const arbitrary = classNames.find(cls => /^text-\[.+\]$/.test(cls));
  if (arbitrary) return arbitraryUtilityPoints(arbitrary);

  // Only the named steps: `text-gray-500` shares the prefix and is not a size.
  const step = classNames
    .filter(cls => cls.startsWith('text-'))
    .map(cls => cls.slice('text-'.length))
    .find(step => step in TEXT_SCALE);
  if (step) return TEXT_SCALE[step as keyof typeof TEXT_SCALE].pt;

  // `body` carries the document default rather than an element rule of its own,
  // and is not one of the tags the overlay annotates.
  if (tagName === 'BODY') return null;
  return ELEMENT_SCALE[tagName.toLowerCase() as keyof typeof ELEMENT_SCALE]?.pt ?? null;
}

/**
 * The size an element is supposed to compute to, or null when nothing in the
 * type scale claims it and the overlay should stay silent.
 *
 * Resolved in the same order the cascade resolves it, because judging on tag
 * name alone contradicted the stylesheet: utilities deliberately outrank
 * element rules — `computed-type.test.ts` asserts exactly that — so every
 * `<p class="text-xs">` was reported as drifted against the 9pt `p` default.
 *
 * `scale` is the `--facet-font-scale` in force. Without it every element reads
 * as drifted whenever `--font-size` is set, which is exactly when someone is
 * most likely to be looking at this overlay.
 */
export function expectedFontPoints(probe: TypographyProbe, scale = 1): number | null {
  // An inline size is the author saying what they want; it cannot be drift.
  if (probe.hasInlineFontSize) return null;
  if (probe.hasSpecificFontSizeRule) return null;

  const points = resolvePoints(probe);
  return points == null ? null : points * scale;
}

/**
 * Whether any of the selectors matching an element claims it through something
 * richer than its bare tag name. `h1, h2, h3` reaches an h2 as a bare tag;
 * `.section-header-bar h2` reaches it as a deliberate component rule.
 */
export function hasSpecificFontSizeSelector(matchedSelectors: string[]): boolean {
  return matchedSelectors.some(selector => !/^[a-zA-Z][\w-]*$/.test(selector.trim()));
}

/** One heading/paragraph label: its computed size, and its drift note if any. */
function headingLabel(probe: TypographyProbe & { actualPt: number }, scale: number): string {
  const expected = expectedFontPoints(probe, scale);
  const size = `${probe.actualPt.toFixed(1)}pt`;
  // Compare as numbers. This used to compare the formatted string against a
  // literal without a decimal, so a correct 22pt heading read "22.0pt" against
  // "22pt" and never matched — every element was annotated `expected=`,
  // whether right or wrong, which made the flag say nothing.
  if (expected == null || Math.abs(probe.actualPt - expected) <= 0.05) return size;
  return `${size} expected=${Number(expected.toFixed(2))}pt`;
}

export async function injectDebugAnnotations(page: Page, scale = 1): Promise<void> {
  // Measure what the document will actually print. `page.pdf()` renders in
  // print media, but `getComputedStyle` here reports screen media until the
  // page is told otherwise — so the responsive `@media screen` heading clamps
  // applied, and the overlay labelled every h1 26pt and every h2 18pt on a
  // document that prints them at 22pt and 15pt. The emulation is sticky, so
  // the annotation passes that follow measure the same way.
  await page.emulateMediaType('print');

  // Read the headings first and decide drift in Node, then write the labels
  // back. The decision needs the type scale and is worth unit-testing, and
  // neither travels into a page.evaluate closure.
  const probes = await page.evaluate(() => {
    // Every selector in the document that sets font-size, flattened once so the
    // per-element test below is a plain `matches` loop.
    const fontSizeSelectors: string[] = [];
    const collect = (rules: CSSRuleList) => {
      Array.from(rules).forEach((rule) => {
        const styleRule = rule as CSSStyleRule;
        if (styleRule.selectorText && styleRule.style?.fontSize) {
          // Split the list so each part can be matched on its own: an element
          // reached by the bare `h2` of `h1, h2` is a different case from one
          // reached by `.section-header-bar h2`. A part of a `:is(a, b)` list
          // splits into invalid selectors, which simply fail to match below.
          styleRule.selectorText.split(',').forEach(part => fontSizeSelectors.push(part.trim()));
        }
        // Recurse last, and only when there is something to recurse into: since
        // CSS nesting, a plain style rule also carries an (empty) `cssRules`,
        // so treating that as "this is a grouping rule" skipped every single
        // declaration in the document and collected nothing at all.
        const children = (rule as CSSGroupingRule).cssRules;
        if (children?.length) collect(children);
      });
    };
    Array.from(document.styleSheets).forEach((sheet) => {
      // Cross-origin sheets throw on access and have nothing to contribute.
      try { collect(sheet.cssRules); } catch { /* not readable */ }
    });

    return Array.from(document.querySelectorAll('h1, h2, h3, h4, p')).map((el) => ({
      tagName: el.tagName,
      classNames: Array.from(el.classList),
      hasInlineFontSize: !!(el as HTMLElement).style?.fontSize,
      actualPt: parseFloat(window.getComputedStyle(el).fontSize) * 72 / 96,
      skip: !!el.closest('.debug-annotation'),
      matchedSelectors: fontSizeSelectors.filter((selector) => {
        try { return !!selector && el.matches(selector); } catch { return false; }
      }),
    }));
  });

  const labels = probes.map(probe => (probe.skip ? null : headingLabel({
    ...probe,
    hasSpecificFontSizeRule: hasSpecificFontSizeSelector(probe.matchedSelectors),
  }, scale)));

  await page.evaluate((texts: (string | null)[]) => {
    const labelStyle = 'font-size:7pt;color:#e53e3e;background:rgba(255,255,255,0.9);padding:0 2px;border-radius:2px;margin-left:4px;font-weight:normal;font-style:normal;line-height:1;white-space:nowrap;display:inline;vertical-align:baseline';
    document.querySelectorAll('h1, h2, h3, h4, p').forEach((el, index) => {
      const text = texts[index];
      if (text == null) return;
      const span = document.createElement('span');
      span.setAttribute('style', labelStyle);
      span.textContent = ` [${text}]`;
      span.className = 'debug-annotation';
      el.appendChild(span);
    });
  }, labels);

  await page.evaluate(() => {
    const labelStyle ='font-size:7pt;color:#e53e3e;background:rgba(255,255,255,0.9);padding:0 2px;border-radius:2px;margin-left:4px;font-weight:normal;font-style:normal;line-height:1;white-space:nowrap;display:inline;vertical-align:baseline';

    const pxToPt = (px: string) => {
      const n = parseFloat(px);
      return isNaN(n) ? px : `${(n * 72 / 96).toFixed(1)}pt`;
    };

    const pxToMm = (px: string) => {
      const n = parseFloat(px);
      return isNaN(n) ? px : `${(n * 25.4 / 96).toFixed(1)}mm`;
    };

    const makeLabel = (text: string): HTMLSpanElement => {
      const span = document.createElement('span');
      span.setAttribute('style', labelStyle);
      span.textContent = ` [${text}]`;
      span.className = 'debug-annotation';
      return span;
    };

    const makeBlockLabel = (text: string): HTMLDivElement => {
      const div = document.createElement('div');
      div.setAttribute('style', `${labelStyle};display:block;margin-bottom:2px;padding:1px 3px`);
      div.textContent = text;
      div.className = 'debug-annotation';
      return div;
    };

    // Annotate first occurrence of each unique font size per page
    document.querySelectorAll('[data-page-size]').forEach((pageEl) => {
      const seenSizes = new Set<string>();
      const walker = document.createTreeWalker(pageEl, NodeFilter.SHOW_ELEMENT);
      let el: Element | null;
      while ((el = walker.nextNode() as Element | null)) {
        if (el.classList?.contains('debug-annotation')) continue;
        if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4' || el.tagName === 'P') continue;
        if (!el.textContent?.trim()) continue;
        const s = window.getComputedStyle(el);
        const size = pxToPt(s.fontSize);
        if (!seenSizes.has(size)) {
          seenSizes.add(size);
          el.appendChild(makeLabel(size));
        }
      }
    });

    document.querySelectorAll('table').forEach((table) => {
      const ts = window.getComputedStyle(table);
      const tableInfo = `table: font=${pxToPt(ts.fontSize)} collapse=${ts.borderCollapse} w=${pxToMm(ts.width)}`;
      table.parentNode?.insertBefore(makeBlockLabel(tableInfo), table);

      const firstTh = table.querySelector('th');
      if (firstTh) {
        const ths = window.getComputedStyle(firstTh);
        firstTh.appendChild(makeLabel(`th: ${pxToPt(ths.fontSize)} pad=${pxToMm(ths.padding)} bg=${ths.backgroundColor}`));
      }

      const firstTd = table.querySelector('td');
      if (firstTd) {
        const tds = window.getComputedStyle(firstTd);
        firstTd.appendChild(makeLabel(`td: ${pxToPt(tds.fontSize)} pad=${pxToMm(tds.padding)}`));
      }
    });
  });
}
