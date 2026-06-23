/**
 * Vite Dev Server (live render path)
 *
 * Scaffolds .facet/ exactly like the SSR builder, then re-execs the CLI as a
 * dev-server loader subprocess (FACET_LOADER=dev, cwd .facet/) so Vite runs from
 * .facet/node_modules. Returns the served URL so a browser can render the
 * template with a live DOM — required for diagram components (react-xarrows).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { Logger } from '../utils/logger.js';
import { FacetDirectory } from '../builders/facet-directory.js';
import { installWithRetry } from './vite-builder.js';
import { selfExecBase } from '../utils/self-exec.js';

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
  facetDir.generateEntryWrapper();
  facetDir.generateTsConfig();
  facetDir.generateTailwindConfig();
  facetDir.generateClientScaffold(data);

  await installWithRetry(facetDir, logger);

  const facetRoot = facetDir.getFacetRoot();

  logger.info('Starting Vite dev server for live render...');
  const [cmd, ...baseArgs] = selfExecBase();
  const proc = spawn(cmd, [...baseArgs, `--facet-root=${facetRoot}`], {
    cwd: facetRoot,
    env: { ...process.env, FACET_LOADER: 'dev' },
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
function readHandshake(proc: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => {
        try { proc.kill(); } catch { /* best effort */ }
        reject(new Error('Vite dev server failed to start within timeout (no FACET_DEV_URL handshake)'));
      });
    }, STARTUP_TIMEOUT_MS);

    proc.stdout?.setEncoding('utf-8');
    proc.stdout?.on('data', (chunk: string) => {
      buffer += chunk;
      const line = buffer.split('\n').find((l) => l.startsWith(HANDSHAKE_PREFIX));
      if (line) finish(() => resolve(line.slice(HANDSHAKE_PREFIX.length).trim()));
    });
    proc.once('exit', () => {
      finish(() => reject(new Error('Vite dev server exited before emitting FACET_DEV_URL handshake')));
    });
    proc.once('error', (err) => finish(() => reject(err)));
  });
}
