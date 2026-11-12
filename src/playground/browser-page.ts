export function browserPageFiles(options: { code: string; ext: string; header: string; footer: string; css: string; themeModule?: string }): { page: string; files: Record<string, string> } {
  if (!['tsx', 'mdx', 'md'].includes(options.ext)) throw new Error(`Unsupported browser template extension: ${options.ext}`);
  const page = `report.${options.ext}`;
  return { page, files: {
    [page]: options.code,
    'header.tsx': options.header || 'export default function Header() { return null; }',
    'footer.tsx': options.footer || 'export default function Footer() { return null; }',
    'custom.css': options.css,
    'layout.tsx': `import React, { useLayoutEffect, useRef } from 'react';
import { ThemeProvider, Document, Page } from '@flanksource/facet';
import * as themeModule from ${JSON.stringify(options.themeModule ?? '@flanksource/facet/Theme')};
import Header from './header.tsx';
import Footer from './footer.tsx';
import './report.css';
import './custom.css';
export const meta = { tailwind: 'dynamic' };
export default function Layout({ children, data }) {
  const root = useRef(null);
  useLayoutEffect(() => {
    const style = document.createElement('style');
    const size = () => { const page = root.current; if (page) style.textContent = '@page { size: ' + Math.max(1, Math.ceil(page.scrollWidth)) + 'px ' + Math.max(1, Math.ceil(page.scrollHeight)) + 'px; margin: 0; }'; };
    document.head.append(style); size();
    const observer = new ResizeObserver(size); observer.observe(root.current);
    window.addEventListener('beforeprint', size);
    return () => { observer.disconnect(); style.remove(); window.removeEventListener('beforeprint', size); };
  }, []);
  const props = ${options.ext === 'tsx' ? '{ data }' : "data && typeof data === 'object' && !Array.isArray(data) ? { ...Object.fromEntries(Object.entries(data).filter(([name]) => !['key', 'ref', 'children'].includes(name))), data } : { data }"};
  return <ThemeProvider theme={themeModule.theme ?? themeModule.facetTheme} options={data?.theme} overrides={${JSON.stringify({ header: !!options.header, footer: !!options.footer })}}><div ref={root} id="facet-browser-page"><Header {...props} /><div className={${JSON.stringify(options.ext === 'tsx' ? '' : 'prose max-w-none p-8')}}>{${options.ext === 'tsx' ? 'React.cloneElement(children, props)' : '<Document title={data?.title}><Page>{React.cloneElement(children, props)}</Page></Document>'}}</div><Footer {...props} /></div></ThemeProvider>;
}`,
    'report.css': `html, body { margin: 0; padding: 0; background: white; }
#facet-browser-page { display: flow-root; width: 100%; }
@media print {
  html, body, #root, #facet-browser-page { height: auto !important; min-height: 0 !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
  #facet-browser-page [data-page-size] { display: block !important; height: auto !important; min-height: 0 !important; }
  #facet-browser-page * { break-before: auto !important; break-after: auto !important; break-inside: auto !important; page-break-before: auto !important; page-break-after: auto !important; page-break-inside: auto !important; }
}`,
  } };
}
