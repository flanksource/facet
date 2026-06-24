/**
 * `facet doctor` — environment preflight.
 *
 * Catches the common classes of failure that send users into minified stack
 * traces: wrong-arch native bindings, missing pnpm, missing Chromium, stale
 * FACET_PACKAGE_PATH, CLI↔declared-facet version drift, and private-registry
 * auth leakage into .facet/.
 */

import { $ } from '../utils/shell.js';
import { existsSync, readFileSync, readdirSync, statSync, appendFileSync, rmSync } from 'fs';
import { spawnSync } from 'node:child_process';
import { join } from 'path';
import chalk from 'chalk';
import semver from 'semver';
import { Logger } from '../utils/logger.js';
import { resolvePackageManager } from '../utils/package-manager.js';
import { resolveChromePath } from '../utils/pdf-generator.js';
import { resolveTailwindBin, tailwindBinExists } from '../utils/tailwind.js';
import { VERSION } from '../version-generated.js';
import { assetPath } from '../utils/assets.js';

type CheckStatus = 'pass' | 'warn' | 'fail';

interface CheckResult {
  id: string;
  name: string;
  status: CheckStatus;
  message: string;
  hint?: string;
}

interface DoctorOptions {
  consumerRoot: string;
  verbose: boolean;
  json: boolean;
  fix?: boolean;
}

const CRITICAL_NATIVE_PACKAGES = [
  '@rollup/rollup',
  '@esbuild',
  'lightningcss',
  '@swc/core',
];

type CheckFn = (consumerRoot: string) => CheckResult | Promise<CheckResult>;

// Ordered registry — same sequence as the human-readable output below.
const CHECK_REGISTRY: ReadonlyArray<readonly [string, CheckFn]> = [
  ['node-version', () => checkNodeVersion()],
  ['architecture', () => checkArchitecture()],
  ['pnpm', (root) => checkPnpm(root)],
  ['native-bindings', (root) => checkNativeBindings(root)],
  ['chromium', () => checkChromium()],
  ['git', () => checkGit()],
  ['tar', () => checkTar()],
  ['tsx', () => checkTsx()],
  ['tailwindcss', (root) => checkTailwindBin(root)],
  ['facet-package-path', () => checkFacetPackagePath()],
  ['facet-version', (root) => checkFacetVersionAlignment(root)],
  ['npmrc-leakage', (root) => checkNpmrcLeakage(root)],
];

async function runAllChecks(consumerRoot: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const [, fn] of CHECK_REGISTRY) {
    results.push(await fn(consumerRoot));
  }
  return results;
}

async function runCheckById(id: string, consumerRoot: string): Promise<CheckResult | undefined> {
  const entry = CHECK_REGISTRY.find(([k]) => k === id);
  return entry ? await entry[1](consumerRoot) : undefined;
}

export class PreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreflightError';
  }
}

/**
 * Verify the external tools a command needs are present before doing any work,
 * aggregating every problem into one actionable error instead of failing deep
 * in the render pipeline. A required check that is not `pass` (missing tool,
 * wrong arch, ...) blocks. `run` is injectable for testing.
 */
export async function preflight(
  requiredIds: string[],
  consumerRoot: string,
  run: (id: string, root: string) => Promise<CheckResult | undefined> = runCheckById,
): Promise<void> {
  const failures: CheckResult[] = [];
  for (const id of requiredIds) {
    const result = await run(id, consumerRoot);
    if (result && result.status !== 'pass') failures.push(result);
  }
  if (failures.length === 0) return;

  const lines = failures.map(f => {
    const hint = f.hint ? `\n      ${f.hint}` : '';
    return `  ✗ ${f.name}: ${f.message}${hint}`;
  });
  const noun = failures.length === 1 ? 'dependency is' : 'dependencies are';
  throw new PreflightError(
    `${failures.length} required ${noun} missing or misconfigured:\n\n` +
    `${lines.join('\n')}\n\n` +
    'Run `facet doctor` for a full environment report.',
  );
}

