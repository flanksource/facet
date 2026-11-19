export interface BrowserLayout {
  viewport: { width: number; height: number };
  css: string;
  sizeAttribute?: string;
  pageSizeOverride?: string;
  landscapeSizes?: Readonly<Record<string, string>>;
}

// Serialized into the rendering browser before a live template mounts.
export function applyBrowserLayout(layout: BrowserLayout): () => void {
  const { sizeAttribute, pageSizeOverride, landscapeSizes } = layout;
  let insertedStyle: HTMLStyleElement | undefined;
  const dimensions = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/;
  const apply = (): void => {
    if (layout.css && document.head && !document.querySelector('style[data-facet-render-layout]')) {
      const style = document.createElement('style');
      style.setAttribute('data-facet-render-layout', '');
      style.textContent = layout.css;
      document.head.appendChild(style);
      insertedStyle = style;
    }
    if (!sizeAttribute) return;
    document.querySelectorAll<HTMLElement>(`[${sizeAttribute}]`).forEach((element) => {
      const declared = element.getAttribute(sizeAttribute) ?? '';
      let size = pageSizeOverride ?? declared;
      if (landscapeSizes) {
        const custom = declared.match(dimensions);
        if (Object.hasOwn(landscapeSizes, declared.toLowerCase())) size = landscapeSizes[declared.toLowerCase()];
        else if (custom && Number(custom[1]) < Number(custom[2])) size = `${custom[2]}x${custom[1]}`;
      }
      if (size !== declared) element.setAttribute(sizeAttribute, size);
      const custom = size.match(dimensions);
      if (!custom) return;
      if (element.style.width !== `${custom[1]}mm`) element.style.setProperty('width', `${custom[1]}mm`, 'important');
      if (landscapeSizes && element.dataset.facetCanvas === 'true' && element.style.height !== `${custom[2]}mm`) {
        element.style.setProperty('height', `${custom[2]}mm`, 'important');
      }
    });
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: sizeAttribute ? [sizeAttribute] : [] });
  return () => {
    observer.disconnect();
    insertedStyle?.remove();
  };
}
