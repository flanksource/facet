import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { PageFrame, type PageBridge, type PageFrameProps } from '@flanksource/page-runtime/host';
import type { FrameMessage, JsonValue } from '@flanksource/page-runtime/schema';
import { browserPageFiles } from './browser-page';
export { inspectStyles } from '@flanksource/page-runtime/styles';

interface RenderOptions {
  container: HTMLElement;
  runtimeOrigin: string;
  code: string;
  ext: string;
  header: string;
  footer: string;
  css: string;
  themeModule?: string;
  data: JsonValue;
  dependencies: Record<string, string>;
  format: 'html' | 'pdf';
  onStatus: (state: string) => void;
  onError: (error: Error) => void;
  onStyles?: (styles: Record<string, string>) => void;
}

interface Session {
  root: Root;
  options: RenderOptions;
  open: PageFrameProps['open'];
  bridge: PageBridge | null;
  actions: HTMLElement;
  error: HTMLElement;
  frame: HTMLElement;
  ready: boolean;
  failed: boolean;
  closed: boolean;
  htmlUrl?: string;
  dataKey: string;
  dependenciesKey: string;
  sourceKey: string;
  waiter?: { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
}
let session: Session | undefined;
const pageDirectory = 'playground-' + crypto.randomUUID();

export function disposeBrowserPage(): void {
  if (!session) return;
  const current = session;
  session = undefined; current.closed = true;
  current.waiter?.reject(new Error('Browser render cancelled'));
  clearTimeout(current.waiter?.timer);
  if (current.htmlUrl) URL.revokeObjectURL(current.htmlUrl);
  current.root.unmount();
}

export function invalidateBrowserPage(): boolean {
  if (!session || !session.frame.isConnected) return false;
  session.error.hidden = true; session.actions.inert = true;
  if (session.htmlUrl) URL.revokeObjectURL(session.htmlUrl);
  session.htmlUrl = undefined;
  return true;
}

export function showBrowserError(message: string): boolean {
  if (!invalidateBrowserPage() || !session) return false;
  session.error.textContent = message; session.error.hidden = false;
  return true;
}

function failure(current: Session, error: Error): void {
  if (current.closed) return;
  current.failed = true; current.ready = false;
  const pending = current.waiter;
  current.waiter = undefined; clearTimeout(pending?.timer);
  showBrowserError(error.message); current.options.onError(error); pending?.reject(error);
}

function waitForReady(current: Session): Promise<void> {
  current.ready = false;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => failure(current, new Error('Browser runtime did not become ready within 90 seconds')), 90000);
    current.waiter = { resolve, reject, timer };
  });
}

function renderFrame(current: Session): void {
  const onMessage = (message: FrameMessage) => {
    if (current.closed) return;
    if (message.type === 'activity' && message.styles) current.options.onStyles?.(message.styles);
    if (message.type === 'error') { failure(current, new Error(`${message.error.phase}: ${message.error.message}`)); return; }
    if (message.type !== 'status') return;
    current.options.onStatus(message.state);
    if (message.state === 'ready') {
      current.ready = true;
      const pending = current.waiter;
      current.waiter = undefined; clearTimeout(pending?.timer); pending?.resolve();
    }
  };
  flushSync(() => current.root.render(<PageFrame runtimeOrigin={current.options.runtimeOrigin} open={current.open} dataUpdates={false} theme={{ theme: 'light', density: 'comfortable' }} data={current.options.data} onMessage={onMessage} onError={error => failure(current, error)} onBridge={bridge => { current.bridge = bridge; }} style={{ flex: 1, minWidth: 0, border: 0, width: '100%' }} title="Browser runtime preview" />));
}

function createSession(options: RenderOptions, open: PageFrameProps['open']): Session {
  options.container.replaceChildren();
  const actions = document.createElement('div'); actions.className = 'browser-actions';
  const error = document.createElement('div'); error.className = 'error'; error.hidden = true;
  const frame = document.createElement('div'); frame.style.cssText = 'display:flex;flex:1;min-height:0';
  options.container.append(actions, error, frame);
  return { root: createRoot(frame), options, open, bridge: null, actions, error, frame, ready: false, failed: false, closed: false, dataKey: '', dependenciesKey: '', sourceKey: '' };
}

