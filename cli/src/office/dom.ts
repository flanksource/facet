import type { Block, Border, Box, Cell, Chrome, Group, Insets, Line, OfficeDocument, Paragraph, Run, TextStyle } from './model.js';

// This function is serialized into Chromium; keep runtime dependencies inside it.
export function readOfficeDOM(format: 'docx' | 'pptx' = 'docx'): OfficeDocument {
  const media = new Map<Element, string>();
  const listIds = new Map<Element, string>();
  const hidden = (el: Element): boolean => {
    const css = getComputedStyle(el);
    return css.display === 'none' || css.visibility === 'hidden' || css.opacity === '0' || el.hasAttribute('hidden');
  };
  const color = (value: string): string | undefined => {
    const rgba = value.match(/[\d.]+/g)?.map(Number);
    if (!rgba || rgba.length < 3 || rgba[3] === 0) return undefined;
    return rgba.slice(0, 3).map((part) => Math.round(part).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const style = (el: Element): TextStyle => {
    const css = getComputedStyle(el);
    const size = parseFloat(css.fontSize);
    return {
      font: css.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: size * 0.75,
      bold: Number(css.fontWeight) >= 600 || css.fontWeight === 'bold', italic: css.fontStyle === 'italic',
      underline: css.textDecorationLine.includes('underline'), strike: css.textDecorationLine.includes('line-through'),
      color: color(css.color) ?? '000000', fill: color(css.backgroundColor),
      align: ['center', 'right', 'justify'].includes(css.textAlign) ? css.textAlign as TextStyle['align'] : 'left',
      lineHeight: css.lineHeight === 'normal' ? size * 1.2 : parseFloat(css.lineHeight),
      before: parseFloat(css.marginTop), after: parseFloat(css.marginBottom),
      border: color(css.borderTopColor), borderWidth: parseFloat(css.borderTopWidth),
      padding: { top: parseFloat(css.paddingTop), right: parseFloat(css.paddingRight), bottom: parseFloat(css.paddingBottom), left: parseFloat(css.paddingLeft) },
      borders: Object.fromEntries(['top', 'right', 'bottom', 'left'].map((side) => [side, {
        color: color(css.getPropertyValue(`border-${side}-color`)), width: parseFloat(css.getPropertyValue(`border-${side}-width`)), style: css.getPropertyValue(`border-${side}-style`),
      }])) as Record<keyof Insets, Border>,
      verticalAlign: css.verticalAlign === 'middle' || css.alignItems === 'center' ? 'center' : css.verticalAlign === 'bottom' || css.alignItems === 'flex-end' ? 'bottom' : 'top',
      wordWrap: css.wordBreak === 'break-all' || ['anywhere', 'break-word'].includes(css.overflowWrap),
    };
  };
  const box = (el: Element, origin: DOMRect): Box => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height };
  };
  const source = (el: Element): string => el.id ? `${el.tagName.toLowerCase()}#${el.id}` : el.tagName.toLowerCase();
  const paragraph = (el: Element, nodes: Node[], origin: DOMRect): Paragraph => {
    const runs: Run[] = [];
    const lines: Array<Line & { top: number }> = [];
    let pendingAnchors: string[] = [];
    const visit = (node: Node): void => {
      if (node instanceof Element && hidden(node)) return;
      if (node instanceof Element && node.matches('input,button,select,textarea,video,audio,iframe,object,embed')) throw new Error(`Unsupported Office content: ${source(node)}`);
      if (format === 'docx' && node instanceof Element && node.id) runs.push({ text: '', style: style(node), anchors: [node.id] });
      if (format === 'pptx' && node instanceof Element && node.id) pendingAnchors.push(node.id);
      if (node instanceof HTMLBRElement) {
        runs.push({ text: '\n', style: style(node) });
        return;
      }
      if (node.nodeType !== Node.TEXT_NODE) { node.childNodes.forEach(visit); return; }
      const parent = node.parentElement!;
      const css = getComputedStyle(parent);
      const preserve = css.whiteSpace.startsWith('pre');
      const text = node.textContent ?? '';
      const runStyle = style(parent);
      const href = parent.closest('a')?.getAttribute('href') ?? undefined;
      const pageTarget = format === 'pptx' ? parent.closest('[data-facet-toc-target]')?.getAttribute('data-facet-toc-target') : undefined;
      for (const match of text.matchAll(/\S+|[^\S\n]+|\n/g)) {
        const range = document.createRange();
        range.setStart(node, match.index!);
        range.setEnd(node, match.index! + match[0].length);
        const rect = range.getBoundingClientRect();
        const value = preserve ? match[0] : match[0].replace(/\s+/g, ' ');
        const run: Run = { text: value, style: runStyle, href, ...(pageTarget ? { pageTarget } : {}), ...(pendingAnchors.length ? { anchors: pendingAnchors } : {}) };
        pendingAnchors = [];
        runs.push(run);
        if (preserve && value === '\n') continue;
        if (!rect.height) continue;
        let line = lines[lines.length - 1];
        if (!line || Math.abs(line.top - rect.top) > Math.max(3, runStyle.lineHeight / 2)) {
          line = { runs: [], height: runStyle.lineHeight, top: rect.top };
          lines.push(line);
        }
        line.height = Math.max(line.height, runStyle.lineHeight);
        line.runs.push(run);
      }
    };
    nodes.forEach(visit);
    if (pendingAnchors.length && lines.length) lines[lines.length - 1].runs.push({ text: '', style: style(el), anchors: pendingAnchors });
    if (runs.length) { runs[0].text = runs[0].text.trimStart(); runs[runs.length - 1].text = runs[runs.length - 1].text.trimEnd(); }
    const result: Paragraph = {
      kind: 'paragraph', runs, lines: lines.map(({ runs: lineRuns, height }) => ({ runs: lineRuns.map((run) => ({ ...run })), height })),
      box: box(el, origin), style: style(el), source: source(el),
      heading: /^H[1-6]$/.test(el.tagName) ? Number(el.tagName[1]) : undefined,
      ...(pendingAnchors.length && !lines.length ? { anchors: pendingAnchors } : {}),
    };
    const item = el.tagName === 'LI' ? el : el.parentElement?.tagName === 'LI' && el.parentElement.firstElementChild === el ? el.parentElement : undefined;
    if (item) {
      const list = item.parentElement!;
      if (!listIds.has(list)) listIds.set(list, `list-${listIds.size}`);
      let level = 0;
      for (let ancestor = list.parentElement?.closest('ul,ol'); ancestor; ancestor = ancestor.parentElement?.closest('ul,ol')) level++;
      const start = Number(list.getAttribute('start') ?? 1);
      result.list = { ordered: list.tagName === 'OL', level, start, ordinal: start + Array.from(list.children).filter((child) => child.tagName === 'LI').indexOf(item), id: listIds.get(list)! };
    }
    return result;
  };
  const readElement = (el: Element, origin: DOMRect, chromeRoot = false): Block[] => {
    if (hidden(el) || /^(SCRIPT|STYLE|META|LINK|NOSCRIPT)$/.test(el.tagName)) return [];
    if (!chromeRoot && el.matches('[data-header-type],[data-footer-type]')) return [];
    if (el.hasAttribute('data-page-size') || el.matches('ul,ol')) return children(el, origin);
    if (format === 'docx' && el.tagName === 'MAIN' && el.parentElement?.hasAttribute('data-page-size')) return children(el, origin);
    if (el.matches('input,button,select,textarea,video,audio,iframe,object,embed')) throw new Error(`Unsupported Office content: ${source(el)}`);
    if (el.classList.contains('page-break')) return [{ kind: 'break' }];
    const pdf = format === 'docx' && el.matches('figure,[data-facet-ready],[data-facet-diagram],[data-facet-flow-diagram]');
    if (pdf || el.matches('svg,canvas,img,[data-facet-ready]')) {
      if (el instanceof HTMLImageElement && (!el.complete || !el.naturalWidth)) throw new Error(`Office image failed to load: ${el.getAttribute('src')}`);
      const mediaId = media.get(el) ?? `office-media-${media.size}`;
      media.set(el, mediaId);
      el.setAttribute('data-facet-office-media', mediaId);
      const figure = el.closest('figure');
      const caption = figure?.querySelector('figcaption strong,figcaption b') ?? figure?.querySelector('figcaption');
      return [{ kind: 'image', format: pdf ? 'pdf' : 'png', mediaId, alt: el.getAttribute('alt') ?? el.getAttribute('aria-label') ?? caption?.textContent?.replace(/\s+/g, ' ').trim() ?? '', box: box(el, origin), style: style(el), source: source(el) }];
    }
    if (el instanceof HTMLTableElement) {
      const rows = Array.from(el.rows).map((row) => ({
        header: row.parentElement?.tagName === 'THEAD', height: row.getBoundingClientRect().height,
        cells: Array.from(row.cells).map((cell): Cell => ({
          blocks: anchored(cell, children(cell, origin), origin), colSpan: cell.colSpan,
          rowSpan: Math.min(cell.rowSpan || row.parentElement!.children.length - row.sectionRowIndex, row.parentElement!.children.length - row.sectionRowIndex),
          box: box(cell, origin), style: style(cell),
        })),
      }));
      const occupied: number[] = [];
      const boundaries: number[] = [];
      rows.forEach((row, rowIndex) => {
        let column = 0;
        for (const cell of row.cells) {
          while ((occupied[column] ?? 0) > rowIndex) column++;
          boundaries[column] = cell.box.x;
          boundaries[column + cell.colSpan] = cell.box.x + cell.box.width;
          for (let offset = 0; offset < cell.colSpan; offset++) occupied[column + offset] = rowIndex + cell.rowSpan;
          column += cell.colSpan;
        }
      });
      let start = 0;
      for (let end = 1; end < boundaries.length; end++) {
        if (boundaries[end] === undefined) continue;
        for (let column = start + 1; column < end; column++) boundaries[column] = boundaries[start] + (boundaries[end] - boundaries[start]) * (column - start) / (end - start);
        start = end;
      }
      const columns = boundaries.slice(1).map((edge, index) => edge - boundaries[index]);
      if (!columns.length) throw new Error(`Empty Office table: ${source(el)}`);
      return [{ kind: 'table', rows, columns, layout: getComputedStyle(el).tableLayout === 'fixed' ? 'fixed' : 'auto', box: box(el, origin), style: style(el), source: source(el) }];
    }
    if (format === 'docx' && el.matches('[data-table-of-contents]')) {
      const heading = el.querySelector('h1,h2,h3,h4,h5,h6');
      const entries = Array.from(el.querySelectorAll('[data-toc-level]')).map((item) => {
        const entry = item.firstElementChild;
        const label = entry?.firstElementChild;
        if (!entry || !label) throw new Error('Invalid Office TOC entry');
        const target = item.querySelector('[data-facet-toc-target]')?.getAttribute('data-facet-toc-target');
        const level = Number(item.getAttribute('data-toc-level'));
        if (![1, 2, 3].includes(level)) throw new Error(`Invalid Office TOC level: ${level}`);
        return { title: label.textContent ?? '', target: target ?? undefined,
          page: target === undefined || target === null ? entry.lastElementChild?.textContent ?? '' : undefined, level, style: style(label) };
      });
      return [{ kind: 'group', blocks: [], box: box(el, origin), style: style(el), source: source(el),
        toc: { title: heading ? { ...paragraph(heading, Array.from(heading.childNodes), origin), heading: undefined } : undefined, entries } }];
    }
    if (el.matches('p,h1,h2,h3,h4,h5,h6,pre,blockquote,dt,dd') && !el.querySelector('img,svg,canvas,[data-facet-ready]')) return [paragraph(el, Array.from(el.childNodes), origin)];
    const display = getComputedStyle(el).display;
    const columns = display.includes('grid') || (display.includes('flex') && !getComputedStyle(el).flexDirection.startsWith('column'));
    const blocks = children(el, origin, format === 'docx' && columns);
    const containerStyle = style(el);
    const decorated = containerStyle.fill || Object.values(containerStyle.padding!).some(Boolean) || Object.values(containerStyle.borders!).some((border) => border.width);
    if ((columns && el.children.length > 1) || chromeRoot || (format === 'docx' && decorated)) {
      return [{ kind: 'group', blocks, box: box(el, origin), style: containerStyle, source: source(el), layout: columns ? 'columns' : 'stack',
        display: display.includes('grid') ? 'grid' : 'flex', justify: getComputedStyle(el).justifyContent,
        gap: getComputedStyle(el).columnGap === 'normal' ? 0 : parseFloat(getComputedStyle(el).columnGap) }];
    }
    return blocks;
  };
  const anchored = (el: Element, blocks: Block[], origin: DOMRect): Block[] => {
    if (!el.id || hidden(el)) return blocks;
    if (!blocks.length && !el.matches('[data-header-type],[data-footer-type],script,style,meta,link,noscript')) blocks.push(paragraph(el, [], origin));
    const first = blocks.find((block) => block.kind !== 'break');
    if (first) first.anchors = [el.id, ...(first.anchors ?? [])];
    return blocks;
  };
  const read = (el: Element, origin: DOMRect, chromeRoot = false): Block[] => anchored(el, readElement(el, origin, chromeRoot), origin);
  const children = (el: Element, origin: DOMRect, columns = false): Block[] => {
    const blocks: Block[] = [];
    let inline: Node[] = [];
    const flush = (): void => {
      if (inline.some((node) => node.textContent?.trim() || (node instanceof Element && (node.id || node.querySelector('[id]'))))) blocks.push(paragraph(el, inline, origin));
      inline = [];
    };
    for (const node of Array.from(el.childNodes)) {
      if (node instanceof Element) {
        const display = getComputedStyle(node).display;
        if (node.matches('figure,img,svg,canvas,input,button,select,textarea,video,audio,iframe,object,embed,.page-break,[data-facet-ready],[data-facet-diagram],[data-facet-flow-diagram]') || node.querySelector('img,svg,canvas,input,button,select,textarea,video,audio,iframe,object,embed') || !display.startsWith('inline')) {
          flush();
          const nested = read(node, origin);
          const column: Group = { kind: 'group', layout: 'stack', blocks: nested, box: box(node, origin), style: style(node), source: source(node) };
          blocks.push(...(columns && nested.length > 1 ? [column] : nested));
          continue;
        }
      }
      inline.push(node);
    }
    flush();
    return blocks;
  };
  const chrome = (kind: string, type: string): Chrome | undefined => {
    const el = document.querySelector(`[data-${kind}-type="${type}"]`) ?? document.querySelector(`[data-${kind}-type="default"]`);
    if (!el) return undefined;
    const declared = el.getAttribute(`data-${kind}-height`);
    const height = declared === null ? el.getBoundingClientRect().height : Number(declared) * 96 / 25.4;
    if (!Number.isFinite(height) || height < 0) throw new Error(`Invalid Office ${kind} height: ${declared}`);
    return { blocks: format === 'docx' || height === 0 ? [] : read(el, el.getBoundingClientRect(), true), height,
      selector: `[data-${kind}-type="${el.getAttribute(`data-${kind}-type`)}"]` };
  };
  const roots = Array.from(document.querySelectorAll('[data-page-size]'));
  if (!roots.length) roots.push(document.body);
  const pages = roots.map((root) => {
    const type = root.getAttribute('data-page-type') ?? 'default';
    const margin = (side: string): number => {
      const value = Number(root.getAttribute(`data-margin-${side}`) ?? 0);
      if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid Office ${side} margin: ${value}`);
      return value;
    };
    return {
      size: root.getAttribute('data-page-size') ?? 'a4',
      blocks: read(root, root.getBoundingClientRect()), width: root.getBoundingClientRect().width, height: root.getBoundingClientRect().height,
      margins: { top: margin('top'), right: margin('right'), bottom: margin('bottom'), left: margin('left') },
      header: chrome('header', type), footer: chrome('footer', type),
    };
  });
  return { title: document.title, pages };
}
