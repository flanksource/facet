/**
 * Vite Dev Server (live render path)
 *
 * Scaffolds .facet/ exactly like the SSR builder, then boots a Vite dev server
 * (via vite-dev-loader.ts, run with Bun) instead of an SSR build. Returns the
 * served URL so a browser can render the template with a live DOM — required
 * for diagram components (react-xarrows) that measure rects.
 */

import { join } from 'path';
import { Logger } from '../utils/logger.js';
import { FacetDirectory } from '../builders/facet-directory.js';
import { installWithRetry } from './vite-builder.js';

type DevServerProcess = Bun.Subprocess<'ignore', 'pipe', 'inherit'>;

export interface ViteServerOptions {
  templatePath: string;
  data: Record<string, unknown>;
  consumerRoot?: string;
  logger: Logger;
}

export interface ViteServer {
  /** Base URL the template is served at, e.g. http://127.0.0.1:53124/ */
  url: string;
  /** Stop the dev server and release the port. */
  close: () => Promise<void>;
}

const HANDSHAKE_PREFIX = 'FACET_DEV_URL=';
const STARTUP_TIMEOUT_MS = 60_000;

/**
 * Start a Vite dev server serving the template. Caller MUST await `close()`.
 */
export async function startViteServer(options: ViteServerOptions): Promise<ViteServer> {
  const { templatePath, data, consumerRoot = process.cwd(), logger } = options;

  const facetDir = new FacetDirectory({ consumerRoot, templateFile: templatePath, logger });
  facetDir.create();
  facetDir.generatePackageJson();
  facetDir.symlinkConsumerFiles();
  facetDir.copyStylesCss();
  facetDir.copyViteDevLoader();
  facetDir.generateEntryWrapper();
  facetDir.generateTsConfig();
  facetDir.generateTailwindConfig();
  facetDir.generateClientScaffold(data);

  await installWithRetry(facetDir, logger);

  const facetRoot = facetDir.getFacetRoot();
  const loaderPath = join(facetRoot, 'vite-dev-loader.ts');

  logger.info('Starting Vite dev server for live render...');
  const proc = Bun.spawn(['bun', 'run', loaderPath, `--facet-root=${facetRoot}`], {
    cwd: facetRoot,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'inherit',
  });

  const url = await readHandshake(proc);
  logger.debug(`Vite dev server ready at ${url}`);

  return {
    url,
    close: async () => {
      try {
        if (proc.exitCode === null && proc.signalCode === null) {
          proc.kill();
          await proc.exited;
        }
      } catch (err) {
        logger.warn(`Failed to stop Vite dev server: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}

/** Read the dev server's stdout until the FACET_DEV_URL handshake line appears. */
async function readHandshake(proc: DevServerProcess): Promise<string> {
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const readLoop = (async () => {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        throw new Error('Vite dev server exited before emitting FACET_DEV_URL handshake');
      }
      buffer += decoder.decode(value, { stream: true });
      const line = buffer.split('\n').find((l) => l.startsWith(HANDSHAKE_PREFIX));
      if (line) return line.slice(HANDSHAKE_PREFIX.length).trim();
    }
  })();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Vite dev server failed to start within timeout (no FACET_DEV_URL handshake)')),
      STARTUP_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([readLoop, timeout]);
  } catch (err) {
    try { proc.kill(); } catch { /* best effort */ }
    throw err;
  } finally {
    clearTimeout(timer);
    try { reader.releaseLock(); } catch { /* best effort */ }
  }
}
