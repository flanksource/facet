import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config.js';
import { RenderCache } from './render-cache.js';
import { WorkerPool } from './worker-pool.js';

const state = vi.hoisted(() => ({ message: 'first build' }));
vi.mock('./render-pipeline.js', () => ({
  cleanupTempDir: vi.fn(),
  injectHeaderFooter: async ({ html }: { html: string }) => html,
  renderHTML: async () => `<html><body><p>${state.message}</p></body></html>`,
  renderHTMLStreamed: async () => `<html><body><p>${state.message}</p></body></html>`,
  resolveTemplateSource: async () => ({ consumerRoot: '/example', entryFile: 'Report.tsx', templateName: 'report' }),
  respondWithOutput: async ({ content }: { content: string }) => new Response(content),
}));
vi.mock('../runtime/installed.js', () => ({ installedRuntime: async () => { throw new Error('Installed archive accessed'); } }));
import { handleRender, handleRenderStream } from './routes.js';
import { createServer } from './preview.js';

let scratch: string;
beforeEach(() => {
  mkdirSync(resolve('../.tmp'), { recursive: true });
  scratch = mkdtempSync(resolve('../.tmp/dev-server-'));
  state.message = 'first build';
  vi.stubEnv('FACET_DEV_ROOT', '');
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(scratch, { recursive: true, force: true }); });

it('starts a dev server with skip-modules without requiring the installed archive', async () => {
  vi.stubEnv('FACET_DEV_ROOT', '/example/facet');
  const server = await createServer(loadConfig({ workers: '0', port: '0', templatesDir: scratch, skipModules: true }));
  try { expect((await fetch(new URL('/healthz', server.url))).status).toBe(200); }
  finally { await server.stop(); }
});

describe.each([['direct', handleRender], ['streamed', handleRenderStream]] as const)('%s render caching', (_name, render) => {
  it.each([false, true])('uses the latest local build only when dev mode is %s', async (dev) => {
    if (dev) vi.stubEnv('FACET_DEV_ROOT', '/example/facet');
    const config = loadConfig({ workers: '0' });
    const pool = new WorkerPool(0);
    const cache = new RenderCache(scratch, 1024 * 1024);
    const request = () => new Request('http://facet.test/render', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'export default null', format: 'html' }),
    });
    const first = await (await render(request(), config, pool, [], cache)).text();
    expect(first).toContain('first build');
    state.message = 'rebuilt locally';
    const second = await (await render(request(), config, pool, [], cache)).text();
    expect(second).toContain(dev ? 'rebuilt locally' : 'first build');
    expect(second).not.toContain(dev ? 'first build' : 'rebuilt locally');
  });
});
