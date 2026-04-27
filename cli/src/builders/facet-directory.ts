/**
 * Facet Directory Manager
 *
 * Creates and manages the .facet/ build directory in the consumer's project.
 * Similar to .next in Next.js or .nuxt in Nuxt.js.
 *
 * The .facet/ directory contains:
 * - src/ - Symlinks to all consumer files/directories
 * - node_modules/ - Symlink to consumer's node_modules
 * - entry.tsx - Generated wrapper that imports the user's template
 * - vite.config.ts - Generated Vite configuration
 * - tsconfig.json - Generated TypeScript configuration
 * - dist/ - Vite build output
 */

import { mkdirSync, existsSync, symlinkSync, writeFileSync, readdirSync, statSync, rmSync, readlinkSync, readFileSync, lstatSync, unlinkSync } from 'fs';
import { join, relative, basename, dirname, resolve } from 'path';
import { homedir } from 'os';
import type { Logger } from '../utils/logger.js';

// Embed assets at build time using Bun's import with file type
import rootPackageJson from '../../../package.json' with { type: 'file' };
import stylesCss from '../../../src/styles.css' with { type: 'file' };
import viteSsrLoader from '../../vite-ssr-loader.ts' with { type: 'file' };

export interface FacetDirectoryOptions {
  /** Consumer's project root directory */
  consumerRoot: string;
  /** Template file to build */
  templateFile: string;
  /** Logger instance */
  logger: Logger;
}

/**
 * Items to skip when symlinking from consumer directory
 */
const SKIP_ITEMS = new Set([
  '.facet',
  '.git',
  'node_modules',
  'dist',
  '.DS_Store',
  '.gitignore',
  '.env',
  '.env.local',
  'Thumbs.db',
]);

function resolveFileProtocol(version: string, pkgDir: string, _facetRoot: string): string {
  if (!version.startsWith('file:')) return version;
  // Emit an absolute path. pnpm realpath-resolves the install dir (e.g. /var → /private/var
  // on macOS), which breaks relative file: deps that point outside the tempdir root.
  // An absolute path sidesteps the realpath rewrite.
  return 'file:' + resolve(pkgDir, version.slice(5));
}

// Resolve any pnpm/npm local-path protocol (file:, link:, portal:, workspace:)
// to an absolute form anchored at `pkgDir`, so the reference survives being
// rewritten into `.facet/package.json` which lives at a different depth.
function resolveLocalProtocol(version: string, pkgDir: string): string {
  for (const proto of ['file:', 'link:', 'portal:']) {
    if (version.startsWith(proto)) {
      return proto + resolve(pkgDir, version.slice(proto.length));
    }
  }
  return version;
}

// Resolve every local-path protocol inside an overrides-shaped record
// (pnpm.overrides / resolutions / overrides). Keeps nested object overrides
// (targeted shape: `{ "pkg": { ".": "1.2.3" } }`) structurally intact.
function resolveOverrideValues(
  overrides: Record<string, unknown> | undefined,
  pkgDir: string,
): Record<string, unknown> | undefined {
  if (!overrides || typeof overrides !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(overrides)) {
    if (typeof val === 'string') {
      out[key] = resolveLocalProtocol(val, pkgDir);
    } else if (val && typeof val === 'object') {
      out[key] = resolveOverrideValues(val as Record<string, unknown>, pkgDir);
    } else {
      out[key] = val;
    }
  }
  return out;
}

export class FacetDirectory {
  // Subset of build deps whose absence reliably signals a broken install:
  // react/vite/the React Vite plugin/facet itself. Hits before pnpm hoists
  // anything else, so a fresh-but-empty node_modules trips on the first one.
  private static SENTINEL_DEPS = ['react', 'vite', '@vitejs/plugin-react', '@flanksource/facet'];

  private consumerRoot: string;
  private facetRoot: string;
  private facetSrc: string;
  private templateFile: string;
  private logger: Logger;

