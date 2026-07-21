import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from 'fs/promises';
import { createHash } from 'node:crypto';
import { join, basename, resolve } from 'path';
import { tmpdir } from 'os';
import { createReadStream, rmSync, lstatSync } from 'fs';
import { Readable } from 'node:stream';

import type { ServerConfig } from './config.js';
import type { WorkerPool } from './worker-pool.js';
import type { TemplateInfo } from './templates.js';
import type { S3Uploader } from './s3.js';
import type { ParsedRenderRequest } from './request.js';

import { RenderError, errorResponse } from './errors.js';
import { parseRenderRequest } from './request.js';
import { resolveLocalTemplate } from './templates.js';
import { extractArchive } from './archive.js';
import { parseRemoteRef, resolveRemoteRef } from '../utils/remote-resolver.js';
import { buildTemplate } from '../bundler/vite-builder.js';
import { startViteServer } from '../bundler/vite-server.js';
import { snapshotHTML } from '../bundler/live-snapshot.js';
import { combineHTMLAndCSS } from '../bundler/renderer.js';
import { generatePDFBuffer } from '../utils/pdf-generator.js';
import { applyPDFSecurity } from '../utils/pdf-security.js';
import { Logger } from '../utils/logger.js';
import { isLiveTemplate } from '../utils/live-template.js';
import { runTailwindCached } from '../utils/tailwind.js';
import { RenderProgress } from './render-stream.js';
import { computeCacheKey, RenderCache } from './render-cache.js';
import { acquireTemplateWorkspace } from './template-workspaces.js';

export function handleResultsRoute(id: string, cache: RenderCache): Response {
  const cached = cache.lookup(id);
  if (!cached) return Response.json({ error: { code: 'NOT_FOUND', message: 'Result not found or expired' } }, { status: 404 });
  const ext = cached.contentType === 'application/pdf' ? 'pdf' : 'html';
  const stream = Readable.toWeb(createReadStream(cached.file)) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    headers: {
      'content-type': cached.contentType,
      'content-length': String(cached.size),
      'content-disposition': `inline; filename="render.${ext}"`,
      'cache-control': 'private, max-age=600',
    },
  });
}

export function handleHealthz(pool: WorkerPool): Response {
  const memory = process.memoryUsage();
  return Response.json({
    status: 'ok',
    workers: pool.stats(),
    memory: {
      rssMb: Number((memory.rss / 1024 / 1024).toFixed(1)),
      heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(1)),
      externalMb: Number((memory.external / 1024 / 1024).toFixed(1)),
      arrayBuffersMb: Number((memory.arrayBuffers / 1024 / 1024).toFixed(1)),
    },
  });
}

export function handleTemplates(templates: TemplateInfo[]): Response {
  return Response.json(
    templates.map((t) => ({
      name: t.name,
      entryFile: t.entryFile,
      description: t.description,
      hasSchema: !!t.schema,
    })),
  );
}

export async function handleRender(
  request: Request,
  config: ServerConfig,
  pool: WorkerPool,
  templates: TemplateInfo[],
  cache: RenderCache,
  s3?: S3Uploader,
): Promise<Response> {
  const logger = new Logger(config.verbose);
  let parsed: ParsedRenderRequest;
  try {
    parsed = await parseRenderRequest(request, config.maxUploadSize);
  } catch (err) {
    return errorResponse(err);
  }

  const renderPromise = doRender(parsed, config, pool, templates, cache, s3, logger);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new RenderError('RENDER_TIMEOUT', 'Render timed out', 504)), config.renderTimeout),
  );

  try {
    return await Promise.race([renderPromise, timeoutPromise]);
  } catch (err) {
    return errorResponse(err);
  }
}

