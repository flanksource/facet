import type { Browser, BrowserContext, Page } from 'puppeteer-core';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef } from 'pdf-lib';
import { setPreparedContent } from './browser-readiness.js';
import {
  mmToPx,
  printableHeightCss,
  renderGroup,
  resolvePageSize,
  type PageType,
  type RenderMargins,
} from './pdf-multipass.js';

type PageProvider = Browser | BrowserContext;

export interface TocPageMeasurement {
  id?: string;
  physicalPageCount: number;
}

export interface TocPageRenderSpec {
  type: PageType;
  size: string;
  margins: RenderMargins;
}

export interface AutomaticTocOptions {
  browser: PageProvider;
  sourcePage: Page;
  specs: TocPageRenderSpec[];
  preparePage?: (page: Page) => Promise<void>;
}

interface TocTarget {
  id: string;
  pageIndex: number;
  isPage: boolean;
}

interface TocRequest {
  targets: string[];
  pageIds: (string | undefined)[];
  anchors: TocTarget[];
}

async function printedAnchorOffsets(buffer: Buffer, targets: string[]): Promise<Map<string, number>> {
  const pdf = await PDFDocument.load(buffer);
  const destinations = pdf.catalog.lookup(PDFName.of('Dests'));
  if (!(destinations instanceof PDFDict)) {
    throw new Error('Printed PDF has no named destinations for table of contents anchors');
  }
  const pageByRef = new Map(pdf.getPages().map((page, index) => [page.ref.toString(), index]));
  const offsets = new Map<string, number>();
  for (const target of targets) {
    const destination = destinations.lookup(PDFName.of(target));
    const pageRef = destination instanceof PDFArray ? destination.get(0) : undefined;
    const offset = pageRef instanceof PDFRef ? pageByRef.get(pageRef.toString()) : undefined;
    if (offset === undefined) {
      throw new Error(`Table of contents anchor "${target}" has no printed PDF destination`);
    }
    offsets.set(target, offset);
  }
  return offsets;
}

async function readTocRequest(page: Page): Promise<TocRequest> {
  return page.evaluate(() => {
    const pages = Array.from(document.querySelectorAll('[data-page-size]'));
    return {
      targets: Array.from(document.querySelectorAll('[data-facet-toc-target]'))
        .map((element) => element.getAttribute('data-facet-toc-target') || ''),
      pageIds: pages.map((element) => element.getAttribute('data-facet-page-id') || undefined),
      anchors: Array.from(document.querySelectorAll('[id]')).map((element) => ({
        id: element.id,
        pageIndex: pages.indexOf(element.closest('[data-page-size]') as Element),
        isPage: element.hasAttribute('data-page-size'),
      })),
    };
  });
}

function resolveTargets(request: TocRequest, targets: string[]): TocTarget[] {
  return targets.map((target) => {
    const matches = [
      ...request.pageIds.flatMap((id, pageIndex) => id === target ? [{ id: target, pageIndex, isPage: true }] : []),
      ...request.anchors.filter((anchor) => anchor.id === target && !anchor.isPage),
    ];
    if (matches.length === 0) {
      throw new Error(`Table of contents target "${target}" does not match a Page or section anchor`);
    }
    if (matches.length > 1) {
      throw new Error(`Table of contents target "${target}" matches more than one element`);
    }
    if (matches[0].pageIndex < 0) {
      throw new Error(`Table of contents target "${target}" is outside a Page`);
    }
    return matches[0];
  });
}

async function clonePageForMeasurement(page: Page, pageIndex: number, anchorIds: string[]): Promise<string> {
  return page.evaluate(({ pageIndex, anchorIds }) => {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    const pages = clone.querySelectorAll('[data-page-size]');
    const targetPage = pages[pageIndex];
    pages.forEach((element, index) => {
      if (index !== pageIndex) element.remove();
    });
    clone.querySelectorAll('.page-break, script').forEach((element) => element.remove());
    anchorIds.forEach((id, index) => {
      const link = document.createElement('a');
      link.href = `#${encodeURIComponent(id)}`;
      link.textContent = '.';
      link.setAttribute('style', `position:absolute;top:0;left:${index * 2}px;width:1px;height:1px;font-size:1px;line-height:1px;color:rgba(0,0,0,.01)`);
      targetPage.append(link);
    });
    return `<!DOCTYPE html>${clone.outerHTML}`;
  }, { pageIndex, anchorIds });
}

