/**
 * Vite Builder for Dynamic Template Compilation
 *
 * Re-execs the CLI as an SSR loader subprocess (FACET_LOADER=ssr) with cwd set
 * to .facet/, so Vite resolves from .facet/node_modules and is never embedded
 * in the CLI bundle. Errors point to original .tsx files with full source maps.
 */

import { $ } from '../utils/shell.js';
import { spawn } from 'node:child_process';
import { selfExecBase } from '../utils/self-exec.js';
import { join } from 'path';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { Logger } from '../utils/logger.js';
import { FacetDirectory } from '../builders/facet-directory.js';
import { resolvePackageManager } from '../utils/package-manager.js';
import { RenderProfiler } from '../utils/performance.js';
import { computeTemplateBuildKey, pruneBuildCache } from './build-cache.js';
import { VERSION } from '../version-generated.js';
import { runPersistentSsrLoader } from './ssr-pool.js';

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
}

interface LoaderResult {
  html: string;
  css: string;
}

/**
 * Build template using Vite SSR mode (via external script)
 * Errors will point to original source files with full stack traces
 */
async function pnpmInstall(facetRoot: string, logger: Logger): Promise<void> {
  // --ignore-workspace: when the consumer is a pnpm workspace whose globs
  //   absorb .facet/, pnpm runs across "all N workspace projects" and ignores
  //   .facet/.npmrc. Treating .facet/ as standalone restores our config.
  // --config.confirmModulesPurge=false + CI=true: pnpm aborts with
  //   ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY when it wants to purge a
  //   foreign node_modules under a non-TTY shell (Bun's $). Both signals
  //   override .npmrc so this works even when workspace config wins.
  const result = await $`cd ${facetRoot} && CI=true pnpm install --ignore-workspace --ignore-scripts --config.confirmModulesPurge=false 2>&1`.quiet();
  logger.debug(result.stdout.toString());
}

function errorOutput(err: any): string {
  return err?.stdout?.toString?.() || err?.stderr?.toString?.() || err?.message || String(err);
}

export async function installWithRetry(facetDir: FacetDirectory, logger: Logger): Promise<void> {
  const facetRoot = facetDir.getFacetRoot();
  if (!facetDir.needsInstall()) {
    logger.debug('Dependencies up to date, skipping pnpm install');
    facetDir.linkConsumerNodeModules();
    return;
  }
  // Pre-nuke when the install is detectably broken (legacy symlinked
  // node_modules, foreign lockfile). Saves a guaranteed-to-fail first attempt
  // and prevents pnpm's ENOENT-on-mkdir when it tries to materialize into a
  // dangling symlink.
  if (facetDir.isInstallBroken()) {
    logger.info('Detected stale .facet/ install state, cleaning before install');
    facetDir.nukeInstall();
  }
  const pm = await resolvePackageManager(facetRoot);
  logger.info(`pnpm install (pnpm ${pm.version})...`);
  const t0 = Date.now();
  try {
    await pnpmInstall(facetRoot, logger);
  } catch (firstErr: any) {
    logger.warn(`pnpm install failed; nuking .facet/ and retrying once. Reason:\n${errorOutput(firstErr)}`);
    facetDir.nukeInstall();
    try {
      await pnpmInstall(facetRoot, logger);
    } catch (secondErr: any) {
      throw new Error(`pnpm install failed twice in ${facetRoot}:\n${errorOutput(secondErr)}`);
    }
  }
  logger.info(`pnpm install completed in ${Date.now() - t0}ms`);
  facetDir.linkConsumerNodeModules();
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

function runLoaderOnce(args: LoaderArgs): Promise<{ stderr?: Buffer | string; }> {
  const loaderArgs = [
    `--facet-root=${args.facetRoot}`,
    `--data-file=${args.dataFilePath}`,
    `--output-file=${args.resultFilePath}`,
    `--cache-key=${args.cacheKey}`,
  ];
  const settings = typeof args.sandbox === 'string' ? args.sandbox : '/etc/facet/srt-settings.json';
  const parts = args.sandbox
    ? ['srt', '--settings', settings, ...selfExecBase(), ...loaderArgs]
    : [...selfExecBase(), ...loaderArgs];
  const [cmd, ...argv] = parts;

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, argv, {
      cwd: args.facetRoot,
      env: { ...process.env, FACET_LOADER: 'ssr' },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const stderrChunks: Buffer[] = [];
    child.stderr?.on('data', (c: Buffer) => stderrChunks.push(c));
    child.on('error', reject);
    child.on('close', (code) => {
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
): Promise<LoaderResult> {
  try {
    const r = await runLoaderOnce(args);
    if (r.stderr != null && r.stderr.length > 0) console.error(r.stderr.toString());
    return JSON.parse(readFileSync(args.resultFilePath, 'utf-8'));
  } catch (firstErr: any) {
    const stderr = firstErr?.stderr?.toString?.() || '';
    if (!isMissingDepError(stderr)) {
      const raw = stderr || (firstErr instanceof Error ? firstErr.message : String(firstErr));
      throw new Error(`Vite SSR build failed:\n${deduplicateOutput(raw)}`);
    }
    logger.warn('Loader failed with missing-dep signature; rebuilding .facet/ once.');
    facetDir.nukeInstall();
    await installWithRetry(facetDir, logger);
    try {
      const r = await runLoaderOnce(args);
      if (r.stderr != null && r.stderr.length > 0) console.error(r.stderr.toString());
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
  const buildCacheKey = computeTemplateBuildKey(consumerRoot, VERSION, templatePath);

  logger.debug(`Building template: ${templatePath}`);

  // Setup .facet/ directory
  const facetDir = new FacetDirectory({
    consumerRoot,
    templateFile: templatePath,
    logger,
  });

  facetDir.create();
  facetDir.generatePackageJson();

  const facetRoot = facetDir.getFacetRoot();

  facetDir.symlinkConsumerFiles();
  facetDir.copyStylesCss();
  facetDir.generateEntryWrapper();
  facetDir.generateTsConfig();
  facetDir.generateViteConfig();
  facetDir.generatePostCSSConfig();
  facetDir.generateTailwindConfig();

  // Install dependencies with pnpm. pnpm's content-addressable store gives
  // us fast reuse across renders — no facet-side cache needed.
  await profiler.measure('dependencies', () => installWithRetry(facetDir, logger));

  // Re-exec the CLI as an SSR loader subprocess (Vite runs from .facet/).
  logger.info('Loading template with Vite SSR...');
  const tmpDir = mkdtempSync(join(tmpdir(), 'facet-'));
  const dataFilePath = join(tmpDir, 'data.json');
  const resultFilePath = join(tmpDir, 'result.json');
  writeFileSync(dataFilePath, JSON.stringify(data));
  try {
    const loaderResult = await profiler.measure('vite-ssr-and-react-render', async () => {
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
      );
    });
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
