import { createHash } from 'node:crypto';
import { lstatSync, rmSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

import { combineHTMLAndCSS } from '../bundler/renderer.js';
import { snapshotHTML } from '../bundler/live-snapshot.js';
import { buildTemplate } from '../bundler/vite-builder.js';
import { startViteServer } from '../bundler/vite-server.js';
import { Logger } from '../utils/logger.js';
import { shouldPostProcessTemplateCSS, shouldUseLiveRendering } from '../utils/live-template.js';
import { RenderTimings } from '../utils/performance.js';
import { parseRemoteRef, resolveRemoteRef } from '../utils/remote-resolver.js';
import { runTailwindCached } from '../utils/tailwind.js';
import type { ServerConfig } from './config.js';
import { extractArchive } from './archive.js';
import { RenderError } from './errors.js';
import type { ParsedRenderRequest } from './request.js';
import type { RenderProgress } from './render-stream.js';
import type { S3Uploader } from './s3.js';
import { acquireTemplateWorkspace } from './template-workspaces.js';
import { resolveLocalTemplate, type TemplateInfo } from './templates.js';

export interface ResolvedSource {
  consumerRoot: string;
  entryFile: string;
  templateName: string;
  tempDir?: string;
  archiveCleanup?: () => void;
}

export async function resolveTemplateSource(
  parsed: ParsedRenderRequest,
  templates: TemplateInfo[],
  config: ServerConfig,
): Promise<ResolvedSource> {
  const { source } = parsed;

  if (source.kind === 'inline') {
    const entryFile = `Template.${source.ext ?? 'tsx'}`;
    const tempDir = await mkdtemp(join(tmpdir(), 'facet-inline-'));
    await writeFile(join(tempDir, entryFile), source.code, 'utf-8');
    if (parsed.dependencies) {
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({
        name: 'facet-inline',
        dependencies: parsed.dependencies,
      }), 'utf-8');
    }
    return { consumerRoot: tempDir, entryFile, templateName: 'inline', tempDir };
  }

  if (source.kind === 'archive') {
    const extracted = await extractArchive(source.data, source.entryFile, config.maxUploadSize);
    return {
      consumerRoot: extracted.consumerRoot,
      entryFile: extracted.entryFile,
      templateName: 'upload',
      archiveCleanup: extracted.cleanup,
    };
  }

  if (source.kind === 'remote') {
    const ref = parseRemoteRef(source.template);
    if (!ref) throw new RenderError('TEMPLATE_NOT_FOUND', `Cannot parse remote ref: ${source.template}`, 400);

    const resolved = await resolveRemoteRef(ref, { verbose: config.verbose });
    const cacheDir = config.cacheDir ? resolve(config.cacheDir) : resolve(process.cwd(), '.facet');
    const workspace = await acquireTemplateWorkspace(resolved.consumerRoot, resolved.templateFile, cacheDir);
    return {
      consumerRoot: workspace.path,
      entryFile: resolved.templateFile,
      templateName: basename(source.template),
      archiveCleanup: workspace.release,
    };
  }

  const info = resolveLocalTemplate(source.name, templates);
  if (!info) throw new RenderError('TEMPLATE_NOT_FOUND', `Template not found: ${source.name}`, 404);

  const cacheDir = config.cacheDir ? resolve(config.cacheDir) : resolve(process.cwd(), '.facet');
  const workspace = await acquireTemplateWorkspace(info.consumerRoot, info.entryFile, cacheDir);
  return {
    consumerRoot: workspace.path,
    entryFile: info.entryFile,
    templateName: info.name,
    archiveCleanup: workspace.release,
  };
}

