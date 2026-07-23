/**
 * Vite Builder for Dynamic Template Compilation
 *
 * Re-execs the CLI as an SSR loader subprocess (FACET_LOADER=ssr) with cwd set
 * to .facet/, so Vite resolves from .facet/node_modules and is never embedded
 * in the CLI bundle. Errors point to original .tsx files with full source maps.
 */

import { selfExecBase } from '../utils/self-exec.js';
import { join, resolve } from 'path';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { Logger } from '../utils/logger.js';
import { FacetDirectory, resolveFacetPackageOverride } from '../builders/facet-directory.js';
import { readRemarkFrontmatter } from '../utils/frontmatter.js';
import { RenderProfiler, RenderTimings } from '../utils/performance.js';
import { computeTemplateBuildKey, pruneBuildCache } from './build-cache.js';
import { VERSION } from '../version-generated.js';
import { runPersistentSsrLoader } from './ssr-pool.js';
import { assetPath } from '../utils/assets.js';
import { ensureGlobalModuleStore, prepareProjectModules } from './module-store.js';
import { spawnLowPriority } from '../utils/subprocess-priority.js';

export interface BuildResult {
  html: string;
  css: string;
  buildCacheKey: string;
  facetRoot: string;
  cleanup: () => Promise<void>;
}

export interface BuildOptions {
  templatePath: string;
  data: Record<string, unknown>;
  consumerRoot?: string;
  logger: Logger;
  sandbox?: string | boolean;
  persistentLoader?: boolean;
  timings?: RenderTimings;
  timingPhase?: 'vite' | 'header-generation';
  skipModules?: boolean;
}

interface LoaderResult {
  html: string;
  css: string;
}

/**
 * Build template using Vite SSR mode (via external script)
 * Errors will point to original source files with full stack traces
 */
export async function prepareModules(
  facetDir: FacetDirectory,
  logger: Logger,
  skipModules = false,
): Promise<void> {
  const facetRoot = facetDir.getFacetRoot();
  const facetPackage = JSON.parse(readFileSync(assetPath('package.json'), 'utf-8'));
  const override = resolveFacetPackageOverride();
  const seed = await ensureGlobalModuleStore({
    facetVersion: VERSION,
    facetPackage,
    logger,
    facetTarball: skipModules && override?.kind === 'tarball' ? override.path : undefined,
  });
  await prepareProjectModules({
    consumerRoot: resolve(facetRoot, '..'),
    facetRoot,
    seed,
    logger,
    skipModules,
  });
  if (!skipModules) facetDir.linkConsumerNodeModules();
}

// Patterns that indicate the loader failed because a *package* (not a relative
// path) couldn't be resolved — i.e. node_modules looks broken. Relative-path
// resolve failures (`./foo.css`) are template bugs and would not be fixed by
// reinstalling, so isMissingDepError() filters those out.
const RUNTIME_REINSTALL_PATTERNS = [
  /Cannot find module ['"][^.\/][^'"]*['"]/i,
  /ERR_MODULE_NOT_FOUND/,
  /Failed to resolve import ['"][^.\/][^'"]*['"]/i,
  /Failed to resolve entry/i,
  /Could not resolve ['"][^.\/][^'"]*['"] from/i,
  /Rollup failed to resolve(?: import)? ['"][^.\/][^'"]*['"]/i,
];

export function isMissingDepError(stderr: string): boolean {
  return RUNTIME_REINSTALL_PATTERNS.some(rx => rx.test(stderr));
}

interface LoaderArgs {
  facetRoot: string;
  dataFilePath: string;
  resultFilePath: string;
  cacheKey: string;
  sandbox?: string | boolean;
}

// One-shot loaders orphaned by a dying parent keep burning CPU/memory for the
// rest of their build. Reap them on parent exit and on TERM/INT.
const liveLoaders = new Set<import('node:child_process').ChildProcess>();
let loaderReaperInstalled = false;

function installLoaderReaper(): void {
  if (loaderReaperInstalled) return;
  loaderReaperInstalled = true;
  const reap = (): void => {
    for (const child of liveLoaders) child.kill('SIGKILL');
    liveLoaders.clear();
  };
  process.on('exit', reap);
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      reap();
      process.exit(signal === 'SIGTERM' ? 143 : 130);
    });
  }
}