export function handleRenderStream(
  request: Request,
  config: ServerConfig,
  pool: WorkerPool,
  templates: TemplateInfo[],
  cache: RenderCache,
  s3?: S3Uploader,
): Response {
  const { progress, stream } = RenderProgress.create();

  (async () => {
    const logger = new Logger(config.verbose);
    let parsed: ParsedRenderRequest;
    try {
      progress.emit('parsing', 'Parsing request...');
      parsed = await parseRenderRequest(request, config.maxUploadSize);
    } catch (err) {
      const msg = err instanceof RenderError ? err.message : String(err);
      progress.emitError(msg);
      progress.close();
      return;
    }

    const cacheKey = cacheKeyForRequest(parsed);
    const cached = cache.get(cacheKey);
    if (cached) {
      progress.emit('done', 'Cache hit');
      const resultUrl = `/results/${cacheKey}`;
      if (cached.contentType === 'text/html') {
        progress.emitResult(cached.contentType, cached.data.toString('utf-8'), resultUrl);
      } else {
        progress.emitResult(cached.contentType, '', resultUrl);
      }
      progress.close();
      return;
    }

    const timeout = setTimeout(() => {
      progress.emitError('Render timed out');
      progress.close();
    }, config.renderTimeout);

    try {
      const result = await doRenderStreamed(parsed, config, pool, templates, s3, logger, progress);
      clearTimeout(timeout);

      if (typeof result === 'string') {
        const buf = Buffer.from(result);
        cache.set(cacheKey, 'text/html', buf);
        progress.emitResult('text/html', result, `/results/${cacheKey}`);
      } else {
        const buf = Buffer.from(result);
        cache.set(cacheKey, 'application/pdf', buf);
        progress.emitResult('application/pdf', '', `/results/${cacheKey}`);
      }
      progress.emit('done', 'Render complete');
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof RenderError ? err.message : err instanceof Error ? err.message : String(err);
      progress.emitError(msg);
    } finally {
      progress.close();
    }
  })();

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'connection': 'keep-alive',
      'access-control-allow-origin': '*',
    },
  });
}

function cacheKeyForRequest(parsed: ParsedRenderRequest): string {
  return computeCacheKey({
    source: parsed.source,
    data: parsed.data,
    dependencies: parsed.dependencies,
    headerCode: parsed.headerCode,
    footerCode: parsed.footerCode,
    format: parsed.format,
    pdfOptions: parsed.pdfOptions,
    encryption: parsed.encryption,
    signature: parsed.signature,
  });
}

async function doRender(
  parsed: ParsedRenderRequest,
  config: ServerConfig,
  pool: WorkerPool,
  templates: TemplateInfo[],
  cache: RenderCache,
  s3: S3Uploader | undefined,
  logger: Logger,
): Promise<Response> {
  const cacheKey = cacheKeyForRequest(parsed);
  const cached = cache.lookup(cacheKey);
  if (cached) {
    if (cached.contentType === 'application/pdf') {
      return Response.json({ url: `/results/${cacheKey}` });
    }
    const stream = Readable.toWeb(createReadStream(cached.file)) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        'content-type': cached.contentType,
        'content-length': String(cached.size),
        'content-disposition': `inline; filename="render.html"`,
      },
    });
  }

  let tempDir: string | undefined;
  let archiveCleanup: (() => void) | undefined;

  try {
    const resolved = await resolveTemplateSource(parsed, templates, config);
    tempDir = resolved.tempDir;
    archiveCleanup = resolved.archiveCleanup;

    let html = await renderHTML(resolved.consumerRoot, resolved.entryFile, parsed.data, logger, config.sandbox, config.persistentSsr);
    const templateName = resolved.templateName;

    html = await injectHeaderFooter(html, parsed, resolved.consumerRoot, logger, undefined, config.persistentSsr);

    if (parsed.format === 'html') {
      cache.set(cacheKey, 'text/html', Buffer.from(html));
      return respondWithOutput(html, 'text/html', 'html', templateName, parsed, s3, logger);
    }

    const worker = await pool.acquire();
    let workerHealthy = true;
    try {
      let pdfBuffer = await generatePDFBuffer(worker.browser, html, parsed.pdfOptions);
      if (parsed.encryption || parsed.signature) {
        pdfBuffer = await applyPDFSecurity(Buffer.from(pdfBuffer), {
          encryption: parsed.encryption,
          signature: parsed.signature,
        }, logger);
      }
      cache.set(cacheKey, 'application/pdf', Buffer.from(pdfBuffer));
      if (parsed.output === 's3') {
        return respondWithOutput(pdfBuffer, 'application/pdf', 'pdf', templateName, parsed, s3, logger);
      }
      return Response.json({ url: `/results/${cacheKey}` });
    } catch (error) {
      workerHealthy = worker.browser.connected;
      throw error;
    } finally {
      await pool.release(worker, workerHealthy);
    }
  } finally {
    archiveCleanup?.();
    if (tempDir) cleanupTempDir(tempDir);
  }
}