export function cleanupTempDir(tempDir: string): void {
  const nodeModules = join(tempDir, '.facet', 'node_modules');
  try {
    if (lstatSync(nodeModules).isSymbolicLink()) rmSync(nodeModules, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  rmSync(tempDir, { recursive: true, force: true });
}

interface RenderHTMLOptions {
  consumerRoot: string;
  entryFile: string;
  data: Record<string, unknown>;
  logger: Logger;
  timings: RenderTimings;
  sandbox?: string | boolean;
  persistentLoader?: boolean;
  live?: boolean;
  postProcessCss?: boolean;
  skipModules?: boolean;
}

export async function renderHTML(options: RenderHTMLOptions): Promise<string> {
  const { consumerRoot, entryFile, data, logger, timings, sandbox, persistentLoader = true } = options;
  if (shouldUseLiveRendering(options.live, join(consumerRoot, entryFile))) {
    const server = await startViteServer({
      templatePath: entryFile,
      data,
      consumerRoot,
      logger,
      timings,
      skipModules: options.skipModules,
    });
    try {
      return await snapshotHTML(server.url, logger);
    } finally {
      await server.close();
    }
  }

  const buildResult = await buildTemplate({
    templatePath: entryFile,
    data,
    consumerRoot,
    logger,
    sandbox,
    persistentLoader,
    timings,
    skipModules: options.skipModules,
  });
  try {
    return await applyTailwind({
      html: buildResult.html,
      ssrCss: buildResult.css,
      facetRoot: buildResult.facetRoot,
      buildCacheKey: buildResult.buildCacheKey,
      logger,
      enabled: shouldPostProcessTemplateCSS(options.postProcessCss, join(consumerRoot, entryFile)),
      timings,
      persistentLoader: persistentLoader && !sandbox,
    });
  } finally {
    await buildResult.cleanup();
  }
}

interface StreamedHTMLOptions extends Omit<RenderHTMLOptions, 'sandbox'> {
  progress: RenderProgress;
}

export async function renderHTMLStreamed(options: StreamedHTMLOptions): Promise<string> {
  const { consumerRoot, entryFile, data, logger, timings, progress, persistentLoader = true } = options;
  if (shouldUseLiveRendering(options.live, join(consumerRoot, entryFile))) {
    progress.emit('building', 'Live rendering in browser...');
    const server = await startViteServer({
      templatePath: entryFile,
      data,
      consumerRoot,
      logger,
      timings,
      skipModules: options.skipModules,
    });
    try {
      return await snapshotHTML(server.url, logger);
    } finally {
      await server.close();
    }
  }

  progress.emit('building', 'Compiling template with Vite SSR...');
  const buildResult = await buildTemplate({
    templatePath: entryFile,
    data,
    consumerRoot,
    logger,
    persistentLoader,
    timings,
    skipModules: options.skipModules,
  });
  try {
    progress.emit('tailwind', 'Processing Tailwind CSS...');
    return await applyTailwind({
      html: buildResult.html,
      ssrCss: buildResult.css,
      facetRoot: buildResult.facetRoot,
      buildCacheKey: buildResult.buildCacheKey,
      logger,
      enabled: shouldPostProcessTemplateCSS(options.postProcessCss, join(consumerRoot, entryFile)),
      timings,
      persistentLoader,
    });
  } finally {
    await buildResult.cleanup();
  }
}

async function pruneFragments(fragmentDir: string, keepPath: string): Promise<void> {
  const configured = Number(process.env['FACET_FRAGMENT_MAX_AGE_MS'] ?? 86_400_000);
  const maxAgeMs = Number.isFinite(configured) && configured >= 60_000 ? configured : 86_400_000;
  const cutoff = Date.now() - maxAgeMs;
  try {
    const entries = await readdir(fragmentDir, { withFileTypes: true });
    await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
      .map(async (entry) => {
        const path = join(fragmentDir, entry.name);
        if (path === keepPath || (await stat(path)).mtimeMs >= cutoff) return;
        await rm(path, { force: true });
      }));
  } catch { /* pruning is best effort under concurrent workspace activity */ }
}

async function buildFragment(options: {
  consumerRoot: string;
  filename: string;
  code: string;
  data: Record<string, unknown>;
  logger: Logger;
  timings: RenderTimings;
  persistentLoader: boolean;
  skipModules?: boolean;
}): Promise<string> {
  const { consumerRoot, filename, code, data, logger, timings, persistentLoader } = options;
  const fragmentDir = join(consumerRoot, '.facet-fragments');
  const contentKey = createHash('sha256').update(code).digest('hex').slice(0, 20);
  const fragmentPath = join('.facet-fragments', `${filename.replace(/\.tsx$/, '')}-${contentKey}.tsx`);
  await mkdir(fragmentDir, { recursive: true });
  const absoluteFragmentPath = join(consumerRoot, fragmentPath);
  await writeFile(absoluteFragmentPath, code, 'utf-8');
  await pruneFragments(fragmentDir, absoluteFragmentPath);
  const result = await buildTemplate({
    templatePath: fragmentPath,
    data,
    consumerRoot,
    logger,
    persistentLoader,
    timings,
    timingPhase: 'header-generation',
    skipModules: options.skipModules,
  });
  try {
    return result.html;
  } finally {
    await result.cleanup();
  }
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : html.replace(/<!DOCTYPE[^>]*>/i, '').trim();
}

function insertBeforeBodyClose(mainHtml: string, fragment: string): string {
  return mainHtml.includes('</body>')
    ? mainHtml.replace('</body>', `${fragment}</body>`)
    : mainHtml + fragment;
}

export async function injectHeaderFooter(options: {
  html: string;
  parsed: ParsedRenderRequest;
  consumerRoot: string;
  logger: Logger;
  timings: RenderTimings;
  progress?: RenderProgress;
  persistentLoader?: boolean;
  skipModules?: boolean;
}): Promise<string> {
  const { parsed, consumerRoot, logger, timings, progress, persistentLoader = true } = options;
  let { html } = options;
  if (parsed.headerCode) {
    progress?.emit('building', 'Building header template...');
    const headerHtml = await buildFragment({
      consumerRoot,
      filename: '_Header.tsx',
      code: parsed.headerCode,
      data: parsed.data,
      logger,
      timings,
      persistentLoader,
      skipModules: options.skipModules,
    });
    html = insertBeforeBodyClose(html, extractBodyContent(headerHtml));
  }
  if (parsed.footerCode) {
    progress?.emit('building', 'Building footer template...');
    const footerHtml = await buildFragment({
      consumerRoot,
      filename: '_Footer.tsx',
      code: parsed.footerCode,
      data: parsed.data,
      logger,
      timings,
      persistentLoader,
      skipModules: options.skipModules,
    });
    html = insertBeforeBodyClose(html, extractBodyContent(footerHtml));
  }
  return html;
}

async function applyTailwind(options: {
  html: string;
  ssrCss: string;
  facetRoot: string;
  buildCacheKey: string;
  logger: Logger;
  enabled: boolean;
  timings: RenderTimings;
  persistentLoader: boolean;
}): Promise<string> {
  const { html, ssrCss, facetRoot, buildCacheKey, logger, enabled, timings, persistentLoader } = options;
  const css = await timings.measure('tailwind', () => runTailwindCached({
    facetRoot,
    html: enabled ? html : '',
    buildCacheKey,
    logger,
    ssrCss,
    persistentLoader,
  }));
  logger.debug(enabled
    ? 'CSS generated from source and rendered class names'
    : 'CSS generated from source; rendered-HTML post-processing disabled');
  return combineHTMLAndCSS(html, css);
}

export async function respondWithOutput(options: {
  content: Buffer | string;
  contentType: string;
  extension: string;
  templateName: string;
  parsed: ParsedRenderRequest;
  s3?: S3Uploader;
  logger: Logger;
}): Promise<Response> {
  const { content, contentType, extension, templateName, parsed, s3, logger } = options;
  if (parsed.output === 's3') {
    if (!s3) throw new RenderError('INVALID_REQUEST', 'S3 not configured', 400);
    const key = parsed.s3Key ?? s3.generateKey(templateName, extension);
    const url = await s3.upload(key, content, contentType);
    const presigned = await s3.presignedUrl(key);
    logger.debug(`Uploaded to S3: ${key}`);
    return Response.json({ url, presignedUrl: presigned, key });
  }

  const filename = parsed.filename ?? `${templateName}.${extension}`;
  return new Response(typeof content === 'string' ? content : new Uint8Array(content), {
    headers: {
      'content-type': contentType,
      'content-disposition': `inline; filename="${filename}"`,
    },
  });
}
