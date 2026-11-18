import { readFile, realpath } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, relative, sep } from 'node:path';
import { LOCAL_RELEASE_TIME, type PackageHandler } from '@flanksource/page-runtime/dev';
import { clicky, facet, readRuntimeLayers } from './layers.js';
import { readBrowserFragments } from './named-browser.js';

const packagePath = /^\/((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)(?:@([a-zA-Z0-9][a-zA-Z0-9.+_-]*)\/(.*))?$/;
const assetTypes: Record<string, string> = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.cjs': 'text/javascript',
  '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
};

export const upstreamRegistry = 'https://registry.npmjs.org';
export const upstreamOrigin = 'https://unpkg.com';

export async function packagedBrowserPackages(root: string) {
  const layers = readRuntimeLayers(root);
  if (!layers) throw new Error(`Browser package catalog is missing from the installed runtime at ${root}; rebuild or reinstall Facet`);
  const { browserPackages, browserCatalog } = layers;
  const files = new Set(Object.keys(browserCatalog.integrity));
  for (const fragment of readBrowserFragments(root)) for (const file of Object.keys(fragment.integrity)) files.add(file);
  const managed = Object.fromEntries([clicky, facet].map(name => [name, layers.versions[name]]));
  const metadata = new Map<string, unknown>();
  for (const [name, version] of Object.entries(managed)) {
    const id = `${name}@${version}`;
    const entry = Object.hasOwn(browserPackages, id) ? browserPackages[id] : undefined;
    if (!entry) throw new Error(`Browser package ${id} is missing from the installed runtime at ${root}`);
    const manifest = JSON.parse(await readFile(join(root, entry.path, 'package.json'), 'utf8'));
    if (manifest.name !== name || manifest.version !== version) throw new Error(`Browser package ${id} has an unexpected package manifest`);
    metadata.set(name, { name, versions: { [version]: manifest }, time: { [version]: LOCAL_RELEASE_TIME } });
    for (const file of ['package.json', 'dist/runtime/importmap.json', 'dist/runtime/barrels.json']) files.add(`${id}/${file}`);
  }

  async function serve(request: IncomingMessage, response: ServerResponse, options: { path: string; query: string; external?: PackageHandler }) {
    const match = packagePath.exec(options.path);
    if (!match || /[\\\p{Cc}?#]/u.test(options.path) || options.path.split('/').some(part => part === '.' || part === '..')) {
      response.writeHead(400).end('Invalid browser package path');
      return;
    }
    const [, name, version, file] = match;
    const id = `${name}@${version}`;
    try {
      const manifest = !version && metadata.get(name!);
      if (manifest) {
        response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=31536000, immutable' });
        response.end(request.method === 'HEAD' ? undefined : JSON.stringify(manifest));
      } else if (file && files.has(`${id}/${file}`)) {
        const entry = Object.hasOwn(browserPackages, id) ? browserPackages[id] : undefined;
        if (!entry) throw new Error(`Browser package ${id} is missing from the runtime catalog`);
        const packageRoot = await realpath(join(root, entry.path));
        const path = await realpath(join(packageRoot, file));
        if (relative(packageRoot, path).startsWith(`..${sep}`)) throw new Error(`Invalid runtime asset for ${id}/${file}`);
        const contents = await readFile(path);
        response.writeHead(200, { 'content-type': assetTypes[extname(file)] ?? 'application/octet-stream', 'content-length': contents.byteLength, 'cache-control': 'public, max-age=31536000, immutable' });
        response.end(request.method === 'HEAD' ? undefined : contents);
      } else if (options.external) {
        await options.external(request, response);
      } else {
        const path = version ? options.path.split('/').map(encodeURIComponent).join('/').replace(/%40/g, '@') : `/${encodeURIComponent(name!)}`;
        const target = `${version ? upstreamOrigin : upstreamRegistry}${path}${options.query}`;
        const upstream = await fetch(target, { method: request.method, signal: AbortSignal.timeout(30000), redirect: 'error' });
        const body = request.method === 'HEAD' ? undefined : Buffer.from(await upstream.arrayBuffer());
        response.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream' }).end(body);
      }
    } catch (error) {
      response.writeHead(502).end(`Browser package ${options.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { managed, catalog: browserCatalog, serve };
}
