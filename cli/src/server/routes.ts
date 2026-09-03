import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';

import { generatePDFBuffer } from '../utils/pdf-generator.js';
import { injectFontScale } from '../utils/font-size.js';
import { generatePNGBuffer } from '../utils/png-generator.js';
import { hasMermaidCodeBlocks, renderBrowserHTML } from '../utils/browser-html.js';
import { Logger } from '../utils/logger.js';
import { RenderTimings } from '../utils/performance.js';
import { applyPDFSecurity } from '../utils/pdf-security.js';
import type { ServerConfig } from './config.js';
import { RenderError, errorResponse } from './errors.js';
import {
  cleanupTempDir,
  injectHeaderFooter,
  renderHTML,
  renderHTMLStreamed,
  resolveTemplateSource,
  respondWithOutput,
} from './render-pipeline.js';
import { computeCacheKey, RenderCache } from './render-cache.js';
import { RenderProgress } from './render-stream.js';
import { parseRenderRequest, validateRequestModuleMode, type ParsedRenderRequest } from './request.js';
import { VERSION } from '../version-generated.js';
import type { S3Uploader } from './s3.js';
import type { TemplateInfo } from './templates.js';
import type { WorkerPool } from './worker-pool.js';
import {
  renderContentTypeMetadata,
  renderFormatMetadata,
  type RenderFormatMetadata,
} from './render-format.js';

export function handleResultsRoute(id: string, cache: RenderCache): Response {
  const cached = cache.lookup(id);
  if (!cached) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Result not found or expired' } },
      { status: 404 },
    );
  }
  const metadata = renderContentTypeMetadata(cached.contentType);
  const stream = Readable.toWeb(createReadStream(cached.file)) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    headers: {
      'content-type': cached.contentType,
      'content-length': String(cached.size),
      'content-disposition': `inline; filename="render.${metadata.extension}"`,
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
    templates.map((template) => ({
      name: template.name,
      entryFile: template.entryFile,
      description: template.description,
      hasSchema: !!template.schema,
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
  const timings = new RenderTimings();
  let parsed: ParsedRenderRequest;
  try {
    parsed = await parseRenderRequest(request, config.maxUploadSize);
    validateRequestModuleMode(parsed, config.skipModules);
  } catch (error) {
    return errorResponse(error);
  }

  const renderTimeout = parsed.timeoutMs ?? config.renderTimeout;
  const renderPromise = doRender({ parsed, config, pool, templates, cache, s3, logger, timings });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RenderError('RENDER_TIMEOUT', `Render timed out after ${renderTimeout}ms`, 504)), renderTimeout);
  });

  try {
    return addServerTiming(await Promise.race([renderPromise, timeoutPromise]), timings);
  } catch (error) {
    return addServerTiming(errorResponse(error), timings);
  } finally {
    clearTimeout(timer);
  }
}

