import type { Page } from 'puppeteer-core';
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib';

const INTERNAL_LINK_PREFIX = 'https://facet.invalid/internal-link/';

export async function prepareInternalLinks(page: Page): Promise<string[]> {
  return page.evaluate((prefix) => {
    const targets = new Set<string>();
    for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-page-size] a[href^="#"]'))) {
      const href = link.getAttribute('href')!;
      if (href === '#') continue;
      const id = decodeURIComponent(href.slice(1));
      const matches = Array.from(document.querySelectorAll('[id]')).filter(element => element.id === id);
      if (matches.length !== 1) throw new Error(`Internal PDF link target "${id}" matches ${matches.length} elements`);
      const owner = matches[0].closest('[data-page-size]');
      if (!owner) throw new Error(`Internal PDF link target "${id}" is outside a Page`);
      if (!targets.has(id)) {
        // Chromium only emits destinations referenced within the same printed group.
        const probe = document.createElement('a');
        probe.href = `#${encodeURIComponent(id)}`;
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;font-size:1px;line-height:1px;color:rgba(0,0,0,.01);pointer-events:none';
        owner.append(probe);
        targets.add(id);
      }
      link.href = `${prefix}${encodeURIComponent(id)}`;
    }
    return [...targets];
  }, INTERNAL_LINK_PREFIX);
}

export async function restoreInternalLinks(buffer: Uint8Array, targets: string[]): Promise<Uint8Array> {
  if (targets.length === 0) return buffer;
  const pdf = await PDFDocument.load(buffer);
  const destinations = pdf.catalog.lookup(PDFName.of('Dests'));
  if (!(destinations instanceof PDFDict)) throw new Error('Printed PDF has no internal link destinations');
  const names = new Map(targets.map(id => [encodeURIComponent(id), PDFName.of(encodeURIComponent(id))]));
  for (const [id, name] of names) {
    if (!(destinations.lookup(name) instanceof PDFArray)) throw new Error(`Missing printed PDF destination "${id}"`);
  }
  for (const page of pdf.getPages()) {
    const annotations = page.node.lookup(PDFName.of('Annots'));
    if (!(annotations instanceof PDFArray)) continue;
    for (const reference of annotations.asArray()) {
      const annotation = pdf.context.lookup(reference);
      if (!(annotation instanceof PDFDict)) continue;
      const action = annotation.lookup(PDFName.of('A'));
      if (!(action instanceof PDFDict) || action.get(PDFName.of('S')) !== PDFName.of('URI')) continue;
      const uri = action.lookup(PDFName.of('URI'));
      if (!(uri instanceof PDFString || uri instanceof PDFHexString)) continue;
      const address = uri.decodeText();
      if (!address.startsWith(INTERNAL_LINK_PREFIX)) continue;
      const name = names.get(address.slice(INTERNAL_LINK_PREFIX.length));
      if (!name) throw new Error(`Unknown internal PDF link ${address}`);
      annotation.set(PDFName.of('A'), pdf.context.obj({ S: PDFName.of('GoTo'), D: name }));
    }
  }
  return pdf.save();
}
