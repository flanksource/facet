import type { JsonValue } from '@flanksource/page-runtime/schema';
import { injectFontScale } from '../utils/font-size.js';
import { waitForAbortable } from '../utils/abort-lock.js';
import type { Logger } from '../utils/logger.js';
import type { RenderTimings } from '../utils/performance.js';
import { VERSION } from '../version-generated.js';
import type { ServerConfig } from './config.js';
import { PDF_LAYOUT_VERSION, renderBinary } from './render-binary.js';
import { computeCacheKey, type RenderCache } from './render-cache.js';
import { cleanupTempDir, resolveTemplateSource, type ResolvedSource } from './render-pipeline.js';
import { publishRenderSource, readBrowserTemplate } from './page-runtime-source.js';
import type { RenderProgress } from './render-stream.js';
import type { ParsedRenderRequest } from './request.js';
import type { TemplateInfo } from './templates.js';
import type { Worker, WorkerPool } from './worker-pool.js';

type Job = {
  parsed: ParsedRenderRequest; templates: TemplateInfo[]; config: ServerConfig;
  pool: WorkerPool; cache: RenderCache; timings: RenderTimings; logger: Logger;
  signal: AbortSignal; progress?: RenderProgress; resultKey: (resolved: string) => string;
};

export async function renderPageRuntimePDF(job: Job): Promise<{ content: Buffer; templateName: string; key: string }> {
  const { parsed, config, pool, signal, timings } = job;
  job.progress?.emit('resolving', `Resolving template (${parsed.source.kind})...`);
  signal.throwIfAborted();
  const source = await resolveTemplateSource(parsed, job.templates, config);
  try {
    const template = await readBrowserTemplate({ source, parsed, skipModules: config.skipModules, maxBytes: config.maxUploadSize, signal });
    const worker = await timings.measure('runtime-queue', () => pool.acquire(signal));
    let healthy = false;
    try {
      const result = await renderOnWorker({ job, source, template, worker });
      healthy = true;
      return result;
    } finally {
      await pool.release(worker, healthy || (!signal.aborted && worker.browser.connected));
    }
  } finally {
    source.archiveCleanup?.();
    if (source.tempDir) cleanupTempDir(source.tempDir);
  }
}

async function renderOnWorker(options: { job: Job; source: ResolvedSource; template: Awaited<ReturnType<typeof readBrowserTemplate>>; worker: Worker }) {
  const { job, source, template, worker } = options;
  const { parsed, timings, logger, signal, progress } = job;
  if (!worker.pageRuntime) throw new Error('Browser worker is missing its page runtime');
  const runtime = worker.pageRuntime;
  const abort = () => { void worker.browser.close().catch(error => logger.warn(`Failed to stop browser: ${String(error)}`)); };
  signal.addEventListener('abort', abort, { once: true });
  let session: Awaited<ReturnType<typeof runtime.acquire>> | undefined;
  let published: ReturnType<typeof publishRenderSource> | undefined;
  let healthy = false;
  try {
    if (signal.aborted) abort();
    signal.throwIfAborted();
    session = await runtime.acquire({ trusted: parsed.source.kind === 'local', timings, signal, theme: parsed.workspaceTheme });
    published = publishRenderSource(session.origin, template);
    const { open } = published;
    progress?.emit('building', 'Preparing the page runtime...');
    const { lock, runtimeVersion } = await timings.measure('runtime-resolve', () => session!.session.prepare(open, timings, signal));
    const normalizedLock = { ...lock, packageOrigin: new URL(lock.packageOrigin).pathname };
    const key = job.resultKey(computeCacheKey({
      renderer: 'page-runtime', facetVersion: VERSION, runtimeVersion, lock: normalizedLock,
      pdfLayoutVersion: PDF_LAYOUT_VERSION,
      source: template.fingerprint, data: parsed.data, pdfOptions: parsed.pdfOptions, encryption: parsed.encryption,
      fontSize: parsed.fontSize, embedFormat: parsed.embedFormat, embedSize: parsed.embedSize, pageSizeOverride: parsed.pageSizeOverride,
    }));
    const hit = job.cache.get(key);
    if (hit) {
      timings.record('cache-hit', 0);
      healthy = true;
      return { content: hit.data, templateName: source.templateName, key };
    }
    const snapshot = await session.session.render({ data: parsed.data as JsonValue, viewport: template.viewport, signal, timings });
    signal.throwIfAborted();
    const html = injectFontScale(snapshot, parsed.fontSize);
    const content = await waitForAbortable(renderBinary({ browser: worker.browser, html, parsed, timings, logger, progress, consumerRoot: source.consumerRoot }), signal);
    signal.throwIfAborted();
    healthy = true;
    job.cache.set(key, 'application/pdf', content);
    return { content, templateName: source.templateName, key };
  } finally {
    signal.removeEventListener('abort', abort);
    published?.dispose();
    await session?.release(healthy);
  }
}