async function doRenderStreamed(
  parsed: ParsedRenderRequest,
  config: ServerConfig,
  pool: WorkerPool,
  templates: TemplateInfo[],
  s3: S3Uploader | undefined,
  logger: Logger,
  progress: RenderProgress,
): Promise<string | Buffer> {
  let tempDir: string | undefined;
  let archiveCleanup: (() => void) | undefined;

  try {
    progress.emit('resolving', `Resolving template (${parsed.source.kind})...`);
    const resolved = await resolveTemplateSource(parsed, templates, config);
    tempDir = resolved.tempDir;
    archiveCleanup = resolved.archiveCleanup;

    progress.emit('building', 'Building template with Vite SSR...');
    let html = await renderHTMLStreamed(resolved.consumerRoot, resolved.entryFile, parsed.data, logger, progress, config.persistentSsr);

    html = await injectHeaderFooter(html, parsed, resolved.consumerRoot, logger, progress, config.persistentSsr);

    if (parsed.format === 'html') {
      progress.emit('done', 'HTML render complete');
      return html;
    }

    progress.emit('rendering-pdf', 'Acquiring browser worker...');
    const worker = await pool.acquire();
    let workerHealthy = true;
    try {
      progress.emit('rendering-pdf', 'Generating PDF with Puppeteer...');
      let pdfBuffer = await generatePDFBuffer(worker.browser, html, parsed.pdfOptions);

      if (parsed.encryption || parsed.signature) {
        progress.emit('securing', 'Applying PDF security...');
        pdfBuffer = await applyPDFSecurity(Buffer.from(pdfBuffer), {
          encryption: parsed.encryption,
          signature: parsed.signature,
        }, logger);
      }

      if (parsed.output === 's3' && s3) {
        progress.emit('uploading', 'Uploading to S3...');
      }

      return pdfBuffer;
    } catch (error) {
      workerHealthy = worker.browser.connected;
      throw error;
    } finally {
      await pool.release(worker, workerHealthy);
    }
  } finally {
    archiveCleanup?.();
    if (tempDir) cleanupTempDir(tempDir);
  }
}

interface ResolvedSource {
  consumerRoot: string;
  entryFile: string;
  templateName: string;
  tempDir?: string;
  archiveCleanup?: () => void;
}

async function resolveTemplateSource(
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
    return {
      consumerRoot: tempDir,
      entryFile,
      templateName: 'inline',
      tempDir,
    };
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

  // local
  const info = resolveLocalTemplate(source.name, templates);
  if (!info) {
    throw new RenderError('TEMPLATE_NOT_FOUND', `Template not found: ${source.name}`, 404);
  }

  const cacheDir = config.cacheDir ? resolve(config.cacheDir) : resolve(process.cwd(), '.facet');
  const workspace = await acquireTemplateWorkspace(info.consumerRoot, info.entryFile, cacheDir);
  return {
    consumerRoot: workspace.path,
    entryFile: info.entryFile,
    templateName: info.name,
    archiveCleanup: workspace.release,
  };
}

