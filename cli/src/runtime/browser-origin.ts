import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createPackageHandler } from '@flanksource/page-runtime/dev';
import { publishPackage } from '@flanksource/page-runtime/publication';
import { browserRuntimeAssets } from '../server/playground-form-generated.js';
import { assetPath } from '../utils/assets.js';
import { devRuntime } from './dev.js';
import { runtimeCacheRoot } from './workspace.js';

export interface BrowserOrigin {
  origin: string;
  close(): Promise<void>;
}

export async function startBrowserOrigin(options: { hostOrigin: string; themeRoots?: string[] }): Promise<BrowserOrigin> {
  const host = new URL(options.hostOrigin);
  if (host.origin !== options.hostOrigin || !['http:', 'https:'].includes(host.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(host.hostname)) throw new Error('Automatic browser runtime requires an exact loopback origin; configure a hosted runtime origin for remote playgrounds');
  const dev = devRuntime();
  for (const root of options.themeRoots ?? []) await publishPackage({ libraryDir: root });
  const packages = dev || options.themeRoots?.length ? await createPackageHandler({ packages: [...(dev ? [dev.clickyUiRoot, dev.facetRoot] : []), ...(options.themeRoots ?? [])], upstreamRegistry: 'https://registry.npmjs.org', upstreamOrigin: 'https://unpkg.com', stateDir: join(runtimeCacheRoot(), 'browser-packages') }) : undefined;
  const pkg = JSON.parse(readFileSync(assetPath('package.json'), 'utf8'));
  const managed = { '@flanksource/facet': pkg.version, '@flanksource/clicky-ui': pkg.peerDependencies['@flanksource/clicky-ui'], ...(packages ? Object.fromEntries(Object.entries(packages.current().packages).map(([name, entry]) => [name, entry.version])) : {}) };
  const revision = packages?.current().revision;
  let origin: string;
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
    if (path === '/profile.json') {
      const packageOrigin = packages ? `${origin}/_generations/${revision}` : 'https://unpkg.com';
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ runtimeDomain: '127.0.0.1', embedders: [host.origin], packageOrigin, registry: packages ? packageOrigin : 'https://registry.npmjs.org', managed, policy: { dependencies: 'any' }, minReleaseAgeDays: 0, network: { allow: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] }, csp: { add: { 'style-src': ['https://fonts.googleapis.com'], 'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'] } }, links: 'deny', sources: ['host'], readinessTimeoutMs: 30000 }));
      return;
    }
    const file = path.startsWith('/frame/') ? 'bootstrap.html' : path.slice(1);
    if (Object.hasOwn(browserRuntimeAssets, file)) {
      response.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', 'cache-control': 'no-cache', ...(file === 'sw.js' ? { 'service-worker-allowed': '/frame/' } : {}) });
      response.end(request.method === 'HEAD' ? undefined : gunzipSync(Buffer.from(browserRuntimeAssets[file]!, 'base64')));
    } else if (packages && path.startsWith('/_generations/')) void packages.handle(request, response);
    else response.writeHead(404).end('Browser runtime asset not found');
  });
  try { await new Promise<void>((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); }); }
  catch (error) { packages?.close(); throw error; }
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Browser runtime did not bind a TCP port');
  origin = `http://127.0.0.1:${address.port}`;
  return { origin, close: async () => { packages?.close(); server.closeAllConnections(); await new Promise<void>((done, fail) => server.close(error => error ? fail(error) : done())); } };
}