export async function runDoctor(options: DoctorOptions): Promise<number> {
  const logger = new Logger(options.verbose);
  let results = await runAllChecks(options.consumerRoot);

  if (options.fix) {
    results = await applyFixes(results, options.consumerRoot, logger);
  }

  if (options.json) {
    process.stdout.write(JSON.stringify({ results }, null, 2) + '\n');
  } else {
    renderHuman(results, logger);
  }

  return results.some(r => r.status === 'fail') ? 1 : 0;
}

async function applyFixes(results: CheckResult[], consumerRoot: string, logger: Logger): Promise<CheckResult[]> {
  const fixed = [...results];
  for (let i = 0; i < fixed.length; i++) {
    const r = fixed[i];
    if (r.status !== 'fail') continue;
    const after = await tryFix(r.id, consumerRoot, logger);
    if (after) fixed[i] = after;
  }
  return fixed;
}

async function tryFix(id: string, consumerRoot: string, logger: Logger): Promise<CheckResult | undefined> {
  switch (id) {
    case 'pnpm': {
      logger.info('[fix] running `corepack enable pnpm`');
      try { await $`corepack enable pnpm`.quiet(); } catch (err) {
        logger.warn(`[fix] corepack enable pnpm failed: ${err instanceof Error ? err.message : String(err)}`);
        return undefined;
      }
      return await runCheckById('pnpm', consumerRoot);
    }
    case 'chromium': {
      logger.info('[fix] running `npx puppeteer browsers install chrome`');
      try { await $`npx puppeteer browsers install chrome`.quiet(); } catch (err) {
        logger.warn(`[fix] puppeteer install failed: ${err instanceof Error ? err.message : String(err)}`);
        return undefined;
      }
      return await runCheckById('chromium', consumerRoot);
    }
    case 'native-bindings': {
      const target = join(consumerRoot, '.facet', 'node_modules');
      const lock = join(consumerRoot, '.facet', 'pnpm-lock.yaml');
      logger.info(`[fix] removing ${target} and ${lock}`);
      try {
        rmSync(target, { recursive: true, force: true });
        rmSync(lock, { force: true });
      } catch (err) {
        logger.warn(`[fix] cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
        return undefined;
      }
      return await runCheckById('native-bindings', consumerRoot);
    }
    case 'npmrc-leakage': {
      const gitignore = join(consumerRoot, '.gitignore');
      if (!existsSync(gitignore)) {
        logger.warn(`[fix] no .gitignore at ${gitignore}; not creating one automatically`);
        return undefined;
      }
      const current = readFileSync(gitignore, 'utf-8');
      const hasEntry = current.split(/\r?\n/).some(line => {
        const t = line.trim();
        return t === '.facet' || t === '.facet/' || t === '/.facet' || t === '/.facet/';
      });
      if (!hasEntry) {
        const sep = current.endsWith('\n') ? '' : '\n';
        appendFileSync(gitignore, `${sep}.facet/\n`);
        logger.info(`[fix] appended \`.facet/\` to ${gitignore}`);
      } else {
        logger.info(`[fix] .gitignore already lists .facet — nothing to append`);
      }
      return await runCheckById('npmrc-leakage', consumerRoot);
    }
    default:
      // node-version, architecture, facet-package-path, facet-version: not auto-fixable.
      logger.warn(`[fix] ${id}: manual fix required`);
      return undefined;
  }
}

function renderHuman(results: CheckResult[], logger: Logger): void {
  for (const r of results) {
    const mark = r.status === 'pass'
      ? chalk.green('✓')
      : r.status === 'warn'
        ? chalk.yellow('⚠')
        : chalk.red('✗');
    logger.log(`${mark} ${chalk.bold(r.name)}: ${r.message}`);
    if (r.hint) logger.log(`  ${chalk.gray('→')} ${chalk.gray(r.hint)}`);
  }
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  if (failed > 0) {
    logger.error(`${failed} check(s) failed, ${warned} warning(s)`);
  } else if (warned > 0) {
    logger.warn(`All checks passed with ${warned} warning(s)`);
  } else {
    logger.success('All checks passed');
  }
}

