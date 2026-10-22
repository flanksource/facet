export interface BrowserLayout {
  viewport: { width: number; height: number };
  css: string;
  sizeAttribute?: string;
  pageSizeOverride?: string;
}

// Serialized into the rendering browser before a live template mounts.
export function applyBrowserLayout(layout: BrowserLayout): void {
  const apply = (): void => {
    if (document.head && !document.querySelector('style[data-facet-render-layout]')) {
      const style = document.createElement('style');
      style.setAttribute('data-facet-render-layout', '');
      style.textContent = layout.css;
      document.head.appendChild(style);
    }
    if (!layout.sizeAttribute) return;
    document.querySelectorAll<HTMLElement>(`[${layout.sizeAttribute}]`).forEach((element) => {
      if (layout.pageSizeOverride && element.getAttribute(layout.sizeAttribute!) !== layout.pageSizeOverride) {
        element.setAttribute(layout.sizeAttribute!, layout.pageSizeOverride);
      }
      const size = element.getAttribute(layout.sizeAttribute!)?.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
      if (size && element.style.width !== `${size[1]}mm`) element.style.setProperty('width', `${size[1]}mm`, 'important');
    });
  };
  apply();
  new MutationObserver(apply).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: layout.sizeAttribute ? [layout.sizeAttribute] : [] });
}
