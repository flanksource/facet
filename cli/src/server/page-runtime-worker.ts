import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { Browser, BrowserContext, Page } from 'puppeteer-core';
import type { BridgeEnvelope, FrameMessage, HostMessage, JsonValue, OpenMessage } from '@flanksource/page-runtime/schema';
import { startBrowserOrigin, type BrowserOrigin } from '../runtime/browser-origin.js';
import { discoverThemes } from '../builders/themes.js';
import { waitForAbortable } from '../utils/abort-lock.js';
import type { RenderTimings } from '../utils/performance.js';
import { RenderError } from './errors.js';
import { preparePDFSnapshot } from './page-runtime-snapshot.js';
import type { BuiltWorkspaceTheme } from './workspace-themes.js';

type Prepared = Extract<FrameMessage, { type: 'prepared-render' }>;

export async function startPageRuntimeHost() {
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/') { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end('<!doctype html><title>Facet render host</title><body style="margin:0"></body>');
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Render host did not bind a TCP port');
  const host = `http://127.0.0.1:${address.port}`;
  try {
    const runtime = await startBrowserOrigin({ hostOrigin: host, themeRoots: discoverThemes(process.cwd()).map(theme => theme.root), renderJobs: true });
    return {
      initialize: (browser: Browser) => initializeWorker({ browser, host, runtime }),
      close: async () => {
        server.closeAllConnections();
        await Promise.all([runtime.close(), new Promise<void>(resolve => server.close(() => resolve()))]);
      },
    };
  } catch (error) {
    server.close();
    throw error;
  }
}

export type PageRuntimeWorker = Awaited<ReturnType<typeof initializeWorker>>;
type SessionOptions = { browser: Browser; host: string; runtime: BrowserOrigin };

async function initializeWorker(options: SessionOptions) {
  let warm: Awaited<ReturnType<typeof createSession>> | undefined = await createSession(options);
  return {
    async acquire(settings: { trusted: boolean; timings: RenderTimings; signal: AbortSignal; theme?: BuiltWorkspaceTheme }) {
      if (!settings.trusted || settings.theme) {
        const runtime = settings.theme
          ? await startBrowserOrigin({ hostOrigin: options.host, publishedThemes: [settings.theme], renderJobs: true })
          : options.runtime;
        const closeRuntime = async () => { if (runtime !== options.runtime) await runtime.close(); };
        try {
          const isolated = await settings.timings.measure('runtime-boot', () => createSession({ ...options, runtime }));
          return { origin: runtime, session: isolated, release: async () => {
            try { await isolated.close(); } finally { await closeRuntime(); }
          } };
        } catch (error) {
          await closeRuntime();
          throw error;
        }
      }
      if (!warm) warm = await settings.timings.measure('runtime-boot', () => createSession(options));
      return {
        origin: options.runtime,
        session: warm,
        release: async (healthy: boolean) => {
          if (healthy && !settings.signal.aborted) return;
          const previous = warm;
          warm = undefined;
          await previous?.close();
        },
      };
    },
  };
}

async function createSession(options: SessionOptions) {
  const context = await options.browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await restrictRequests(page, options);
    await page.goto(options.host, { waitUntil: 'load' });
    const session = renderSession(page, context, options.runtime.origin);
    await session.boot();
    return session;
  } catch (error) {
    if (options.browser.connected) await context.close();
    throw error;
  }
}

async function restrictRequests(page: Page, { host, runtime }: SessionOptions): Promise<void> {
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    const allowed = url.origin === runtime.origin || (!request.frame()?.parentFrame() && url.origin === host)
      || ['data:', 'blob:', 'about:'].includes(url.protocol)
      || (!request.isNavigationRequest() && ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(url.origin));
    return allowed ? request.continue() : request.abort('blockedbyclient');
  });
}

function renderSession(page: Page, context: BrowserContext, origin: string) {
  let session: string;
  let iframeUrl: string;
  async function boot(entry = 'bootstrap'): Promise<void> {
    session = randomUUID();
    const url = new URL('/frame/' + entry.split('/').map(encodeURIComponent).join('/'), origin);
    url.searchParams.set('render-job', '1');
    if (entry !== 'bootstrap') url.searchParams.set('runtime-opened', '1');
    iframeUrl = url.href;
    await exchange();
  }
  async function exchange(message?: HostMessage): Promise<FrameMessage> {
    const response = await page.evaluate(({ origin, session, iframeUrl, message, id }) => {
      return new Promise<FrameMessage>((resolve, reject) => {
        let frame = document.querySelector<HTMLIFrameElement>('iframe');
        const cleanup = () => { window.removeEventListener('message', receive); clearTimeout(timer); };
        const receive = (event: MessageEvent<BridgeEnvelope<FrameMessage>>) => {
          if (event.source !== frame?.contentWindow || event.origin !== origin || event.data?.bridge !== 'page-runtime-v1' || event.data.session !== session) return;
          if (message && event.data.re !== id) return;
          const reply = event.data.message;
          if (!message && reply.type !== 'error' && !(reply.type === 'status' && reply.state === 'connecting')) return;
          cleanup();
          resolve(reply);
        };
        window.addEventListener('message', receive);
        const timer = setTimeout(() => { cleanup(); reject(new Error('Timed out waiting for the page runtime')); }, 60_000);
        if (message) {
          frame?.contentWindow?.postMessage({ bridge: 'page-runtime-v1', session, id, message }, origin);
          return;
        }
        frame?.remove();
        frame = document.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        frame.style.cssText = 'border:0;width:100vw;height:100vh;display:block';
        frame.src = iframeUrl + '#' + new URLSearchParams({ host: location.origin, session });
        document.body.append(frame);
      });
    }, { origin, session, iframeUrl, message, id: randomUUID() });
    if (response.type === 'error') throw new RenderError('RENDER_FAILED', `${response.error.file}: ${response.error.phase}: ${response.error.message}`, 422);
    return response;
  }
  return {
    boot,
    async prepare(open: OpenMessage, timings: RenderTimings, signal: AbortSignal): Promise<Prepared> {
      const result = await waitForAbortable(exchange({ type: 'prepare-render', open }), signal);
      if (result.type !== 'prepared-render') throw new Error('Runtime did not prepare the requested template');
      if (!result.navigate) return result;
      await timings.measure('runtime-boot', () => waitForAbortable(boot(open.page), signal));
      const ready = await waitForAbortable(exchange({ type: 'prepare-render', open }), signal);
      if (ready.type !== 'prepared-render' || ready.navigate) throw new Error('Runtime opened a frame with the wrong dependency lock');
      return ready;
    },
    async render(options: { data: JsonValue; viewport: { width: number; height: number }; signal: AbortSignal; timings: RenderTimings }): Promise<string> {
      await page.bringToFront();
      await page.setViewport(options.viewport);
      const result = await waitForAbortable(exchange({ type: 'render', data: options.data }), options.signal);
      if (result.type !== 'rendered') throw new Error('Runtime did not return the requested PDF snapshot');
      options.timings.record('runtime-modules', result.modulesMs);
      options.timings.record('runtime-readiness', result.readinessMs);
      options.timings.record('runtime-snapshot', result.snapshotMs);
      return waitForAbortable(options.timings.measure('runtime-snapshot', () => page.evaluate(preparePDFSnapshot, result.html)), options.signal);
    },
    close: async () => { if (page.browser().connected) await context.close(); },
  };
}