  constructor(options: FacetDirectoryOptions) {
    this.consumerRoot = options.consumerRoot;
    this.facetRoot = join(this.consumerRoot, '.facet');
    this.facetSrc = join(this.facetRoot, 'src');
    this.templateFile = options.templateFile;
    this.logger = options.logger;
  }

  /**
   * Create the .facet/ directory structure
   */
  create(): void {
    this.logger.debug('Creating .facet/ directory structure');

    // Create .facet/ and .facet/src/
    mkdirSync(this.facetRoot, { recursive: true });
    mkdirSync(this.facetSrc, { recursive: true });

    this.logger.debug(`Created ${this.facetRoot}`);
  }

  /**
   * Symlink individual files/directories from consumer root into .facet/src/
   */
  symlinkConsumerFiles(): void {
    this.logger.debug('Symlinking consumer files into .facet/src/');

    const items = readdirSync(this.consumerRoot);

    for (const item of items) {
      if (SKIP_ITEMS.has(item)) {
        this.logger.debug(`Skipping ${item}`);
        continue;
      }

      const sourcePath = join(this.consumerRoot, item);
      const targetPath = join(this.facetSrc, item);

      try {
        // Check if symlink already exists and points to correct location
        if (existsSync(targetPath)) {
          try {
            const existingTarget = readlinkSync(targetPath);
            if (existingTarget === sourcePath) {
              this.logger.debug(`Symlink already exists: ${item}`);
              continue;
            }
            // Remove old symlink if it points to wrong location
            rmSync(targetPath, { force: true });
          } catch {
            // Not a symlink, remove it
            rmSync(targetPath, { recursive: true, force: true });
          }
        }

        // Create symlink
        const stat = statSync(sourcePath);
        const type = stat.isDirectory() ? 'junction' : 'file';

        symlinkSync(sourcePath, targetPath, type);
        this.logger.debug(`Symlinked: ${item} (${type})`);
      } catch (error) {
        this.logger.warn(`Failed to symlink ${item}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Symlink node_modules from consumer root to .facet/
   */
  symlinkNodeModules(): void {
    this.logger.debug('Symlinking node_modules');

    const source = join(this.consumerRoot, 'node_modules');
    const target = join(this.facetRoot, 'node_modules');

    if (!existsSync(source)) {
      this.logger.warn('node_modules not found in consumer directory');
      return;
    }

    try {
      // Check if symlink already exists
      if (existsSync(target)) {
        try {
          const existingTarget = readlinkSync(target);
          if (existingTarget === source) {
            this.logger.debug('node_modules symlink already exists');
            return;
          }
          rmSync(target, { force: true });
        } catch {
          rmSync(target, { recursive: true, force: true });
        }
      }

      symlinkSync(source, target, 'junction');
      this.logger.debug('Symlinked node_modules');
    } catch (error) {
      throw new Error(`Failed to symlink node_modules: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate entry.tsx wrapper that imports the user's template
   */
  generateEntryWrapper(): void {
    this.logger.debug('Generating entry.tsx wrapper');

    const templateRelPath = relative(this.consumerRoot, join(this.consumerRoot, this.templateFile));
    const ext = this.templateFile.match(/\.[^.]+$/)?.[0] ?? '';
    const isMarkdown = ext === '.md' || ext === '.mdx';

    const entry = isMarkdown
      ? `import React from 'react';
import './src/styles.css';
import { Page } from '@flanksource/facet';
import { Icon } from '@iconify/react';
import Content from './src/${templateRelPath}';

export default function Template({ data }) {
  return (
    <Page pageSize="a4" margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
      <article className="prose">
        <Content components={{ Icon }} {...data} />
      </article>
    </Page>
  );
}
`
      : `import React from 'react';
import './src/styles.css';
import Template from './src/${templateRelPath}';


export default Template;
`;

    const entryPath = join(this.facetRoot, 'entry.tsx');
    writeFileSync(entryPath, entry, 'utf-8');

    this.logger.debug('Generated entry.tsx');
  }

  /**
   * Generate vite.config.ts for the build
   */
  generateViteConfig(): void {
    this.logger.debug('Generating vite.config.ts');

    const config = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm],
      include: ['**/*.md', '**/*.mdx'],
    }),
    react({
      include: /\\.(md|mdx|js|jsx|ts|tsx)$/,
    }),
  ],
  resolve: {
    preserveSymlinks: true,  // Follow symlinks to their real paths
    alias: {
      '@flanksource/facet': resolve(__dirname, 'node_modules/@flanksource/facet'),
      '@facet': resolve(__dirname, 'node_modules/@flanksource/facet'),
      '@facet/core': resolve(__dirname, 'node_modules/@flanksource/facet'),
      '@src': resolve(__dirname, 'src'),
      'react-icons': resolve(__dirname, 'node_modules/react-icons'),
    },
    conditions: ['import', 'module', 'browser', 'default'],
  },
  ssr: {
    noExternal: ['react-icons', '@iconify/react', '@flanksource/facet', new RegExp('^@flanksource/')],
    resolve: {
      conditions: ['node', 'import', 'module', 'browser', 'default'],
      externalConditions: ['node'],
    },
  },
  build: {
    ssr: true,
    outDir: 'dist',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'entry.tsx'),
      name: 'DatasheetApp',
      fileName: 'bundle',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        exports: 'default',
      },
    },
    cssCodeSplit: false,
  },
});
`;

    const configPath = join(this.facetRoot, 'vite.config.ts');
    writeFileSync(configPath, config, 'utf-8');

    this.logger.debug('Generated vite.config.ts');
  }

  /**
   * Generate tsconfig.json for the build
   */
  generateTsConfig(): void {
    this.logger.debug('Generating tsconfig.json');

    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        jsx: 'react-jsx',
        module: 'ESNext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        strict: false,
        paths: {
          '@facet': ['./node_modules/@flanksource/facet'],
          '@facet/*': ['./node_modules/@flanksource/facet/dist/components/*'],
          '@src/*': ['./src/*'],
        },
      },
      include: ['entry.tsx', 'src/**/*'],
    };

    const tsconfigPath = join(this.facetRoot, 'tsconfig.json');
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf-8');

    this.logger.debug('Generated tsconfig.json');
  }

  /**
   * Generate package.json with all required build dependencies
   * Reads versions from embedded root-package.json and merges with consumer's dependencies
   */
  generatePackageJson(): void {
    this.logger.debug('Generating package.json');

    let dependencies: Record<string, string> = {};
    // Forward consumer's override/resolution fields so local-development
    // workflows (e.g. `pnpm.overrides: { '@flanksource/facet': 'link:../facet' }`)
    // and pinned security patches reach .facet/node_modules.
    let pnpmField: Record<string, unknown> | undefined;
    let resolutionsField: Record<string, unknown> | undefined;
    let overridesField: Record<string, unknown> | undefined;

    // First, load consumer's dependencies
    try {
      const consumerPackagePath = join(this.consumerRoot, 'package.json');
      if (existsSync(consumerPackagePath)) {
        const consumerPackageText = readFileSync(consumerPackagePath, 'utf-8');
        const consumerPackage = JSON.parse(consumerPackageText);
        const raw = { ...consumerPackage.dependencies, ...consumerPackage.devDependencies } as Record<string, string>;

        for (const [name, ver] of Object.entries(raw)) {
          dependencies[name] = resolveFileProtocol(ver, this.consumerRoot, this.facetRoot);
        }

        if (consumerPackage.pnpm && typeof consumerPackage.pnpm === 'object') {
          pnpmField = { ...consumerPackage.pnpm };
          if (pnpmField.overrides) {
            pnpmField.overrides = resolveOverrideValues(pnpmField.overrides as Record<string, unknown>, this.consumerRoot);
          }
        }
        if (consumerPackage.resolutions) {
          resolutionsField = resolveOverrideValues(consumerPackage.resolutions, this.consumerRoot);
        }
        if (consumerPackage.overrides) {
          overridesField = resolveOverrideValues(consumerPackage.overrides, this.consumerRoot);
        }

        this.logger.debug(`Loaded ${Object.keys(dependencies).length} dependencies from consumer package.json`);
      }
    } catch (error) {
      this.logger.warn(`Failed to read consumer package.json: ${error}`);
    }

    // Read embedded root-package.json (imported at build time)
    const rootPackageText = readFileSync(rootPackageJson, 'utf-8');
    const rootPackage = JSON.parse(rootPackageText);
    const allDeps = { ...rootPackage.dependencies, ...rootPackage.devDependencies };

    // Extract only the dependencies we need for building
    const requiredDeps = [
      'react',
      'react-dom',
      'vite',
      '@vitejs/plugin-react',
      '@mdx-js/rollup',
      'remark-gfm',
      'react-icons',
      '@flanksource/icons',
      '@iconify/react',
      'typescript',
      '@tailwindcss/typography',
      '@tailwindcss/postcss',
      'tailwindcss',
      'autoprefixer',
      'postcss',
      'source-map-support',
      // d3 runtime deps surfaced by facet source imports; declared here so
      // pnpm hoists them into .facet/node_modules/ for SSR resolution when
      // facet is consumed via link:/file: (which doesn't carry through
      // transitive deps the way a published tarball does).
      'd3-array',
      'd3-format',
      'd3-interpolate',
      'd3-scale',
      'd3-shape',
      'd3-time',
      'd3-time-format',
    ];

    for (const dep of requiredDeps) {
      if (allDeps[dep] && !dependencies[dep]) {
        dependencies[dep] = allDeps[dep];
      }
    }

    // Add @flanksource/facet itself so Vite can resolve @facet alias.
    // FACET_PACKAGE_PATH allows a local tarball/directory to be used instead of
    // fetching from the registry (used in Docker images where the version may not
    // yet be published, and for local facet development against a consumer repo).
    // When set, it always overrides any declared facet dependency.
    const localPackagePath = process.env['FACET_PACKAGE_PATH'];
    if (localPackagePath) {
      dependencies['@flanksource/facet'] = resolveFileProtocol(`file:${localPackagePath}`, '/', this.facetRoot);
    } else if (!dependencies['@flanksource/facet']) {
      dependencies['@flanksource/facet'] = rootPackage.version;
    }

    // Walk up from template file directory to find nearest package.json
    // This picks up deps from e.g. quickstart/package.json when cwd is src/examples/
    const templateDir = dirname(join(this.consumerRoot, this.templateFile));
    let searchDir = templateDir;
    while (searchDir.startsWith(this.consumerRoot) && searchDir !== dirname(this.consumerRoot)) {
      const pkgPath = join(searchDir, 'package.json');
      if (existsSync(pkgPath) && searchDir !== this.consumerRoot) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        for (const [name, ver] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>)) {
          dependencies[name] = resolveFileProtocol(ver, searchDir, this.facetRoot);
        }
        this.logger.debug(`Merged deps from ${pkgPath}`);
        break;
      }
      searchDir = dirname(searchDir);
    }

    // Add lightningcss if not present (optional Vite dependency)
    if (!dependencies['lightningcss']) {
      dependencies['lightningcss'] = '^1.30.2';
    }

    this.logger.debug(`Merged with facet build dependencies, total: ${Object.keys(dependencies).length}`);

    // Warn when overrides collide with facet's build deps — the override wins
    // (correct for consumer intent) but may break facet's Vite/React assumptions.
    const collisionSources: Array<[string, Record<string, unknown> | undefined]> = [
      ['pnpm.overrides', pnpmField?.overrides as Record<string, unknown> | undefined],
      ['resolutions', resolutionsField],
      ['overrides', overridesField],
    ];
    for (const [source, o] of collisionSources) {
      if (!o) continue;
      const hits = Object.keys(o).filter(k => requiredDeps.includes(k));
      if (hits.length > 0) {
        this.logger.warn(
          `Consumer ${source} overrides facet build deps: ${hits.join(', ')}. If builds break, remove the override or align versions with facet's rootPackage.`,
        );
      }
    }

    const packageJson: Record<string, unknown> = {
      name: '.facet-build',
      private: true,
      type: 'module',
      dependencies,
    };
    if (pnpmField) packageJson.pnpm = pnpmField;
    if (resolutionsField) packageJson.resolutions = resolutionsField;
    if (overridesField) packageJson.overrides = overridesField;

    const packagePath = join(this.facetRoot, 'package.json');
    const newContent = JSON.stringify(packageJson, null, 2);

    // Only write if changed — avoids pnpm install on every run when deps haven't changed
    let existing = '';
    try { existing = readFileSync(packagePath, 'utf-8'); } catch { /* not yet created */ }
    if (existing !== newContent) {
      writeFileSync(packagePath, newContent, 'utf-8');
      this.logger.debug('Generated package.json (changed)');
      // When deps change, the old pnpm-lock.yaml no longer describes the
      // intended install graph. Stale lockfiles are a common source of
      // ERR_PNPM_LINKING_FAILED / ENOENT-on-mkdir failures when facet ships
      // new required deps. Drop the lockfile so pnpm re-resolves cleanly.
      const lockPath = join(this.facetRoot, 'pnpm-lock.yaml');
      if (existsSync(lockPath)) {
        try {
          rmSync(lockPath, { force: true });
          this.logger.debug('Removed stale pnpm-lock.yaml (package.json changed)');
        } catch (err) {
          this.logger.warn(`Could not remove stale pnpm-lock.yaml: ${err}`);
        }
      }
    } else {
      this.logger.debug('package.json unchanged, skipping write');
    }

    // Generate .npmrc. Start from consumer + user-home .npmrc so private
    // registries, auth tokens, and proxy settings reach pnpm's install inside
    // .facet/. Append facet's required settings last so they win on duplicate
    // keys:
    // - node-linker=hoisted: flat node_modules compatible with Vite/Rollup
    //   platform-specific binary resolution (`require('@rollup/rollup-darwin-arm64')`),
    //   which breaks under pnpm's default symlinked layout.
    // - auto-install-peers=true: pulls in peer deps (React, etc.).
    const npmrcPath = join(this.facetRoot, '.npmrc');
    const consumerNpmrc = this.collectConsumerNpmrc();
    const required = [
      'node-linker=hoisted',
      'auto-install-peers=true',
      // WORKAROUND(pnpm-tolerance): block pnpm safety nets that would abort an
      // ephemeral .facet/ install instead of letting auto-recovery rebuild it.
      // Correct fix: pnpm distinguishes ephemeral build dirs from real workspaces.
      // Ref: discussed with user 2026-04-26.
      'strict-peer-dependencies=false',
      'frozen-lockfile=false',
      'prefer-frozen-lockfile=false',
      'verify-store-integrity=false',
      'engine-strict=false',
      // facet runs pnpm under non-interactive shells (Bun's $, CI). Without
      // this, pnpm aborts with ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY when
      // it wants to confirm purging a node_modules dir it considers foreign
      // (lockfile mismatch, store change, foreign manager).
      'confirm-modules-purge=false',
    ];
    const requiredKeys = new Set(required.map(l => l.split('=')[0]));
    const inheritedLines = consumerNpmrc.filter(line => {
      const key = line.split('=')[0];
      return !requiredKeys.has(key);
    });
    const header = inheritedLines.length > 0
      ? '# Inherited from consumer / user .npmrc — regenerated each facet run\n'
      : '';
    const npmrcContent = header + [...inheritedLines, ...required].join('\n') + '\n';
    if (!existsSync(npmrcPath) || readFileSync(npmrcPath, 'utf-8') !== npmrcContent) {
      writeFileSync(npmrcPath, npmrcContent, 'utf-8');
      this.logger.debug(`Generated .npmrc with ${inheritedLines.length} inherited line(s)`);
    }

    // If the generated .npmrc may carry auth tokens, remind the consumer to
    // gitignore .facet/ so they don't accidentally commit them.
    if (inheritedLines.some(l => /_authToken|_password|_auth|certfile|keyfile/.test(l))) {
      this.warnIfFacetNotGitignored();
    }
  }

  /**
   * Read `${consumerRoot}/.npmrc` then `~/.npmrc`, drop comments/blanks, drop
   * lines referencing unset `${ENV}` vars (with a warning). Later files lose
   * to earlier ones on duplicate keys — consumer beats user-home.
   */
  private collectConsumerNpmrc(): string[] {
    const sources = [join(this.consumerRoot, '.npmrc'), join(homedir(), '.npmrc')];
    const merged: string[] = [];
    const seenKeys = new Set<string>();
    for (const src of sources) {
      if (!existsSync(src)) continue;
      let raw: string;
      try {
        raw = readFileSync(src, 'utf-8');
      } catch (err) {
        this.logger.warn(`Failed to read ${src}: ${err}`);
        continue;
      }
      for (const rawLine of raw.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith(';')) continue;
        const eq = line.indexOf('=');
        if (eq < 0) continue;
        const key = line.slice(0, eq).trim();
        if (seenKeys.has(key)) continue;
        const unsetVar = /\$\{([A-Z_][A-Z0-9_]*)\}/g;
        let skip = false;
        for (const match of line.matchAll(unsetVar)) {
          const envName = match[1];
          if (!process.env[envName]) {
            this.logger.warn(`Skipping .npmrc line referencing unset \${${envName}}: ${key}`);
            skip = true;
            break;
          }
        }
        if (skip) continue;
        seenKeys.add(key);
        merged.push(line);
      }
    }
    return merged;
  }

  /**
   * Warn if no ancestor directory's .gitignore excludes .facet/ — we may have
   * just written tokens into `.facet/.npmrc`. Walks up from consumerRoot to
   * the filesystem root (or the nearest .git checkout), so a monorepo's
   * top-level .gitignore covers its examples.
   */
  private warnIfFacetNotGitignored(): void {
    let dir = this.consumerRoot;
    while (true) {
      const gitignorePath = join(dir, '.gitignore');
      if (existsSync(gitignorePath)) {
        try {
          const contents = readFileSync(gitignorePath, 'utf-8');
          const matches = contents.split(/\r?\n/).some(line => {
            const t = line.trim();
            return t === '.facet' || t === '.facet/' || t === '/.facet' || t === '/.facet/' || t === '**/.facet' || t === '**/.facet/';
          });
          if (matches) return;
        } catch (err) {
          this.logger.debug(`Could not read ${gitignorePath}: ${err}`);
        }
      }
      // Stop at a .git checkout boundary or the filesystem root.
      if (existsSync(join(dir, '.git'))) break;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    this.logger.warn('.facet/.npmrc may contain inherited auth tokens but no ancestor .gitignore excludes `.facet/`. Add `.facet/` (or `**/.facet/` for monorepos) to .gitignore to avoid committing secrets.');
  }

  /**
   * Returns true if node_modules needs to be installed. Combines mtime check
   * with a sentinel-dep scan so partial / corrupt installs are detected.
   */
  needsInstall(): boolean {
    const packagePath = join(this.facetRoot, 'package.json');
    const nodeModulesPath = join(this.facetRoot, 'node_modules');
    if (!existsSync(nodeModulesPath)) return true;
    if (this.isInstallBroken()) return true;
    try {
      return statSync(packagePath).mtimeMs > statSync(nodeModulesPath).mtimeMs;
    } catch {
      return true;
    }
  }

  /**
   * Cheap O(sentinels) check for a partial/corrupt install: empty node_modules,
   * missing sentinel package, or a dangling symlink count as broken.
   */
  isInstallBroken(): boolean {
    const nm = join(this.facetRoot, 'node_modules');
    if (!existsSync(nm)) return true;
    // Foreign-manager markers: an npm/yarn lockfile next to node_modules makes
    // pnpm refuse to write into the dir (ENOENT on importPackage). Treat as broken.
    if (existsSync(join(this.facetRoot, 'package-lock.json'))) {
      this.logger.warn('Foreign package-lock.json found in .facet/ — install broken');
      return true;
    }
    if (existsSync(join(this.facetRoot, 'yarn.lock'))) {
      this.logger.warn('Foreign yarn.lock found in .facet/ — install broken');
      return true;
    }
    // node_modules pointing outside .facet/ (legacy facet-cache symlink) confuses
    // pnpm's hoisted layout. Force a clean install.
    try {
      const st = lstatSync(nm);
      if (st.isSymbolicLink()) {
        this.logger.warn('Legacy .facet/node_modules symlink found — install broken');
        return true;
      }
    } catch { /* fall through */ }
    try { if (readdirSync(nm).length === 0) return true; } catch { return true; }
    for (const dep of FacetDirectory.SENTINEL_DEPS) {
      const depPkg = join(nm, ...dep.split('/'), 'package.json');
      if (!existsSync(depPkg)) {
        this.logger.warn(`Sentinel dep missing: ${dep} (${depPkg}) — install broken`);
        return true;
      }
      try { statSync(depPkg); } catch {
        this.logger.warn(`Sentinel dep dangling: ${dep} — install broken`);
        return true;
      }
    }
    return false;
  }

  /** Reset .facet/ install state so the next pnpm install re-resolves clean. */
  nukeInstall(): void {
    // Include package-lock.json: a stale npm/yarn lockfile makes pnpm treat
    // the dir as foreign and refuse to write into node_modules.
    this.removePaths(['node_modules', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', '.pnpm-store']);
    this.logger.info('Reset .facet/ install state (node_modules + pnpm-lock.yaml removed)');
  }

  /** Remove only `node_modules`, symlink-safe. */
  removeNodeModules(): void {
    this.removePaths(['node_modules']);
  }

  /** Remove pnpm's lockfile so the next install re-resolves from package.json. */
  removePnpmLock(): void {
    this.removePaths(['pnpm-lock.yaml']);
  }

  /** Remove foreign-manager lockfiles that confuse pnpm. */
  removeForeignLocks(): void {
    this.removePaths(['package-lock.json', 'yarn.lock']);
  }

  /** Remove the local pnpm content store. */
  removePnpmStore(): void {
    this.removePaths(['.pnpm-store']);
  }

  private removePaths(names: string[]): void {
    for (const p of names) {
      const target = join(this.facetRoot, p);
      try {
        // lstatSync so we can detect symlinks without following them. Without
        // this, rmSync({ recursive: true }) walks into the symlink target
        // (e.g. an external facet cache) and may partially delete shared deps.
        const st = lstatSync(target);
        if (st.isSymbolicLink()) {
          unlinkSync(target);
        } else {
          rmSync(target, { recursive: true, force: true });
        }
      } catch (err: any) {
        if (err?.code === 'ENOENT') continue;
        this.logger.warn(`removePaths: failed to remove ${target}: ${err}`);
      }
    }
  }


  /**
   * Generate default postcss.config.js if consumer doesn't have one
   */
  generatePostCSSConfig(): void {
    const consumerConfig = join(this.consumerRoot, 'postcss.config.js');

    // Skip if consumer has their own config (will be symlinked)
    if (existsSync(consumerConfig)) {
      this.logger.debug('Consumer has postcss.config.js, skipping generation');
      return;
    }

    this.logger.debug('Generating default postcss.config.js');

    // Generate ESM-compatible config (not CommonJS) since package.json has "type": "module"
    const config = `export default {
  plugins: {
    autoprefixer: {},
  },
};
`;

    writeFileSync(join(this.facetRoot, 'postcss.config.js'), config, 'utf-8');
    this.logger.debug('Generated postcss.config.js');
  }

  /**
   * Generate default tailwind.config.js if consumer doesn't have one
   */
  generateTailwindConfig(): void {
    const consumerConfig = join(this.consumerRoot, 'tailwind.config.js');

    // Skip if consumer has their own config (will be symlinked)
    if (existsSync(consumerConfig)) {
      this.logger.debug('Consumer has tailwind.config.js, skipping generation');
      return;
    }

    this.logger.debug('Generating default tailwind.config.js');

    // Generate ESM-compatible config (not CommonJS) since package.json has "type": "module"
    // Point directly to consumer root to avoid symlink issues
    const config = `import typography from '@tailwindcss/typography';
console.log('Using default tailwind.config.js');
export default {
  content: [
    "src/**/*.{html,js,jsx,ts,tsx,md,mdx}",
    "./node_modules/@flanksource/facet/src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Open Sans", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Fira Code", "Consolas", "Monaco", "Courier New", "monospace"],
      },
      colors: {
        'flanksource-blue': '#2563eb',
        'flanksource-dark': '#1e293b',
      },
      maxWidth: {
        'a4': '210mm',
      },
    },
  },
  plugins: [typography],
};
`;

    writeFileSync(join(this.facetRoot, 'tailwind.config.js'), config, 'utf-8');
    this.logger.debug('Generated tailwind.config.js');
  }

  /**
   * Copy embedded styles.css to .facet/src/
   */
  copyStylesCss(): void {
    const consumerStylesCss = join(this.consumerRoot, 'src/styles.css');

    // Skip if consumer has their own styles.css (will be symlinked)
    if (existsSync(consumerStylesCss)) {
      this.logger.debug('Consumer has src/styles.css, skipping copy');
      return;
    }

    this.logger.debug('Copying default styles.css');

    try {
      // Read embedded styles.css (imported at build time)
      const styles = readFileSync(stylesCss, 'utf-8');
      writeFileSync(join(this.facetSrc, 'styles.css'), styles, 'utf-8');
      this.logger.debug('Copied styles.css');
    } catch (error) {
      this.logger.warn(`Failed to copy styles.css: ${error}`);
    }
  }

  /**
   * Copy embedded vite-ssr-loader.ts to .facet/
   */
  copyViteSsrLoader(): void {
    this.logger.debug('Copying vite-ssr-loader.ts');

    try {
      // Read embedded loader script (imported at build time)
      const loaderScript = readFileSync(viteSsrLoader, 'utf-8');
      const destPath = join(this.facetRoot, 'vite-ssr-loader.ts');
      writeFileSync(destPath, loaderScript, 'utf-8');
      this.logger.debug('Copied vite-ssr-loader.ts');
    } catch (error) {
      throw new Error(`Failed to copy vite-ssr-loader.ts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the path to the .facet/ directory
   */
  getFacetRoot(): string {
    return this.facetRoot;
  }

  /**
   * Get the path to the Vite build output
   */
  getDistPath(): string {
    return join(this.facetRoot, 'dist');
  }

  /**
   * Clean up the .facet/ directory
   * Note: This is NOT called automatically - the .facet/ directory is kept
   * similar to .next in Next.js
   */
  cleanup(): void {
    this.logger.debug('Cleaning .facet/ directory');

    try {
      if (existsSync(this.facetRoot)) {
        rmSync(this.facetRoot, { recursive: true, force: true });
        this.logger.debug('Cleaned .facet/ directory');
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup .facet/: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