async function showActions(current: Session): Promise<void> {
  if (!current.bridge) throw new Error('Browser runtime bridge is missing');
  if (!current.htmlUrl) {
    const response = await current.bridge.request({ type: 'export', format: 'html' }, { timeoutMs: 60000 });
    if (current.closed) throw new Error('Browser render cancelled');
    if (response.message.type !== 'snapshot') throw new Error('Browser runtime did not return an HTML snapshot');
    current.htmlUrl = URL.createObjectURL(new Blob([response.message.html], { type: 'text/html' }));
  }
  current.actions.replaceChildren();
  current.actions.inert = false;
  const download = document.createElement('a');
  download.href = current.htmlUrl; download.download = 'report.html'; download.textContent = 'Download HTML'; current.actions.append(download);
  if (current.options.format === 'pdf') {
    const print = document.createElement('button'); print.textContent = 'Save PDF';
    print.onclick = () => { if (!current.bridge) throw new Error('Browser runtime bridge is missing'); void current.bridge.request({ type: 'export', format: 'print' }, { timeoutMs: 300000 }).catch(error => failure(current, error)); };
    const hint = document.createElement('span'); hint.textContent = 'One continuous page. Choose Save as PDF in the print dialog.';
    current.actions.append(print, hint);
  }
}

export async function renderBrowserPage(options: RenderOptions): Promise<void> {
  const origin = new URL(options.runtimeOrigin);
  if (origin.origin !== options.runtimeOrigin || !['https:', 'http:'].includes(origin.protocol)) throw new Error('Runtime origin must be an exact HTTP(S) origin');
  if (origin.origin === location.origin) throw new Error('The browser runtime must use a separate origin from the playground');
  for (const [name, version] of Object.entries(options.dependencies)) if (typeof version !== 'string' || !version.trim()) throw new Error(`Dependency ${name} requires a version`);
  const source = browserPageFiles(options);
  const files = Object.fromEntries(Object.entries(source.files).map(([file, code]) => [`${pageDirectory}/${file}`, code]));
  const open = { page: `${pageDirectory}/${source.page}`, layout: `${pageDirectory}/layout.tsx`, manifest: { dependencies: options.dependencies }, files };
  let previous: Session | undefined;
  let staging: HTMLElement | undefined;
  if (session && session.options.container !== options.container) disposeBrowserPage();
  if (session && session.options.runtimeOrigin !== origin.origin) {
    previous = session; session = undefined;
    staging = document.createElement('div');
    staging.inert = true;
    staging.style.cssText = `position:absolute;left:-100000px;display:flex;width:${options.container.clientWidth}px;height:${options.container.clientHeight}px`;
    options.container.append(staging);
  }
  const fresh = !session;
  session ??= createSession({ ...options, container: staging ?? options.container }, open);
  const current = session;
  const navigate = fresh || current.open.page !== open.page;
  const dataKey = JSON.stringify(options.data), sourceKey = JSON.stringify(files), dependenciesKey = JSON.stringify(options.dependencies);
  const reopen = (current.failed && !current.sourceKey) || dependenciesKey !== current.dependenciesKey;
  const sourcesChanged = sourceKey !== current.sourceKey || current.failed;
  const dataChanged = dataKey !== current.dataKey;
  const previousFiles = current.open.files;
  current.options = options; current.open = open; current.error.hidden = true; current.failed = false;
  const waiting = navigate || reopen || sourcesChanged || dataChanged ? waitForReady(current) : undefined;
  try {
    renderFrame(current);
    if (!navigate) {
      if (!current.bridge) throw new Error('Browser runtime bridge is missing');
      if (reopen) current.bridge.send({ type: 'open', ...open });
      else if (sourcesChanged) current.bridge.send({ type: 'sources', data: options.data, files: { ...Object.fromEntries(Object.keys(previousFiles).filter(file => !(file in files)).map(file => [file, null])), ...Object.fromEntries(Object.entries(files).filter(([file, code]) => previousFiles[file] !== code)) } });
      else if (dataChanged) current.bridge.send({ type: 'data', data: options.data });
    }
    await waiting;
    if (current.closed) throw new Error('Browser render cancelled');
    if (navigate || reopen || sourcesChanged || dataChanged) {
      if (current.htmlUrl) URL.revokeObjectURL(current.htmlUrl);
      current.htmlUrl = undefined;
    }
    current.dataKey = dataKey; current.sourceKey = sourceKey; current.dependenciesKey = dependenciesKey;
    await showActions(current);
    if (previous && staging) {
      previous.closed = true; previous.root.unmount();
      if (previous.htmlUrl) URL.revokeObjectURL(previous.htmlUrl);
      options.container.replaceChildren(...staging.childNodes);
    }
    current.error.hidden = true;
  } catch (error) {
    failure(current, error instanceof Error ? error : new Error(String(error)));
    if (previous) {
      current.closed = true; current.root.unmount(); staging?.remove(); session = previous;
      showBrowserError(error instanceof Error ? error.message : String(error));
    }
    if (waiting) await waiting;
    throw error;
  }
}