async function measureTocPage(options: {
  browser: PageProvider;
  sourcePage: Page;
  spec: TocPageRenderSpec;
  index: number;
  anchors: string[];
  preparePage?: (page: Page) => Promise<void>;
}): Promise<{ physicalPageCount: number; offsets: Map<string, number> }> {
  const dims = resolvePageSize(options.spec.size);
  const html = await clonePageForMeasurement(options.sourcePage, options.index, options.anchors);
  const page = await options.browser.newPage();
  try {
    await page.setViewport({ width: mmToPx(dims.width), height: mmToPx(dims.height) });
    await setPreparedContent(page, html);
    await page.addStyleTag({
      content: printableHeightCss(dims.height, options.spec.margins.top, options.spec.margins.bottom),
    });
    if (options.preparePage) await options.preparePage(page);
    const result = await renderGroup(
      page,
      { type: options.spec.type, size: options.spec.size, elementIndices: [0] },
      dims,
      options.spec.margins,
    );
    return {
      physicalPageCount: result.pageCount,
      offsets: options.anchors.length > 0 ? await printedAnchorOffsets(result.buffer, options.anchors) : new Map(),
    };
  } finally {
    await page.close();
  }
}

export function resolveTocPageStarts(
  pages: TocPageMeasurement[],
  targets: string[],
): Map<string, number> {
  const requested = new Set(targets);
  const starts = new Map<string, number>();
  let physicalPage = 1;

  for (const page of pages) {
    if (!Number.isInteger(page.physicalPageCount) || page.physicalPageCount <= 0) {
      throw new Error(`Invalid physical page count ${page.physicalPageCount}`);
    }

    if (page.id && requested.has(page.id)) {
      if (starts.has(page.id)) {
        throw new Error(`Table of contents target "${page.id}" matches more than one Page`);
      }
      starts.set(page.id, physicalPage);
    }
    physicalPage += page.physicalPageCount;
  }

  for (const target of requested) {
    if (!starts.has(target)) {
      throw new Error(`Table of contents target "${target}" does not match a Page`);
    }
  }

  return starts;
}

export async function resolveAutomaticTableOfContents(
  options: AutomaticTocOptions,
): Promise<string> {
  const request = await readTocRequest(options.sourcePage);
  const targets = [...new Set(request.targets)];
  if (targets.length === 0) return options.sourcePage.content();
  if (options.specs.length !== request.pageIds.length) {
    throw new Error(`Table of contents found ${request.pageIds.length} Pages but received ${options.specs.length} render specifications`);
  }

  const resolvedTargets = resolveTargets(request, targets);
  const lastTargetIndex = Math.max(...resolvedTargets.map((target) => target.pageIndex));

  for (let pass = 0; pass < 4; pass++) {
    const measurements: TocPageMeasurement[] = [];
    const anchorOffsets = new Map<string, number>();
    for (let index = 0; index <= lastTargetIndex; index++) {
      const anchors = resolvedTargets.filter((target) => target.pageIndex === index && !target.isPage).map((target) => target.id);
      const { physicalPageCount, offsets } = await measureTocPage({
        browser: options.browser,
        sourcePage: options.sourcePage,
        spec: options.specs[index],
        index,
        anchors,
        preparePage: options.preparePage,
      });
      measurements.push({ id: request.pageIds[index], physicalPageCount });
      offsets.forEach((offset, target) => anchorOffsets.set(target, offset));
    }

    const starts = resolveTocPageStarts(measurements, resolvedTargets.filter((target) => target.isPage).map((target) => target.id));
    let physicalPage = 1;
    measurements.forEach((measurement, index) => {
      resolvedTargets.filter((target) => target.pageIndex === index && !target.isPage).forEach((target) => {
        const offset = anchorOffsets.get(target.id);
        if (offset === undefined) throw new Error(`Missing printed table of contents anchor "${target.id}"`);
        starts.set(target.id, physicalPage + offset);
      });
      physicalPage += measurement.physicalPageCount;
    });
    const changed = await options.sourcePage.evaluate((labels: Array<[string, number]>) => {
      const byTarget = new Map(labels);
      let updated = false;
      document.querySelectorAll('[data-facet-toc-target]').forEach((element) => {
        const target = element.getAttribute('data-facet-toc-target') || '';
        const page = byTarget.get(target);
        if (page === undefined) throw new Error(`Missing resolved table of contents target "${target}"`);
        if (element.textContent !== String(page)) {
          element.textContent = String(page);
          updated = true;
        }
      });
      return updated;
    }, [...starts]);
    if (!changed) return options.sourcePage.content();
  }
  throw new Error('Table of contents page numbers did not converge after four passes');
}
