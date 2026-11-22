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

it('serves packaged browser libraries, runtime exports and their verified modules from loopback', async () => {
  runtime = await startBrowserOrigin({ hostOrigin: 'http://localhost:43125' });
  const profile = await (await fetch(`${runtime.origin}/profile.json`)).json();
  expect(profile).toMatchObject({ runtimeExports: true });
  expect(new URL(profile.packageOrigin).origin).toBe(runtime.origin);
  expect(new URL(profile.registry).origin).toBe(runtime.origin);
  for (const name of ['@flanksource/facet', '@flanksource/clicky-ui']) {
    const version = profile.managed[name];
    const manifest = await (await fetch(`${profile.registry}/${encodeURIComponent(name)}`)).json();
    expect(manifest.versions[version]).toMatchObject({ name, version });
    for (const file of ['importmap', 'barrels']) {
      expect((await fetch(`${profile.packageOrigin}/${name}@${version}/dist/runtime/${file}.json`)).status).toBe(200);
    }
  }
  const exports = await (await fetch(`${runtime.origin}/runtime-exports.json`)).json();
  const entry = exports.imports['react-icons/io5'];
  const asset = await fetch(`${profile.packageOrigin}/${entry}`);
  expect(asset.status).toBe(200);
  expect(asset.headers.get('content-type')).toContain('javascript');
  const digest = await crypto.subtle.digest('SHA-384', await asset.arrayBuffer());
  expect(`sha384-${Buffer.from(digest).toString('base64')}`).toBe(exports.integrity[entry]);
});

it.each(['https://app.example.com', 'http://localhost:43125/path', 'file:///report.html'])('requires an exact loopback host origin for the automatic local runtime: %s', async hostOrigin => {
  await expect(startBrowserOrigin({ hostOrigin })).rejects.toThrow(/loopback origin/);
});