function runLoaderOnce(args: LoaderArgs, logger: Logger): Promise<{ stderr?: Buffer | string; }> {
  const loaderArgs = [
    `--facet-root=${args.facetRoot}`,
    `--data-file=${args.dataFilePath}`,
    `--output-file=${args.resultFilePath}`,
    `--cache-key=${args.cacheKey}`,
    `--verbosity=${logger.verbosity()}`,
  ];
  const settings = typeof args.sandbox === 'string' ? args.sandbox : '/etc/facet/srt-settings.json';
  const parts = args.sandbox
    ? ['srt', '--settings', settings, ...selfExecBase(), ...loaderArgs]
    : [...selfExecBase(), ...loaderArgs];
  const [cmd, ...argv] = parts;

  return new Promise((resolve, reject) => {
    installLoaderReaper();
    const child = spawnLowPriority({
      command: cmd,
      args: argv,
      options: {
        cwd: args.facetRoot,
        env: { ...process.env, FACET_LOADER: 'ssr' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    });
    liveLoaders.add(child);
    // A slow loader with buffered-only output is indistinguishable from a hang:
    // tee everything live (stderr also stays captured for missing-dep retry
    // detection and error messages), and heartbeat in case Vite prints nothing.
    const startedAt = performance.now();
    const heartbeat = setInterval(() => {
      logger.info(`Vite SSR build still running (${Math.round((performance.now() - startedAt) / 1000)}s)...`);
    }, 15_000);
    heartbeat.unref();
    const stderrChunks: Buffer[] = [];
    child.stdout?.on('data', (c: Buffer) => process.stderr.write(c));
    child.stderr?.on('data', (c: Buffer) => {
      stderrChunks.push(c);
      process.stderr.write(c);
    });
    child.on('error', (error) => {
      clearInterval(heartbeat);
      liveLoaders.delete(child);
      reject(error);
    });
    child.on('close', (code) => {
      clearInterval(heartbeat);
      liveLoaders.delete(child);
      const stderr = Buffer.concat(stderrChunks);
      if (code !== 0) {
        const err = new Error(`SSR loader exited with code ${code}`) as Error & { stderr: Buffer };
        err.stderr = stderr;
        reject(err);
        return;
      }
      resolve({ stderr });
    });
  });
}

async function runLoaderWithRetry(
  facetDir: FacetDirectory,
  args: LoaderArgs,
  logger: Logger,
  skipModules: boolean,
): Promise<LoaderResult> {
  try {
    await runLoaderOnce(args, logger);
    return JSON.parse(readFileSync(args.resultFilePath, 'utf-8'));
  } catch (firstErr: any) {
    const stderr = firstErr?.stderr?.toString?.() || '';
    if (!isMissingDepError(stderr)) {
      const raw = stderr || (firstErr instanceof Error ? firstErr.message : String(firstErr));
      throw new Error(`Vite SSR build failed:\n${deduplicateOutput(raw)}`);
    }
    if (skipModules) {
      const raw = stderr || (firstErr instanceof Error ? firstErr.message : String(firstErr));
      throw new Error(
        `Vite could not resolve a module while --skip-modules is active. ` +
        `This mode only provides Facet's default packages; rerun without --skip-modules for consumer dependencies.\n${deduplicateOutput(raw)}`,
      );
    }
    logger.warn('Loader failed with missing-dep signature; rebuilding .facet/ once.');
    facetDir.nukeInstall();
    await prepareModules(facetDir, logger);
    try {
      await runLoaderOnce(args, logger);
      return JSON.parse(readFileSync(args.resultFilePath, 'utf-8'));
    } catch (secondErr: any) {
      const out = secondErr?.stderr?.toString?.() || String(secondErr);
      throw new Error(`Vite SSR build failed after .facet/ rebuild:\n${deduplicateOutput(out)}`);
    }
  }
}

const buildLocks = new Map<string, Promise<void>>();

async function withBuildLock<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = buildLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.catch(() => undefined).then(() => current);
  buildLocks.set(key, tail);
  await previous.catch(() => undefined);
  try {
    return await action();
  } finally {
    release();
    if (buildLocks.get(key) === tail) buildLocks.delete(key);
  }
}

export function buildTemplate(options: BuildOptions): Promise<BuildResult> {
  const consumerRoot = options.consumerRoot ?? process.cwd();
  return withBuildLock(join(consumerRoot, '.facet'), () => buildTemplateUnlocked(options));
}

async function buildTemplateUnlocked(options: BuildOptions): Promise<BuildResult> {
  const { templatePath, data, consumerRoot = process.cwd(), logger } = options;
  const profiler = new RenderProfiler('template-build', logger);
  const timings = options.timings ?? new RenderTimings();

  logger.debug(`Building template: ${templatePath}`);

  // Setup .facet/ directory
  const facetDir = new FacetDirectory({
    consumerRoot,
    templateFile: templatePath,
    logger,
    remarkConfig: readRemarkFrontmatter(resolve(consumerRoot, templatePath)),
    skipModules: options.skipModules,
  });

  await profiler.measure('scaffold', async () => {
    facetDir.create();
    await facetDir.generatePackageJson();
    facetDir.symlinkConsumerFiles();
    facetDir.copyStylesCss();
    facetDir.generateEntryWrapper();
    facetDir.generateTsConfig();
    facetDir.generateViteConfig();
    facetDir.generatePostCSSConfig();
    facetDir.generateTailwindConfig();
  });

  // Keyed after scaffolding so the generated config participates: a config
  // change at an unchanged facet version must not reuse stale SSR bundles.
  const buildCacheKey = await profiler.measure('build-cache-key', async () => computeTemplateBuildKey({
    consumerRoot,
    facetVersion: VERSION,
    templatePath,
    skipModules: options.skipModules,
    extraDigest: facetDir.generatedConfigDigest(),
    onStats: (stats) => logger.debug(
      `Build key digest: ${stats.fileCount} files walked in ${stats.walkMs}ms, `
      + (stats.contentReused ? 'content digest reused' : `${stats.contentBytes} bytes hashed`)
      + `, total ${stats.totalMs}ms`,
    ),
  }));

  const facetRoot = facetDir.getFacetRoot();

  // Link the immutable shared store directly, or clone it and reconcile the
  // generated project manifest when consumer dependencies are enabled.
  await timings.measure('dependency-install', () =>
    profiler.measure('dependencies', () => prepareModules(facetDir, logger, options.skipModules)));

  // Re-exec the CLI as an SSR loader subprocess (Vite runs from .facet/).
  logger.info('Loading template with Vite SSR...');
  const tmpDir = mkdtempSync(join(tmpdir(), 'facet-'));
  const dataFilePath = join(tmpDir, 'data.json');
  const resultFilePath = join(tmpDir, 'result.json');
  writeFileSync(dataFilePath, JSON.stringify(data));
  try {
    const loaderResult = await timings.measure(options.timingPhase ?? 'vite', () =>
      profiler.measure('vite-ssr-and-react-render', async () => {
        if (options.persistentLoader && !options.sandbox) {
          try {
            return await runPersistentSsrLoader({ facetRoot, cacheKey: buildCacheKey, data }, logger);
          } catch (error) {
            logger.warn(`Persistent SSR loader failed; falling back to one-shot loader: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        return runLoaderWithRetry(
          facetDir,
          { facetRoot, dataFilePath, resultFilePath, cacheKey: buildCacheKey, sandbox: options.sandbox },
          logger,
          options.skipModules ?? false,
        );
      }));
    pruneBuildCache(join(facetRoot, 'build-cache'));
    logger.debug(`Rendered HTML: ${loaderResult.html.length} bytes, CSS: ${loaderResult.css.length} bytes`);
    return {
      html: loaderResult.html,
      css: loaderResult.css,
      buildCacheKey,
      facetRoot,
      cleanup: async () => {
        logger.debug('Cleanup complete');
      },
    };
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    profiler.finish();
  }
}

function deduplicateOutput(text: string): string {
  // Bun shell errors sometimes contain stderr twice back-to-back.
  // Check if the output is two identical halves and return just one.
  const trimmed = text.trim();
  const len = trimmed.length;
  if (len < 40) return trimmed;
  const mid = Math.ceil(len / 2);
  // Try splitting at a newline near the midpoint
  for (let i = mid - 5; i <= mid + 5 && i < len; i++) {
    if (trimmed[i] === '\n') {
      const first = trimmed.substring(0, i).trim();
      const second = trimmed.substring(i + 1).trim();
      if (first === second) return first;
    }
  }
  return trimmed;
}
