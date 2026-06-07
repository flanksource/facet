/**
 * Vite Dev Server (live render path)
 *
 * Scaffolds .facet/ exactly like the SSR builder, then boots a Vite dev server
 * (via vite-dev-loader.ts, run with tsx from .facet/node_modules) instead of an
 * SSR build. Returns the served URL so a browser can render the template with a
 * live DOM — required for diagram components (react-xarrows) that measure rects.
 */

import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { once } from 'node:events';
import type { Readable } from 'node:stream';
import { join } from 'path';

type DevServerProcess = ChildProcessByStdio<null, Readable, null>;
import { Logger } from '../utils/logger.js';
import { FacetDirectory } from '../builders/facet-directory.js';
import { installWithRetry, resolveTsxBin } from './vite-builder.js';

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
  const [tsxCmd, ...tsxArgs] = resolveTsxBin(facetRoot);
  const proc = spawn(tsxCmd, [...tsxArgs, loaderPath, `--facet-root=${facetRoot}`], {
    cwd: facetRoot,
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  const url = await readHandshake(proc);
  logger.debug(`Vite dev server ready at ${url}`);

  return {
    url,
    close: async () => {
      try {
        if (proc.exitCode === null && proc.signalCode === null) {
          proc.kill();
          await once(proc, 'exit');
        }
      } catch (err) {
        logger.warn(`Failed to stop Vite dev server: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}

/** Read the dev server's stdout until the FACET_DEV_URL handshake line appears. */
function readHandshake(proc: DevServerProcess): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => {
      cleanup();
      try { proc.kill(); } catch { /* best effort */ }
      reject(new Error('Vite dev server failed to start within timeout (no FACET_DEV_URL handshake)'));
    }, STARTUP_TIMEOUT_MS);

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      const line = buffer.split('\n').find((l) => l.startsWith(HANDSHAKE_PREFIX));
      if (line) {
        cleanup();
        resolve(line.slice(HANDSHAKE_PREFIX.length).trim());
      }
    };
    const onExit = () => {
      cleanup();
      reject(new Error('Vite dev server exited before emitting FACET_DEV_URL handshake'));
    };
    function cleanup() {
      clearTimeout(timer);
      proc.stdout.off('data', onData);
      proc.off('exit', onExit);
    }

    proc.stdout.on('data', onData);
    proc.on('exit', onExit);
  });
}
