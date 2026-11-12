import { afterEach, expect, it } from 'vitest';
import { startBrowserOrigin, type BrowserOrigin } from './browser-origin.js';

let runtime: BrowserOrigin | undefined;
afterEach(async () => { await runtime?.close(); runtime = undefined; });

it('serves an isolated browser runtime with a host-specific profile and worker scope', async () => {
  const hostOrigin = 'http://localhost:43125';
  runtime = await startBrowserOrigin({ hostOrigin });
  expect(runtime.origin).not.toBe(hostOrigin);
  const profile = await (await fetch(`${runtime.origin}/profile.json`)).json();
  expect(profile).toMatchObject({ embedders: [hostOrigin], links: 'deny', sources: ['host'], network: { allow: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] } });
  const worker = await fetch(`${runtime.origin}/sw.js`);
  expect(worker.headers.get('service-worker-allowed')).toBe('/frame/');
  expect(worker.headers.get('content-type')).toContain('javascript');
  expect((await worker.text()).length).toBeGreaterThan(1000);
  expect((await fetch(`${runtime.origin}/frame/report.tsx`)).headers.get('content-type')).toContain('text/html');
  expect((await fetch(`${runtime.origin}/unknown`)).status).toBe(404);
});

it.each(['https://app.example.com', 'http://localhost:43125/path', 'file:///report.html'])('requires an exact loopback host origin for the automatic local runtime: %s', async hostOrigin => {
  await expect(startBrowserOrigin({ hostOrigin })).rejects.toThrow(/loopback origin/);
});
