import { describe, expect, it, vi } from 'vitest';
import type { ServerConfig } from './config.js';
import type { RenderCache } from './render-cache.js';
import { WorkerPool } from './worker-pool.js';

const mocks = vi.hoisted(() => ({ renderHTML: vi.fn(async () => '<html><body>report</body></html>') }));

vi.mock('./render-pipeline.js', () => ({
  cleanupTempDir: vi.fn(),
  injectHeaderFooter: async ({ html }: { html: string }) => html,
  renderHTML: mocks.renderHTML,
  renderHTMLStreamed: vi.fn(),
  resolveTemplateSource: async () => ({ consumerRoot: '/example', entryFile: 'Report.tsx', templateName: 'report' }),
  respondWithOutput: vi.fn(),
}));

import { handleRender } from './routes.js';

describe('render cancellation', () => {
  it('returns the timeout while a template build is still running', async () => {
    let release!: (html: string) => void;
    mocks.renderHTML.mockImplementationOnce(() => new Promise<string>((resolve) => { release = resolve; }));
    const request = new Request('http://facet.test/render', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'export default null', format: 'pdf' }),
    });
    const config = { verbose: false, maxUploadSize: 1024 * 1024, renderTimeout: 20 } as ServerConfig;
    const cache = { lookup: () => undefined } as unknown as RenderCache;
    const result = handleRender(request, config, new WorkerPool(1, false), [], cache);
    const response = await Promise.race([result, new Promise<undefined>((resolve) => setTimeout(resolve, 500))]);
    expect(response?.status).toBe(504);
    release('<html><body>report</body></html>');
  });

  it('removes a disconnected request from the browser queue', async () => {
    const pool = new WorkerPool(1, false, { acquireTimeoutMs: 5_000 });
    const controller = new AbortController();
    const request = new Request('http://facet.test/render', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'export default null', format: 'pdf' }), signal: controller.signal,
    });
    const config = { verbose: false, maxUploadSize: 1024 * 1024, renderTimeout: 10_000 } as ServerConfig;
    const cache = { lookup: () => undefined } as unknown as RenderCache;
    const result = handleRender(request, config, pool, [], cache);
    await vi.waitFor(() => expect(pool.stats().waiting).toBe(1));
    controller.abort(new DOMException('Client disconnected', 'AbortError'));
    const settled = await Promise.race([result.then(() => true), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500))]);
    expect(settled).toBe(true);
    expect(pool.stats().waiting).toBe(0);
  });
});
