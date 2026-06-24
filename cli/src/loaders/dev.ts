/**
 * Vite dev-server loader, run as a self-exec subprocess (FACET_LOADER=dev) from
 * inside .facet/. Boots a Vite dev server (resolved from .facet/node_modules)
 * on an ephemeral port and prints `FACET_DEV_URL=<url>` to stdout once listening,
 * then stays alive until the parent kills it. Used by the --live render path so
 * diagrams (react-xarrows) render against a live browser DOM.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

function parseArgs(): { facetRoot: string } {
  const args = process.argv.slice(2);
  let facetRoot = process.cwd();
  for (const arg of args) {
    if (arg.startsWith('--facet-root=')) facetRoot = arg.slice('--facet-root='.length);
  }
  return { facetRoot };
}

export async function runDevLoader(): Promise<void> {
  const { facetRoot } = parseArgs();

  // Resolve Vite from .facet/node_modules, not the CLI's own deps (ESM import()
  // ignores NODE_PATH, so resolve explicitly relative to .facet).
  const facetRequire = createRequire(join(facetRoot, 'package.json'));
  // Vite resolves to its CJS build; under Node the API lands on `.default`
  // (Bun hoists the named exports), so fall back to it.
  const viteMod = await import(pathToFileURL(facetRequire.resolve('vite')).href);
  const createServer = (viteMod.createServer ?? viteMod.default?.createServer) as typeof import('vite').createServer;

  // Vite logs to stdout by default; redirect to stderr so the FACET_DEV_URL
  // handshake line is the only thing on stdout.
  const origLog = console.log;
  console.log = (...a: unknown[]) => console.error(...a);

  const server = await createServer({
    configFile: join(facetRoot, 'vite.client.config.ts'),
    root: facetRoot,
    logLevel: 'error',
    server: { port: 0, strictPort: false, host: '127.0.0.1' },
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react-xarrows'] },
  });

  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') {
    throw new Error('Vite dev server did not expose a TCP address');
  }
  const url = `http://127.0.0.1:${address.port}/`;
  origLog(`FACET_DEV_URL=${url}`);

  const shutdown = async () => {
    try { await server.close(); } catch { /* best effort */ }
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Block forever; the parent kills this process when the render is done.
  await new Promise<never>(() => {});
}
