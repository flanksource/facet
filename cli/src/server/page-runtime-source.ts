import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { posix, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { unified, type Plugin } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkStringify from 'remark-stringify';
import type { OpenMessage } from '@flanksource/page-runtime/schema';
import { assetPath } from '../utils/assets.js';
import { fontScaleCss } from '../utils/font-size.js';
import { pdfSnapshotLayout } from '../utils/page-size-layout.js';
import type { BrowserLayout } from '../utils/render-layout.js';
import type { RedactPolicy } from '../builders/remark-config.js';
import { discoverThemes } from '../builders/themes.js';
import type { BrowserOrigin } from '../runtime/browser-origin.js';
import { browserTemplateLayout } from '../runtime/browser-template-layout.js';
import type { ParsedRenderRequest } from './request.js';
import type { ResolvedSource } from './render-pipeline.js';
import { RenderError } from './errors.js';

export async function redactMarkdownSource(source: string, policy: RedactPolicy = { allow: {} }): Promise<string> {
  if (!/<\/?Classified(?:\s|>)/.test(source)) return source;
  const { default: redact } = await import(pathToFileURL(assetPath('facet-redact.mjs')).href) as { default: Plugin<[RedactPolicy]> };
  return String(await unified().use(remarkParse).use(remarkMdx).use(remarkFrontmatter).use(redact, policy).use(remarkStringify).process(source));
}

interface BrowserTemplate {
  fingerprint: string;
  page: string;
  layout: string;
  dependencies: Record<string, string>;
  files: Map<string, Buffer>;
  viewport: BrowserLayout['viewport'];
}

const SOURCE_EXTENSIONS = /\.(?:tsx?|jsx?|mjs|mdx?|css|json|txt|svg|png|jpe?g|gif|apng|webp|avif|ico|woff2?|ttf|otf)$/i;

async function workspaceFiles(options: { root: string; maxBytes: number; redact?: RedactPolicy; signal: AbortSignal }): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  let size = 0;
  async function collect(directory: string): Promise<void> {
    options.signal.throwIfAborted();
    const entries = await readdir(join(options.root, directory), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const path = posix.join(directory, entry.name);
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile() && SOURCE_EXTENSIONS.test(path)) {
        let bytes = await readFile(join(options.root, path), { signal: options.signal });
        size += bytes.length;
        if (size > options.maxBytes) throw new RenderError('INVALID_REQUEST', 'Browser template exceeds the configured source size limit', 400);
        if (/\.mdx?$/i.test(path)) bytes = Buffer.from(await redactMarkdownSource(bytes.toString('utf8'), options.redact));
        files.set(path, bytes);
      }
    }
  }
  await collect('');
  return files;
}

function templateDependencies(files: Map<string, Buffer>, entry: string): Record<string, string> {
  const dependencies: Record<string, string> = Object.create(null);
  const lineage = posix.dirname(entry).split('/').filter(part => part !== '.');
  for (let depth = 0; depth <= lineage.length; depth++) {
    const manifest = files.get(posix.join(...lineage.slice(0, depth), 'package.json'));
    if (!manifest) continue;
    const { dependencies: declared, optionalDependencies, overrides, resolutions, pnpm } = JSON.parse(manifest.toString('utf8'));
    if (overrides || resolutions || pnpm?.overrides) throw new RenderError('INVALID_REQUEST', 'Browser templates use the pinned runtime and do not accept package overrides', 400);
    Object.assign(dependencies, declared, optionalDependencies);
  }
  return dependencies;
}

export async function readBrowserTemplate(options: { source: ResolvedSource; parsed: ParsedRenderRequest; skipModules: boolean; maxBytes: number; signal: AbortSignal }): Promise<BrowserTemplate> {
  const { source, parsed } = options;
  const page = source.entryFile.split('\\').join('/');
  const files = await workspaceFiles({ root: source.consumerRoot, maxBytes: options.maxBytes, redact: parsed.redact, signal: options.signal });
  if (!files.has(page) || !/\.(?:tsx?|jsx?|mjs|mdx?)$/i.test(page)) throw new RenderError('INVALID_REQUEST', `Unsupported browser template entry ${page}`, 400);
  const dependencies = options.skipModules ? {} : { ...templateDependencies(files, page), ...parsed.dependencies };
  for (const [name, range] of Object.entries(dependencies)) {
    if (typeof range !== 'string' || !range || /[:/]/.test(range)) throw new RenderError('INVALID_REQUEST', `Unsupported browser dependency ${name}@${String(range)}`, 400);
  }
  const theme = parsed.workspaceTheme ?? (parsed.theme && parsed.theme !== 'facet' ? discoverThemes(process.cwd()).find(theme => theme.id === parsed.theme) : undefined);
  if (parsed.theme && parsed.theme !== 'facet' && !theme) throw new RenderError('INVALID_REQUEST', `Unknown theme ${parsed.theme}`, 400);
  if (parsed.workspaceTheme) dependencies[parsed.workspaceTheme.package] = parsed.workspaceTheme.version;
  const layout = '.facet-render-layout.tsx';
  const pageLayout = pdfSnapshotLayout({ override: parsed.pageSizeOverride, defaultSize: parsed.pdfOptions?.defaultPageSize, landscape: parsed.pdfOptions?.landscape });
  files.set(layout, Buffer.from(browserTemplateLayout({
    page, themeModule: theme?.module ?? '@flanksource/facet/Theme', redact: parsed.redact,
    header: !!parsed.headerCode, footer: !!parsed.footerCode, stylesheet: './.facet-render.css', dynamicStyles: parsed.postProcessCss !== false,
    pageLayout: { ...pageLayout, css: '' },
  })));
  files.set('.facet-render.css', Buffer.from([pageLayout.css, parsed.fontSize == null ? undefined : fontScaleCss(parsed.fontSize), parsed.css].filter(Boolean).join('\n')));
  if (parsed.headerCode) files.set('.facet-render-header.tsx', Buffer.from(parsed.headerCode));
  if (parsed.footerCode) files.set('.facet-render-footer.tsx', Buffer.from(parsed.footerCode));
  const hash = createHash('sha256').update(JSON.stringify({ page, dependencies, themeBuild: parsed.workspaceTheme?.build }));
  for (const path of [...files.keys()].sort()) hash.update(JSON.stringify([path, files.get(path)!.length])).update(files.get(path)!);
  return { fingerprint: hash.digest('hex'), page, layout, dependencies, files, viewport: pageLayout.viewport };
}

export function publishRenderSource(origin: BrowserOrigin, source: BrowserTemplate): { open: OpenMessage; dispose: () => void } {
  const resource = origin.mountSources(source.files);
  const prefix = `${source.fingerprint}/`;
  const page = prefix + source.page;
  const layout = prefix + source.layout;
  const files = {
    [page]: source.files.get(source.page)!.toString('utf8'),
    [layout]: source.files.get(source.layout)!.toString('utf8'),
  };
  return {
    open: { page, layout, manifest: { dependencies: source.dependencies }, files, sourceProvider: { url: resource.url, paths: [...source.files.keys()] } },
    dispose: resource.dispose,
  };
}
