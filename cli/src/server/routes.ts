import { mkdtemp, cp, writeFile, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import { rmSync, lstatSync } from 'fs';
import { $ } from 'bun';

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
import { combineHTMLAndCSS } from '../bundler/renderer.js';
import { generatePDFBuffer } from '../utils/pdf-generator.js';
import { Logger } from '../utils/logger.js';
import { RenderProgress } from './render-stream.js';

export function handleHealthz(pool: WorkerPool): Response {
  return Response.json({ status: 'ok', workers: pool.stats() });
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
  s3?: S3Uploader,
): Promise<Response> {
  const logger = new Logger(config.verbose);
  let parsed: ParsedRenderRequest;
  try {
    parsed = await parseRenderRequest(request, config.maxUploadSize);
  } catch (err) {
    return errorResponse(err);
  }

  const renderPromise = doRender(parsed, config, pool, templates, s3, logger);
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
  s3?: S3Uploader,
): Response {
  const { progress, stream } = RenderProgress.create();

  // Run the render pipeline asynchronously, streaming progress
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

    const timeout = setTimeout(() => {
      progress.emitError('Render timed out');
      progress.close();
    }, config.renderTimeout);

    try {
      const result = await doRenderStreamed(parsed, config, pool, templates, s3, logger, progress);
      clearTimeout(timeout);

      if (typeof result === 'string') {
        progress.emitResult('text/html', result);
      } else {
        // PDF: base64 encode for SSE transport
        progress.emitResult('application/pdf', Buffer.from(result).toString('base64'));
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

async function doRender(
  parsed: ParsedRenderRequest,
  config: ServerConfig,
  pool: WorkerPool,
  templates: TemplateInfo[],
  s3: S3Uploader | undefined,
  logger: Logger,
): Promise<Response> {
  let tempDir: string | undefined;
  let archiveCleanup: (() => void) | undefined;

  try {
    const resolved = await resolveTemplateSource(parsed, templates, config);
    tempDir = resolved.tempDir;
    archiveCleanup = resolved.archiveCleanup;

    const html = await renderHTML(resolved.consumerRoot, resolved.entryFile, parsed.data, logger, config.sandbox);
    const templateName = resolved.templateName;

    if (parsed.format === 'html') {
      return respondWithOutput(html, 'text/html', 'html', templateName, parsed, s3, logger);
    }

    const worker = await pool.acquire();
    try {
      const pdfBuffer = await generatePDFBuffer(worker.browser, html, parsed.pdfOptions);
      return respondWithOutput(pdfBuffer, 'application/pdf', 'pdf', templateName, parsed, s3, logger);
    } finally {
      await pool.release(worker);
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
    const html = await renderHTMLStreamed(resolved.consumerRoot, resolved.entryFile, parsed.data, logger, progress);

    if (parsed.format === 'html') {
      progress.emit('done', 'HTML render complete');
      return html;
    }

    progress.emit('rendering-pdf', 'Acquiring browser worker...');
    const worker = await pool.acquire();
    try {
      progress.emit('rendering-pdf', 'Generating PDF with Puppeteer...');
      const pdfBuffer = await generatePDFBuffer(worker.browser, html, parsed.pdfOptions);

      if (parsed.output === 's3' && s3) {
        progress.emit('uploading', 'Uploading to S3...');
      }

      return pdfBuffer;
    } finally {
      await pool.release(worker);
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
    const tempDir = await mkdtemp(join(tmpdir(), 'facet-inline-'));
    await writeFile(join(tempDir, 'Template.tsx'), source.code, 'utf-8');
    if (parsed.dependencies) {
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({
        name: 'facet-inline',
        dependencies: parsed.dependencies,
      }), 'utf-8');
    }
    return {
      consumerRoot: tempDir,
      entryFile: 'Template.tsx',
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
    const tempDir = await copyToTempDir(resolved.consumerRoot);
    return {
      consumerRoot: tempDir,
      entryFile: resolved.templateFile,
      templateName: basename(source.template),
      tempDir,
    };
  }

  // local
  const info = resolveLocalTemplate(source.name, templates);
  if (!info) {
    throw new RenderError('TEMPLATE_NOT_FOUND', `Template not found: ${source.name}`, 404);
  }

  const tempDir = await copyToTempDir(info.consumerRoot);
  return {
    consumerRoot: tempDir,
    entryFile: info.entryFile,
    templateName: info.name,
    tempDir,
  };
}

async function copyToTempDir(sourceDir: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'facet-render-'));
  await cp(sourceDir, tempDir, { recursive: true });
  return tempDir;
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
): Promise<string> {
  const buildResult = await buildTemplate({
    templatePath: entryFile,
    data,
    consumerRoot,
    logger,
    sandbox,
  });

  try {
    return await applyTailwind(consumerRoot, buildResult.html, buildResult.css, logger);
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
): Promise<string> {
  progress.emit('building', 'Compiling template with Vite SSR...');
  const buildResult = await buildTemplate({
    templatePath: entryFile,
    data,
    consumerRoot,
    logger,
  });

  try {
    progress.emit('tailwind', 'Processing Tailwind CSS...');
    return await applyTailwind(consumerRoot, buildResult.html, buildResult.css, logger);
  } finally {
    await buildResult.cleanup();
  }
}

async function applyTailwind(
  consumerRoot: string,
  html: string,
  css: string,
  logger: Logger,
): Promise<string> {
  const facetRoot = join(consumerRoot, '.facet');
  const tempHtmlPath = join(consumerRoot, '_render.temp.html');
  await writeFile(tempHtmlPath, html, 'utf-8');

  const stylesInput = join(facetRoot, 'src/styles.css');
  const outputCssPath = join(consumerRoot, '_render.css');

  try {
    await $`cd ${facetRoot} && npx tailwindcss -i ${stylesInput} --content ${tempHtmlPath} -o ${outputCssPath}`.quiet();
    css = await readFile(outputCssPath, 'utf-8');
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
  return new Response(content, {
    headers: {
      'content-type': contentType,
      'content-disposition': `inline; filename="${filename}"`,
    },
  });
}
