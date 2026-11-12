import { combineHTMLAndCSS } from '../bundler/renderer.js';

export function injectCustomCss(html: string, css?: string): string {
  return css === undefined ? html : combineHTMLAndCSS(html, css.replaceAll('<', '\\3c '));
}