function checkNodeVersion(): CheckResult {
  const required = readRootEnginesNode();
  const current = process.versions.node;
  if (!required) {
    return {
      id: 'node-version',
      name: 'Node version',
      status: 'pass',
      message: `${current} (no engines.node declared in facet root; skipping check)`,
    };
  }
  if (semver.satisfies(current, required)) {
    return {
      id: 'node-version',
      name: 'Node version',
      status: 'pass',
      message: `${current} satisfies facet's requirement ${required}`,
    };
  }
  return {
    id: 'node-version',
    name: 'Node version',
    status: 'fail',
    message: `${current} does not satisfy facet's requirement ${required}`,
    hint: `Upgrade Node: \`nvm install ${required}\` or equivalent.`,
  };
}

function readRootEnginesNode(): string | undefined {
  try {
    const raw = readFileSync(assetPath('package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    return pkg?.engines?.node;
  } catch {
    return undefined;
  }
}

function checkArchitecture(): CheckResult {
  const arch = process.arch;
  const platform = process.platform;
  // Rosetta detection: process.arch reports x64 but the machine reports arm64.
  // best effort — `uname` may be absent on some platforms.
  let hostArch: string = arch;
  try {
    hostArch = (spawnSync('uname', ['-m'], { encoding: 'utf-8' }).stdout ?? '').trim();
  } catch { /* fall through */ }

  const rosetta = platform === 'darwin' && arch === 'x64' && hostArch === 'arm64';
  if (rosetta) {
    return {
      id: 'architecture',
      name: 'Architecture',
      status: 'fail',
      message: `Running under Rosetta: process.arch=${arch}, host=${hostArch}`,
      hint: 'Install an arm64 Node (`nvm install --lts --arch arm64`) and re-run without Rosetta.',
    };
  }
  return {
    id: 'architecture',
    name: 'Architecture',
    status: 'pass',
    message: `${platform}/${arch}`,
  };
}

async function checkPnpm(consumerRoot: string): Promise<CheckResult> {
  try {
    const pm = await resolvePackageManager(consumerRoot);
    return {
      id: 'pnpm',
      name: 'pnpm',
      status: 'pass',
      message: `pnpm ${pm.version}`,
    };
  } catch (err) {
    return {
      id: 'pnpm',
      name: 'pnpm',
      status: 'fail',
      message: err instanceof Error ? err.message : String(err),
      hint: 'Install: `npm i -g pnpm` or `corepack enable`.',
    };
  }
}

function checkNativeBindings(consumerRoot: string): CheckResult {
  const facetRoot = join(consumerRoot, '.facet');
  const pnpmDir = join(facetRoot, 'node_modules', '.pnpm');
  if (!existsSync(pnpmDir)) {
    return {
      id: 'native-bindings',
      name: 'Native bindings',
      status: 'warn',
      message: '.facet/node_modules/.pnpm not yet installed — run a render first to populate.',
    };
  }
  let entries: string[];
  try {
    entries = readdirSync(pnpmDir);
  } catch (err) {
    return {
      id: 'native-bindings',
      name: 'Native bindings',
      status: 'warn',
      message: `Could not enumerate ${pnpmDir}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const expectedSuffix = `-${process.platform}-${process.arch}`;
  const missing: string[] = [];
  for (const prefix of CRITICAL_NATIVE_PACKAGES) {
    const matches = entries.filter(e => e.startsWith(prefix.replace('/', '+')) || e.startsWith(prefix));
    if (matches.length === 0) continue;
    const archMatch = matches.some(m => m.includes(expectedSuffix));
    if (!archMatch) missing.push(prefix);
  }
  if (missing.length === 0) {
    return {
      id: 'native-bindings',
      name: 'Native bindings',
      status: 'pass',
      message: `${process.platform}/${process.arch} bindings present for all critical packages`,
    };
  }
  return {
    id: 'native-bindings',
    name: 'Native bindings',
    status: 'fail',
    message: `Missing ${process.platform}-${process.arch} bindings for: ${missing.join(', ')}`,
    hint: `rm -rf ${facetRoot}/node_modules && re-run facet. Likely caused by install under Rosetta or a different Node arch.`,
  };
}

function checkChromium(): CheckResult {
  const chromePath = resolveChromePath();
  if (chromePath && existsSync(chromePath)) {
    return {
      id: 'chromium',
      name: 'Chromium',
      status: 'pass',
      message: chromePath,
    };
  }
  return {
    id: 'chromium',
    name: 'Chromium',
    status: 'fail',
    message: 'No Chromium/Chrome binary resolvable via PUPPETEER_EXECUTABLE_PATH, CHROME_PATH, or system paths',
    hint: 'Set PUPPETEER_EXECUTABLE_PATH=/path/to/chrome, or `npx puppeteer browsers install chrome`.',
  };
}

function checkFacetPackagePath(): CheckResult {
  const p = process.env.FACET_PACKAGE_PATH;
  if (!p) {
    return {
      id: 'facet-package-path',
      name: 'FACET_PACKAGE_PATH',
      status: 'pass',
      message: 'unset (using registry/rootPackage version)',
    };
  }
  if (!existsSync(p)) {
    return {
      id: 'facet-package-path',
      name: 'FACET_PACKAGE_PATH',
      status: 'fail',
      message: `${p} does not exist`,
      hint: 'Either unset FACET_PACKAGE_PATH or point it at an existing directory or .tgz tarball.',
    };
  }
  const s = statSync(p);
  if (s.isDirectory()) {
    if (!existsSync(join(p, 'package.json'))) {
      return {
        id: 'facet-package-path',
        name: 'FACET_PACKAGE_PATH',
        status: 'fail',
        message: `${p} is a directory but has no package.json`,
        hint: 'Point FACET_PACKAGE_PATH at the root of the facet checkout.',
      };
    }
    return { id: 'facet-package-path', name: 'FACET_PACKAGE_PATH', status: 'pass', message: `dir ${p}` };
  }
  if (p.endsWith('.tgz') || p.endsWith('.tar.gz')) {
    return { id: 'facet-package-path', name: 'FACET_PACKAGE_PATH', status: 'pass', message: `tarball ${p}` };
  }
  return {
    id: 'facet-package-path',
    name: 'FACET_PACKAGE_PATH',
    status: 'warn',
    message: `${p} is not a directory or .tgz — pnpm may reject it`,
  };
}

function checkFacetVersionAlignment(consumerRoot: string): CheckResult {
  const consumerPkg = join(consumerRoot, 'package.json');
  if (!existsSync(consumerPkg)) {
    return { id: 'facet-version', name: 'facet version alignment', status: 'pass', message: 'no consumer package.json' };
  }
  try {
    const pkg = JSON.parse(readFileSync(consumerPkg, 'utf-8'));
    const declared = pkg.dependencies?.['@flanksource/facet'] ?? pkg.devDependencies?.['@flanksource/facet'];
    if (!declared) {
      return {
        id: 'facet-version',
        name: 'facet version alignment',
        status: 'pass',
        message: `no declared dep (CLI ${VERSION})`,
      };
    }
    if (declared.startsWith('file:') || declared.startsWith('link:') || declared.startsWith('portal:') || declared.startsWith('workspace:')) {
      return {
        id: 'facet-version',
        name: 'facet version alignment',
        status: 'pass',
        message: `consumer uses local path "${declared}" (CLI ${VERSION})`,
      };
    }
    const coerced = semver.coerce(declared);
    if (!coerced) {
      return {
        id: 'facet-version',
        name: 'facet version alignment',
        status: 'warn',
        message: `declared range "${declared}" not parseable; can't compare against CLI ${VERSION}`,
      };
    }
    if (semver.major(coerced) !== semver.major(VERSION)) {
      return {
        id: 'facet-version',
        name: 'facet version alignment',
        status: 'warn',
        message: `CLI is ${VERSION} but consumer declares "${declared}" — major mismatch`,
        hint: 'Align the version pin with the CLI you run, or set FACET_PACKAGE_PATH to force source usage.',
      };
    }
    return {
      id: 'facet-version',
      name: 'facet version alignment',
      status: 'pass',
      message: `declared "${declared}", CLI ${VERSION}`,
    };
  } catch (err) {
    return {
      id: 'facet-version',
      name: 'facet version alignment',
      status: 'warn',
      message: `failed to read consumer package.json: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function checkNpmrcLeakage(consumerRoot: string): CheckResult {
  const facetNpmrc = join(consumerRoot, '.facet', '.npmrc');
  if (!existsSync(facetNpmrc)) {
    return { id: 'npmrc-leakage', name: '.facet/.npmrc leakage', status: 'pass', message: 'no .facet/.npmrc yet' };
  }
  let raw = '';
  try {
    raw = readFileSync(facetNpmrc, 'utf-8');
  } catch {
    return { id: 'npmrc-leakage', name: '.facet/.npmrc leakage', status: 'warn', message: 'could not read .facet/.npmrc' };
  }
  const hasSecret = /_authToken|_password|_auth|certfile|keyfile/.test(raw);
  if (!hasSecret) {
    return { id: 'npmrc-leakage', name: '.facet/.npmrc leakage', status: 'pass', message: 'no auth tokens detected' };
  }
  const gitignore = join(consumerRoot, '.gitignore');
  let ignored = false;
  try {
    if (existsSync(gitignore)) {
      const g = readFileSync(gitignore, 'utf-8');
      ignored = g.split(/\r?\n/).some(line => {
        const t = line.trim();
        return t === '.facet' || t === '.facet/' || t === '/.facet' || t === '/.facet/';
      });
    }
  } catch { /* noop */ }
  if (!ignored) {
    return {
      id: 'npmrc-leakage',
      name: '.facet/.npmrc leakage',
      status: 'fail',
      message: '.facet/.npmrc has auth tokens but `.facet/` is not gitignored',
      hint: 'Add `.facet/` to .gitignore before committing.',
    };
  }
  return {
    id: 'npmrc-leakage',
    name: '.facet/.npmrc leakage',
    status: 'pass',
    message: 'auth tokens present but .facet/ is gitignored',
  };
}

// Optional/lazy-binary probes. Each WARNs (never FAILs) on missing because
// the binary is only required for a specific facet workflow.

async function probeOptionalBin(name: string, args: string[]): Promise<{ ok: true; output: string } | { ok: false }> {
  try {
    const out = await $`${name} ${args}`.quiet();
    return { ok: true, output: out.stdout.toString().trim() };
  } catch {
    return { ok: false };
  }
}

async function checkGit(): Promise<CheckResult> {
  const probe = await probeOptionalBin('git', ['--version']);
  if (probe.ok) {
    return { id: 'git', name: 'git', status: 'pass', message: probe.output };
  }
  return {
    id: 'git',
    name: 'git',
    status: 'warn',
    message: 'not on PATH',
    hint: 'Required only for `github:` / `https://` template refs. Install: `brew install git` / `apt install git`.',
  };
}

async function checkTar(): Promise<CheckResult> {
  const probe = await probeOptionalBin('tar', ['--version']);
  if (probe.ok) {
    return { id: 'tar', name: 'tar', status: 'pass', message: probe.output.split('\n')[0] };
  }
  return {
    id: 'tar',
    name: 'tar',
    status: 'warn',
    message: 'not on PATH',
    hint: 'Required only for server-mode `.tar.gz` uploads (`facet serve`).',
  };
}

async function checkTsx(): Promise<CheckResult> {
  const probe = await probeOptionalBin('tsx', ['--version']);
  if (probe.ok) {
    return { id: 'tsx', name: 'tsx', status: 'pass', message: probe.output.split('\n')[0] };
  }
  return {
    id: 'tsx',
    name: 'tsx',
    status: 'warn',
    message: 'not on PATH',
    hint: 'Required only for `.ts` data loaders (`-l file.ts`). Install: `npm i -g tsx`.',
  };
}

function checkTailwindBin(consumerRoot: string): CheckResult {
  const facetRoot = join(consumerRoot, '.facet');
  const bin = resolveTailwindBin(facetRoot);
  if (tailwindBinExists(facetRoot)) {
    return { id: 'tailwindcss', name: 'tailwindcss (.facet bin)', status: 'pass', message: bin };
  }
  return {
    id: 'tailwindcss',
    name: 'tailwindcss (.facet bin)',
    status: 'warn',
    message: `not present at ${bin}`,
    hint: 'Run a render to populate `.facet/node_modules/`, or `cd .facet && pnpm install`.',
  };
}
