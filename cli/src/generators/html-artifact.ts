import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { browserRuntimeAssets } from '../server/playground-form-generated.js';
import { VERSION } from '../version-generated.js';
import { scopeCSS } from '../utils/css-scoper.js';
import type { DocumentSource } from '@flanksource/page-runtime/schema';

function runtimeAsset(file: 'document.js' | 'document-bundle.js'): Buffer {
  const asset = browserRuntimeAssets[file];
  if (!asset) throw new Error(`Facet HTML runtime ${file} is missing. Build the page runtime and regenerate Facet assets.`);
  return gunzipSync(Buffer.from(asset, 'base64'));
}

export function documentRuntime(): { bytes: Buffer; path: string } {
  const bytes = runtimeAsset('document.js');
  return { bytes, path: `/runtime-assets/${createHash('sha256').update(bytes).digest('hex')}/page-runtime.js` };
}

export function bundledDocumentRuntime(): string {
  return runtimeAsset('document-bundle.js').toString('utf8');
}

export function documentRuntimeUrl(runtimeOrigin?: string): string {
  if (runtimeOrigin === undefined) return `https://unpkg.com/@flanksource/facet@${VERSION}/dist/page-runtime.js`;
  return new URL(documentRuntime().path, parseDocumentRuntimeOrigin(runtimeOrigin)).href;
}

export function parseDocumentRuntimeOrigin(value: string): URL {
  const origin = URL.parse(value);
  if (!origin || !/^https?:\/\//i.test(value) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error('The HTML runtime origin must be an HTTP or HTTPS origin');
  }
  return origin;
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function embeddedJSON(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

type ArtifactOptions = {
  outputName: string; data: Record<string, unknown>; css: string;
  cssScope?: string; showSlideNotes?: boolean;
} & ({ source: DocumentSource; runtimeUrl: string; runtimeScript?: never; program?: never }
  | { source?: never; program: string; runtimeScript: string; runtimeUrl?: never });

export function liveHTMLArtifact(options: ArtifactOptions): { html: string; script?: string } {
  const { program, data, outputName, runtimeUrl, runtimeScript, cssScope } = options;
  const sidecar = './' + encodeURIComponent(basename(outputName) + '.js');
  const css = cssScope ? scopeCSS(options.css, { scopeClass: cssScope }) : options.css;
  const style = css.replace(/<\/style/gi, '\\3c /style');
  const notes = options.showSlideNotes ? ' data-facet-notes="show"' : '';
  const scope = cssScope ? ` class="${escapeAttribute(cssScope)}"` : '';
  const html = `<!doctype html>
<html lang="en"${notes}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeAttribute(outputName)}</title>
<style>${style}</style>
<script defer src="${escapeAttribute(runtimeUrl ?? sidecar)}"></script>
</head>
<body>
<div id="facet-root"${scope}></div>
<p id="facet-document-status" role="status">Loading document…</p>
<noscript>This document requires JavaScript.</noscript>
<script id="facet-document-data" type="application/json">${embeddedJSON(data)}</script>
${options.source ? `<script id="facet-document-source" type="application/json">${embeddedJSON(options.source)}</script>` : ''}
</body>
</html>`;
  return runtimeScript === undefined ? { html } : { html, script: `${runtimeScript}\n;${program}\n` };
}