/**
 * Safely remove a temp render directory without following symlinks
 * into the cached node_modules. Unlinks .facet/node_modules first
 * if it's a symlink, then removes the rest of the tree.
 */
function cleanupTempDir(tempDir: string): void {
  const nmPath = join(tempDir, '.facet', 'node_modules');
  try {
    if (lstatSync(nmPath).isSymbolicLink()) {
      rmSync(nmPath, { force: true });
    }
  } catch {}
  rmSync(tempDir, { recursive: true, force: true });
}

async function renderHTML(
  consumerRoot: string,
  entryFile: string,
  data: Record<string, unknown>,
  logger: Logger,
  sandbox?: string | boolean,
  persistentLoader = true,
): Promise<string> {
  const live = isLiveTemplate(join(consumerRoot, entryFile));
  if (live) {
    const server = await startViteServer({ templatePath: entryFile, data, consumerRoot, logger });
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
  });

  try {
    return await applyTailwind(buildResult.html, buildResult.css, buildResult.facetRoot, buildResult.buildCacheKey, logger);
  } finally {
    await buildResult.cleanup();
  }
}

async function renderHTMLStreamed(
  consumerRoot: string,
  entryFile: string,
  data: Record<string, unknown>,
  logger: Logger,
  progress: RenderProgress,
  persistentLoader = true,
): Promise<string> {
  const live = isLiveTemplate(join(consumerRoot, entryFile));
  if (live) {
    progress.emit('building', 'Live template (// @live) — rendering in browser...');
    const server = await startViteServer({ templatePath: entryFile, data, consumerRoot, logger });
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
  });

  try {
    progress.emit('tailwind', 'Processing Tailwind CSS...');
    return await applyTailwind(buildResult.html, buildResult.css, buildResult.facetRoot, buildResult.buildCacheKey, logger);
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

async function buildFragment(
  consumerRoot: string,
  filename: string,
  code: string,
  data: Record<string, unknown>,
  logger: Logger,
  persistentLoader = true,
): Promise<string> {
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
  if (mainHtml.includes('</body>')) {
    return mainHtml.replace('</body>', `${fragment}</body>`);
  }
  return mainHtml + fragment;
}

async function injectHeaderFooter(
  html: string,
  parsed: ParsedRenderRequest,
  consumerRoot: string,
  logger: Logger,
  progress?: RenderProgress,
  persistentLoader = true,
): Promise<string> {
  if (!parsed.headerCode && !parsed.footerCode) return html;

  if (parsed.headerCode) {
    progress?.emit('building', 'Building header template...');
    const headerHtml = await buildFragment(consumerRoot, '_Header.tsx', parsed.headerCode, parsed.data, logger, persistentLoader);
    html = insertBeforeBodyClose(html, extractBodyContent(headerHtml));
  }

  if (parsed.footerCode) {
    progress?.emit('building', 'Building footer template...');
    const footerHtml = await buildFragment(consumerRoot, '_Footer.tsx', parsed.footerCode, parsed.data, logger, persistentLoader);
    html = insertBeforeBodyClose(html, extractBodyContent(footerHtml));
  }

  return html;
}

async function applyTailwind(
  html: string,
  css: string,
  facetRoot: string,
  buildCacheKey: string,
  logger: Logger,
): Promise<string> {
  try {
    css = await runTailwindCached({
      facetRoot,
      stylesInput: join(facetRoot, 'src/styles.css'),
      html,
      buildCacheKey,
    });
  } catch {
    logger.debug('Tailwind CSS failed, using Vite CSS fallback');
  }
  return combineHTMLAndCSS(html, css);
}

async function respondWithOutput(
  content: Buffer | string,
  contentType: string,
  extension: string,
  templateName: string,
  parsed: ParsedRenderRequest,
  s3: S3Uploader | undefined,
  logger: Logger,
): Promise<Response> {
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