function addServerTiming(response: Response, timings: RenderTimings): Response {
  const header = timings.toServerTiming();
  if (header) response.headers.set('server-timing', header);
  return response;
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
  const timings = new RenderTimings();

  (async () => {
    const logger = new Logger(config.verbose);
    let parsed: ParsedRenderRequest;
    try {
      progress.emit('parsing', 'Parsing request...');
      parsed = await parseRenderRequest(request, config.maxUploadSize);
      validateRequestModuleMode(parsed, config.skipModules);
    } catch (error) {
      progress.emitError(error instanceof RenderError ? error.message : String(error));
      progress.close();
      return;
    }

    const cacheKey = cacheKeyForRequest(parsed, config);
    const cached = cache.get(cacheKey);
    if (cached) {
      progress.emit('done', 'Cache hit');
      const resultUrl = `/results/${cacheKey}`;
      const metadata = renderContentTypeMetadata(cached.contentType);
      progress.emitResult(
        cached.contentType,
        metadata.binary ? '' : cached.data.toString('utf-8'),
        resultUrl,
      );
      progress.close();
      return;
    }

    const renderTimeout = parsed.timeoutMs ?? config.renderTimeout;
    const timeout = setTimeout(() => {
      progress.emitError(`Render timed out after ${renderTimeout}ms`);
      progress.close();
    }, renderTimeout);

    try {
      const result = await doRenderStreamed({
        parsed,
        config,
        pool,
        templates,
        s3,
        logger,
        progress,
        timings,
      });
      clearTimeout(timeout);

      const data = typeof result.content === 'string'
        ? Buffer.from(result.content)
        : Buffer.from(result.content);
      cache.set(cacheKey, result.metadata.contentType, data);
      progress.emitResult(
        result.metadata.contentType,
        result.metadata.binary ? '' : data.toString('utf-8'),
        `/results/${cacheKey}`,
        timings.entries(),
      );
      progress.emit('done', 'Render complete');
    } catch (error) {
      clearTimeout(timeout);
      const message = error instanceof RenderError
        ? error.message
        : error instanceof Error ? error.message : String(error);
      progress.emitError(message);
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

function cacheKeyForRequest(parsed: ParsedRenderRequest, config: ServerConfig): string {
  return computeCacheKey({
    facetVersion: VERSION,
    moduleMode: config.skipModules ? 'skip' : 'project',
    source: parsed.source,
    data: parsed.data,
    dependencies: parsed.dependencies,
    headerCode: parsed.headerCode,
    footerCode: parsed.footerCode,
    format: parsed.format,
    pdfOptions: parsed.pdfOptions,
    encryption: parsed.encryption,
    signature: parsed.signature,
    pngOptions: parsed.pngOptions,
    live: parsed.live,
    postProcessCss: parsed.postProcessCss,
    // Without this, two audiences of the same document share a cache entry and
    // serve each other's bytes — a classification leak, not a stale render.
    redact: parsed.redact,
  });
}

interface RenderOptions {
  parsed: ParsedRenderRequest;
  config: ServerConfig;
  pool: WorkerPool;
  templates: TemplateInfo[];
  s3?: S3Uploader;
  logger: Logger;
  timings: RenderTimings;
}

interface DirectRenderOptions extends RenderOptions {
  cache: RenderCache;
}

async function materializeBrowserHTML(html: string, pool: WorkerPool): Promise<string> {
  if (!hasMermaidCodeBlocks(html)) return html;

  const worker = await pool.acquire();
  let healthy = true;
  try {
    return await renderBrowserHTML({ html, browser: worker.browser });
  } catch (error) {
    healthy = worker.browser.connected;
    throw error;
  } finally {
    await pool.release(worker, healthy);
  }
}

async function doRender(options: DirectRenderOptions): Promise<Response> {
  const { parsed, config, pool, templates, cache, s3, logger, timings } = options;
  const cacheKey = cacheKeyForRequest(parsed, config);
  const cached = cache.lookup(cacheKey);
  if (cached) {
    const metadata = renderContentTypeMetadata(cached.contentType);
    if (metadata.binary) {
      return Response.json({ url: `/results/${cacheKey}` });
    }
    const stream = Readable.toWeb(createReadStream(cached.file)) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        'content-type': cached.contentType,
        'content-length': String(cached.size),
        'content-disposition': `inline; filename="render.${metadata.extension}"`,
      },
    });
  }

  let tempDir: string | undefined;
  let archiveCleanup: (() => void) | undefined;
  try {
    const resolved = await resolveTemplateSource(parsed, templates, config);
    tempDir = resolved.tempDir;
    archiveCleanup = resolved.archiveCleanup;

    let html = await renderHTML({
      consumerRoot: resolved.consumerRoot,
      entryFile: resolved.entryFile,
      data: parsed.data,
      logger,
      sandbox: config.sandbox,
      persistentLoader: config.persistentSsr,
      timings,
      live: parsed.live,
      postProcessCss: parsed.postProcessCss,
      skipModules: config.skipModules,
      redact: parsed.redact,
      pngOptions: parsed.pngOptions,
    });
    html = await injectHeaderFooter({
      html,
      parsed,
      consumerRoot: resolved.consumerRoot,
      logger,
      persistentLoader: config.persistentSsr,
      timings,
      skipModules: config.skipModules,
    });
    // Once, ahead of the format branch, so html, png and pdf all carry it.
    html = injectFontScale(html, parsed.fontSize);

    if (parsed.format === 'html') {
      html = await materializeBrowserHTML(html, pool);
      cache.set(cacheKey, 'text/html', Buffer.from(html));
      return respondWithOutput({
        content: html,
        contentType: 'text/html',
        extension: 'html',
        templateName: resolved.templateName,
        parsed,
        s3,
        logger,
      });
    }

    const metadata = renderFormatMetadata(parsed.format);
    const worker = await pool.acquire();
    let workerHealthy = true;
    try {
      let output: Buffer;
      if (parsed.format === 'png') {
        output = await timings.measure('png-generation', () =>
          generatePNGBuffer(worker.browser, html, parsed.pngOptions));
      } else {
        output = await timings.measure('pdf-generation', () =>
          generatePDFBuffer(worker.browser, html, parsed.pdfOptions));
        if (parsed.encryption || parsed.signature) {
          output = await applyPDFSecurity(output, {
            encryption: parsed.encryption,
            signature: parsed.signature,
            timings,
          }, logger);
        }
      }
      cache.set(cacheKey, metadata.contentType, output);
      if (parsed.output === 's3') {
        return respondWithOutput({
          content: output,
          contentType: metadata.contentType,
          extension: metadata.extension,
          templateName: resolved.templateName,
          parsed,
          s3,
          logger,
        });
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

interface StreamRenderOptions extends RenderOptions {
  progress: RenderProgress;
}

interface RenderArtifact {
  content: string | Buffer;
  metadata: RenderFormatMetadata;
}

async function doRenderStreamed(options: StreamRenderOptions): Promise<RenderArtifact> {
  const { parsed, config, pool, templates, s3, logger, progress, timings } = options;
  let tempDir: string | undefined;
  let archiveCleanup: (() => void) | undefined;
  try {
    progress.emit('resolving', `Resolving template (${parsed.source.kind})...`);
    const resolved = await resolveTemplateSource(parsed, templates, config);
    tempDir = resolved.tempDir;
    archiveCleanup = resolved.archiveCleanup;

    progress.emit('building', 'Building template with Vite SSR...');
    let html = await renderHTMLStreamed({
      consumerRoot: resolved.consumerRoot,
      entryFile: resolved.entryFile,
      data: parsed.data,
      logger,
      progress,
      persistentLoader: config.persistentSsr,
      timings,
      live: parsed.live,
      postProcessCss: parsed.postProcessCss,
      skipModules: config.skipModules,
      redact: parsed.redact,
      pngOptions: parsed.pngOptions,
    });
    html = await injectHeaderFooter({
      html,
      parsed,
      consumerRoot: resolved.consumerRoot,
      logger,
      progress,
      persistentLoader: config.persistentSsr,
      timings,
      skipModules: config.skipModules,
    });
    // Once, ahead of the format branch, so html, png and pdf all carry it.
    html = injectFontScale(html, parsed.fontSize);
    if (parsed.format === 'html') {
      html = await materializeBrowserHTML(html, pool);
      progress.emit('done', 'HTML render complete');
      return {
        content: html,
        metadata: renderFormatMetadata('html'),
      };
    }

    const metadata = renderFormatMetadata(parsed.format);
    const stage = parsed.format === 'png' ? 'rendering-png' : 'rendering-pdf';
    progress.emit(stage, 'Acquiring browser worker...');
    const worker = await pool.acquire();
    let workerHealthy = true;
    try {
      let output: Buffer;
      if (parsed.format === 'png') {
        progress.emit(stage, 'Generating PNG with Puppeteer...');
        output = await timings.measure('png-generation', () =>
          generatePNGBuffer(worker.browser, html, parsed.pngOptions));
      } else {
        progress.emit(stage, 'Generating PDF with Puppeteer...');
        output = await timings.measure('pdf-generation', () =>
          generatePDFBuffer(worker.browser, html, parsed.pdfOptions));
        if (parsed.encryption || parsed.signature) {
          progress.emit('securing', 'Applying PDF security...');
          output = await applyPDFSecurity(output, {
            encryption: parsed.encryption,
            signature: parsed.signature,
            timings,
          }, logger);
        }
      }
      if (parsed.output === 's3' && s3) progress.emit('uploading', 'Uploading to S3...');
      return { content: output, metadata };
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
