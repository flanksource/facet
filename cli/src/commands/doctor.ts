/**
 * `facet doctor` — environment preflight.
 *
 * Catches the common classes of failure that send users into minified stack
 * traces: wrong-arch native bindings, missing pnpm, missing Chromium, stale
 * FACET_PACKAGE_PATH, CLI↔declared-facet version drift, and private-registry
 * auth leakage into .facet/.
 */

import { $ } from 'bun';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import semver from 'semver';
import { Logger } from '../utils/logger.js';
import { resolvePackageManager } from '../utils/package-manager.js';
import { resolveChromePath } from '../utils/pdf-generator.js';
import { VERSION } from '../version-generated.js';
import rootPackageJson from '../../../package.json' with { type: 'file' };

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
}

const CRITICAL_NATIVE_PACKAGES = [
  '@rollup/rollup',
  '@esbuild',
  'lightningcss',
  '@swc/core',
];

export async function runDoctor(options: DoctorOptions): Promise<number> {
  const logger = new Logger(options.verbose);
  const results: CheckResult[] = [];

  results.push(checkNodeVersion());
  results.push(checkArchitecture());
  results.push(await checkPnpm(options.consumerRoot));
  results.push(checkNativeBindings(options.consumerRoot));
  results.push(checkChromium());
  results.push(checkFacetPackagePath());
  results.push(checkFacetVersionAlignment(options.consumerRoot));
  results.push(checkNpmrcLeakage(options.consumerRoot));

  if (options.json) {
    process.stdout.write(JSON.stringify({ results }, null, 2) + '\n');
  } else {
    renderHuman(results, logger);
  }

  return results.some(r => r.status === 'fail') ? 1 : 0;
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
    const raw = readFileSync(rootPackageJson, 'utf-8');
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
  // We can't run `uname -m` reliably from inside Bun in every env; best effort.
  let hostArch = arch;
  try {
    const uname = Bun.spawnSync(['uname', '-m']);
    hostArch = uname.stdout.toString().trim();
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
