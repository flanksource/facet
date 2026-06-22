/**
 * Vite Dev Server Loader (live render path)
 *
 * Runs with Bun from inside .facet/, resolving Vite from .facet/node_modules
 * (Vite is NOT embedded in the CLI bundle). Starts a Vite dev server bound to
 * an OS-assigned port, prints `FACET_DEV_URL=<url>` to stdout once listening,
 * then stays alive until the parent process kills it.
 *
 * Mirrors vite-ssr-loader.ts in spirit, but boots a dev server instead of
 * running an SSR build — diagrams (react-xarrows) need a live browser DOM.
 */

function parseArgs(): { facetRoot: string } {
  const args = process.argv.slice(2);
  let facetRoot = process.cwd();
  for (const arg of args) {
    if (arg.startsWith('--facet-root=')) facetRoot = arg.slice('--facet-root='.length);
  }
  return { facetRoot };
}

async function main() {
  const { facetRoot } = parseArgs();
  const { join } = await import('path');
  const { createServer } = await import('vite');

  // Vite logs to stdout by default; redirect its console to stderr so our
  // FACET_DEV_URL handshake line is the only thing on stdout.
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

  // Handshake: parent reads this line to learn the URL.
  origLog(`FACET_DEV_URL=${url}`);

  const shutdown = async () => {
    try { await server.close(); } catch { /* best effort */ }
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
