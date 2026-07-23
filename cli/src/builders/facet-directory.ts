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

import { mkdirSync, existsSync, symlinkSync, writeFileSync, readdirSync, statSync, rmSync, readlinkSync, readFileSync, lstatSync, unlinkSync, chmodSync, openSync, closeSync } from 'fs';
import { createHash } from 'crypto';
import { join, relative, dirname, resolve, extname, sep } from 'path';
import { homedir } from 'os';
import type { Logger } from '../utils/logger.js';
import {
  generatePluginCodegen,
  rehypePluginsArray,
  remarkPluginsArray,
  EMPTY_REMARK_CONFIG,
  type RemarkConfig,
} from './remark-config.js';

import { assetPath } from '../utils/assets.js';
import { createDefaultModulePackageJson, defaultModuleNpmrc } from '../bundler/module-store.js';
import { VERSION } from '../version-generated.js';
import { LowPriorityProcessError, runLowPriority } from '../utils/subprocess-priority.js';

const rootPackageJson = assetPath('package.json');

export interface FacetDirectoryOptions {
  /** Consumer's project root directory */
  consumerRoot: string;
  /** Template file to build */
  templateFile: string;
  /** Logger instance */
  logger: Logger;
  /** Extra remark/rehype plugins declared in the template's frontmatter. */
  remarkConfig?: RemarkConfig;
  /** Use the immutable shared Facet module install without consumer dependencies. */
  skipModules?: boolean;
}

/**
 * Items to skip when symlinking from consumer directory
 */
// Dot-entries are skipped wholesale (except SYMLINKED_DOT_ITEMS): mirroring
// cache/tool dirs (.pnpm-store, .wrangler, .tmp, stale .facet-* staging, …)
// into .facet/src put hundreds of thousands of junk files inside the Vite
// root, which Tailwind v4's automatic source detection walks on every build
// (measured: 574k files, ~45s per build in a real consumer).
const SKIP_ITEMS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'npm-dist',
  'dist-sea',
  'dist-playground',
  'out',
  '.DS_Store',
  'Thumbs.db',
]);

// Dot-entries facet itself depends on: header/footer fragment builds use
// templatePath `.facet-fragments/…`, resolved through .facet/src.
const SYMLINKED_DOT_ITEMS = new Set(['.facet-fragments']);

function shouldSkipConsumerItem(item: string): boolean {
  if (SYMLINKED_DOT_ITEMS.has(item)) return false;
  return SKIP_ITEMS.has(item) || item.startsWith('.');
}

function resolveFileProtocol(version: string, pkgDir: string, _facetRoot: string): string {
  if (!version.startsWith('file:')) return version;
  // Emit an absolute path. pnpm realpath-resolves the install dir (e.g. /var → /private/var
  // on macOS), which breaks relative file: deps that point outside the tempdir root.
  // An absolute path sidesteps the realpath rewrite.
  return 'file:' + resolve(pkgDir, version.slice(5));
}

export interface FacetPackageOverride {
  kind: 'directory' | 'tarball';
  path: string;
}

// Upper bound on a local FACET_PACKAGE_PATH rebuild (`pnpm run <script>`); a
// stuck script must not hang the CLI's install/build path indefinitely.
const LOCAL_BUILD_TIMEOUT_MS = 5 * 60 * 1000;

const SOURCE_DIR_SKIP = new Set(['node_modules', 'dist', '.git', '.facet', 'storybook-static']);
const COMPONENT_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const CSS_BUILD_INPUTS = [
  'src/styles.css',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
  'postcss.config.js',
  'postcss.config.cjs',
  'postcss.config.mjs',
  'package.json',
];

function isComponentBuildSource(path: string): boolean {
  if (!COMPONENT_SOURCE_EXTENSIONS.has(extname(path))) return false;
  return !/\.(test|spec|stories)\.[tj]sx?$/.test(path);
}

export function resolveFacetPackageOverride(raw = process.env['FACET_PACKAGE_PATH']): FacetPackageOverride | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const abs = resolve(trimmed);
  if (existsSync(abs)) {
    try {
      if (statSync(abs).isDirectory()) return { kind: 'directory', path: abs };
    } catch {
      // Let pnpm surface a clearer file/tarball error later.
    }
  }
  return { kind: 'tarball', path: abs };
}

export function wrapFacetStylesInLayer(css: string): string {
  const imports: string[] = [];
  let remaining = css;
  const leadingImport = /^((?:\s|\/\*[\s\S]*?\*\/)*@import\s+(?:"[^"]*"|'[^']*'|url\([^)]*\))[^;]*;)\s*/;
  for (let match = remaining.match(leadingImport); match; match = remaining.match(leadingImport)) {
    imports.push(match[1].trim());
    remaining = remaining.slice(match[0].length);
  }
  if (/@import\s/.test(remaining)) {
    throw new Error('Facet styles contain an @import after style rules; CSS imports must precede all layered rules');
  }

  return [
    ...imports,
    '@layer facet, theme, base, components, utilities;',
    '@layer facet {',
    remaining.trim(),
    '}',
    '',
  ].join('\n');
}

function newestMatchingMtime(dir: string, predicate: (path: string) => boolean): number {
  if (!existsSync(dir)) return 0;
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SOURCE_DIR_SKIP.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMatchingMtime(fullPath, predicate));
      continue;
    }
    if (!entry.isFile() || !predicate(fullPath)) continue;
    newest = Math.max(newest, statSync(fullPath).mtimeMs);
  }
  return newest;
}

function newestExistingMtime(paths: string[]): number {
  let newest = 0;
  for (const path of paths) {
    if (!existsSync(path)) continue;
    newest = Math.max(newest, statSync(path).mtimeMs);
  }
  return newest;
}

export function needsLocalFacetComponentsBuild(packageRoot: string): boolean {
  const output = join(packageRoot, 'dist/components/index.js');
  const sourceMtime = newestMatchingMtime(join(packageRoot, 'src'), isComponentBuildSource);
  if (sourceMtime === 0) return false;
  if (!existsSync(output)) return true;
  return sourceMtime > statSync(output).mtimeMs;
}

export function needsLocalFacetCssBuild(packageRoot: string): boolean {
  const output = join(packageRoot, 'dist/styles.css');
  const sourceMtime = newestExistingMtime(CSS_BUILD_INPUTS.map(path => join(packageRoot, path)));
  if (sourceMtime === 0) return false;
  if (!existsSync(output)) return true;
  return sourceMtime > statSync(output).mtimeMs;
}

function addFileFingerprint(hash: ReturnType<typeof createHash>, root: string, relPath: string): void {
  const path = join(root, relPath);
  if (!existsSync(path)) {
    hash.update(`${relPath}:missing\n`);
    return;
  }
  const stat = statSync(path);
  if (!stat.isFile()) {
    hash.update(`${relPath}:not-file\n`);
    return;
  }
  hash.update(`${relPath}:${stat.size}:${Math.floor(stat.mtimeMs)}\n`);
}

function addTreeFingerprint(hash: ReturnType<typeof createHash>, root: string, relDir: string): void {
  const dir = join(root, relDir);
  if (!existsSync(dir)) {
    hash.update(`${relDir}:missing\n`);
    return;
  }
  const entries = readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const relPath = join(relDir, entry.name);
    if (entry.isDirectory()) {
      addTreeFingerprint(hash, root, relPath);
    } else if (entry.isFile()) {
      addFileFingerprint(hash, root, relPath);
    }
  }
}

function addFileContentFingerprint(hash: ReturnType<typeof createHash>, root: string, relPath: string): void {
  const path = join(root, relPath);
  if (!existsSync(path)) {
    hash.update(`${relPath}:missing\n`);
    return;
  }
  const stat = statSync(path);
  if (!stat.isFile()) {
    hash.update(`${relPath}:not-file\n`);
    return;
  }
  hash.update(`${relPath}:${stat.size}:`);
  hash.update(readFileSync(path));
  hash.update('\n');
}

function addTreeContentFingerprint(hash: ReturnType<typeof createHash>, root: string, relDir: string): void {
  const dir = join(root, relDir);
  if (!existsSync(dir)) {
    hash.update(`${relDir}:missing\n`);
    return;
  }
  const entries = readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const relPath = join(relDir, entry.name);
    if (entry.isDirectory()) {
      addTreeContentFingerprint(hash, root, relPath);
    } else if (entry.isFile()) {
      addFileContentFingerprint(hash, root, relPath);
    }
  }
}

function facetBuildContentFingerprint(packageRoot: string): string {
  const hash = createHash('sha256');
  addFileContentFingerprint(hash, packageRoot, 'package.json');
  addFileContentFingerprint(hash, packageRoot, 'dist/styles.css');
  addTreeContentFingerprint(hash, packageRoot, 'dist/components');
  return hash.digest('hex');
}

export function localFacetBuildFingerprint(packageRoot: string): string {
  const hash = createHash('sha256');
  hash.update(`root:${packageRoot}\n`);
  addFileFingerprint(hash, packageRoot, 'package.json');
  addFileFingerprint(hash, packageRoot, 'dist/styles.css');
  addTreeFingerprint(hash, packageRoot, 'dist/components');
  return hash.digest('hex').slice(0, 20);
}

// Resolve any pnpm/npm local-path protocol (file:, link:, portal:) to an
// absolute form anchored at `pkgDir`, so the reference survives being rewritten
// into `.facet/package.json` which lives at a different depth.
//
// `workspace:` is rejected: it resolves through pnpm-workspace.yaml, but
// .facet/ is built with `--ignore-workspace` and has no workspace context, so
// passing it through would surface as a confusing pnpm error at install time.
function resolveLocalProtocol(version: string, pkgDir: string): string {
  if (version.startsWith('workspace:')) {
    throw new Error(
      `facet overrides cannot use the "workspace:" protocol (got "${version}"): ` +
      `.facet/ installs run with --ignore-workspace and have no pnpm-workspace.yaml. ` +
      `Use a concrete version, or a file:/link:/portal: path that points at the workspace package.`
    );
  }
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

/**
 * Build the `window.__FACET_DATA__ = ...;` payload for the live-render scaffold.
 * Escapes `<` and the U+2028/U+2029 line separators so data containing
 * `</script>` (or a JS line separator) cannot break out of the script context.
 */
export function serializeInjectedData(data: Record<string, unknown>): string {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `window.__FACET_DATA__ = ${json};\n`;
}

export class FacetDirectory {
  private consumerRoot: string;
  private facetRoot: string;
  private facetSrc: string;
  private templateFile: string;
  private logger: Logger;
  private remarkConfig: RemarkConfig;
  private skipModules: boolean;

  constructor(options: FacetDirectoryOptions) {
    this.consumerRoot = options.consumerRoot;
    this.facetRoot = join(this.consumerRoot, '.facet');
    this.facetSrc = join(this.facetRoot, 'src');
    this.templateFile = options.templateFile;
    this.logger = options.logger;
    this.remarkConfig = options.remarkConfig ?? EMPTY_REMARK_CONFIG;
    this.skipModules = options.skipModules ?? false;
  }

  /**
   * MDX plugin source for the generated vite configs: extra imports, the
   * remarkPlugins array (always-on defaults + frontmatter-declared plugins),
   * and the rehypePlugins array. Local plugin paths resolve relative to
   * the template file's directory.
   */
  private mdxPluginSource(): { imports: string; remarkArray: string; rehypeArray: string } {
    const templateDir = dirname(resolve(this.consumerRoot, this.templateFile));
    const codegen = generatePluginCodegen(this.remarkConfig, templateDir);
    const imports = codegen.imports.length ? '\n' + codegen.imports.join('\n') : '';
    return {
      imports,
      remarkArray: remarkPluginsArray(codegen.remarkItems),
      rehypeArray: rehypePluginsArray(codegen.rehypeItems),
    };
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

    // Drop links a previous facet version created for now-excluded items, so
    // existing .facet/ dirs stop exposing junk trees to source scanners.
    for (const existing of readdirSync(this.facetSrc)) {
      if (!shouldSkipConsumerItem(existing)) continue;
      const stalePath = join(this.facetSrc, existing);
      try {
        if (lstatSync(stalePath).isSymbolicLink()) {
          rmSync(stalePath, { force: true });
          this.logger.debug(`Removed stale symlink: ${existing}`);
        }
      } catch { /* concurrent cleanup */ }
    }

    const items = readdirSync(this.consumerRoot);

    for (const item of items) {
      if (shouldSkipConsumerItem(item)) {
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
   * Expose .facet/node_modules at the consumer root when the consumer has no
   * install of its own. Vite resolves the symlinked template files in
   * .facet/src/ to their real paths under the consumer root, so their bare
   * imports resolve by walking up from there — which needs a node_modules.
   */
  linkConsumerNodeModules(): void {
    const link = join(this.consumerRoot, 'node_modules');
    const target = join(this.facetRoot, 'node_modules');

    try {
      const existing = lstatSync(link, { throwIfNoEntry: false });
      if (existing) {
        if (!existing.isSymbolicLink()) {
          // The consumer has its own install; leave it alone.
          return;
        }
        if (readlinkSync(link) === target) return;
        unlinkSync(link);
      }

      symlinkSync(target, link, 'junction');
      this.logger.debug('Symlinked consumer node_modules to .facet/node_modules');
    } catch (error) {
      this.logger.warn(`Failed to link consumer node_modules: ${error instanceof Error ? error.message : String(error)}`);
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
import './facet.css';
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
import './facet.css';
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

    const { imports, remarkArray, rehypeArray } = this.mdxPluginSource();
    const config = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeRaw from 'rehype-raw';
import { resolve } from 'path';
import { createRequire } from 'module';${imports}

const facetRequire = createRequire(import.meta.url);
const tailwindMajor = Number(facetRequire('tailwindcss/package.json').version.split('.')[0]);

export default defineConfig(async () => {
  const tailwindPlugins = tailwindMajor === 4
    ? [(await import('@tailwindcss/vite')).default()]
    : [];
  const mdxPlugin = {
    enforce: 'pre',
    ...mdx({
      remarkPlugins: ${remarkArray},
      rehypePlugins: ${rehypeArray},
      include: [/\\.(md|mdx)$/],
    }),
  };
  // Rolldown crosses the native->JS boundary for every module unless a hook
  // declares a filter (the plugin's own include only filters inside JS). With
  // zero markdown files this dispatch tax was measured at 76% of build time.
  const viteNs = await import('vite');
  if (viteNs.rolldownVersion && typeof mdxPlugin.transform === 'function') {
    mdxPlugin.transform = { filter: { id: /\\.(md|mdx)$/ }, handler: mdxPlugin.transform };
  }
  return {
  plugins: [
    ...tailwindPlugins,
    mdxPlugin,
    react({
      include: /\\.(md|mdx|js|jsx|ts|tsx)$/,
    }),
  ],
  resolve: {
    // Resolve symlinks to real paths so pnpm's symlinked transitive deps stay
    // reachable; dedupe keeps a single React copy across the symlinked packages.
    dedupe: ['react', 'react-dom'],
    preserveSymlinks: ${this.skipModules},
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
    // Icon libraries are dual CJS/ESM with no CSS side effects and megabyte-scale
    // generated modules; bundling them was 92% of SSR build input. They resolve
    // at render time from .facet/node_modules instead (output byte-identical).
    // @flanksource/facet stays bundled: externalizing it changes rendered HTML.
    noExternal: ['@flanksource/facet', new RegExp('^@flanksource/(?!icons)')],
    resolve: {
      conditions: ['node', 'import', 'module', 'browser', 'default'],
      externalConditions: ['node'],
    },
  },
  build: {
    ssr: true,
    target: 'node20',
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
  };
});
`;

    const configPath = join(this.facetRoot, 'vite.config.ts');
    writeFileSync(configPath, config, 'utf-8');

    this.logger.debug('Generated vite.config.ts');
  }

  /**
   * Generate the live-render scaffold: a client entry that mounts the template
   * into the DOM, an index.html, and a Vite dev-server config. Used by the
   * --live path so DOM-measuring components (diagrams/react-xarrows) render in a
   * real browser. The SSR entry.tsx is reused as the template source.
   */
  generateClientScaffold(data: Record<string, unknown>): void {
    this.logger.debug('Generating live-render client scaffold');

    const clientEntry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import Template from './entry.tsx';

const data = (window).__FACET_DATA__ || {};
const root = createRoot(document.getElementById('facet-root'));
root.render(React.createElement(Template, { data }));
`;
    writeFileSync(join(this.facetRoot, 'entry.client.tsx'), clientEntry, 'utf-8');

    // Data is injected as a global rather than bundled so the existing
    // --data/--data-loader loaders remain the single source of truth.
    const dataScript = serializeInjectedData(data);
    writeFileSync(join(this.facetRoot, 'facet-data.js'), dataScript, 'utf-8');

    const indexHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="facet-root"></div>
    <script src="/facet-data.js"></script>
    <script type="module" src="/entry.client.tsx"></script>
  </body>
</html>
`;
    writeFileSync(join(this.facetRoot, 'index.html'), indexHtml, 'utf-8');

    const { imports, remarkArray, rehypeArray } = this.mdxPluginSource();
    const config = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeRaw from 'rehype-raw';
import { resolve } from 'path';
import { createRequire } from 'module';${imports}

const facetRequire = createRequire(import.meta.url);
const tailwindMajor = Number(facetRequire('tailwindcss/package.json').version.split('.')[0]);

export default defineConfig(async () => {
  const tailwindPlugins = tailwindMajor === 4
    ? [(await import('@tailwindcss/vite')).default()]
    : [];
  return {
  plugins: [
    ...tailwindPlugins,
    // enforce: 'pre' — in dev mode plugin-react's transform runs before
    // array-ordered plugins, so MDX must be hoisted to the pre stage or
    // react-babel parses raw .mdx and fails. Build mode respects array order.
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: ${remarkArray},
        rehypePlugins: ${rehypeArray},
        include: [/\\.(md|mdx)$/],
      }),
    },
    react({
      include: /\\.(md|mdx|js|jsx|ts|tsx)$/,
    }),
  ],
  resolve: {
    // Resolve symlinks to real paths so pnpm's symlinked transitive deps
    // (e.g. d3-array → internmap) are reachable during esbuild dep optimization.
    // dedupe keeps a single React copy, which preserveSymlinks otherwise guarded.
    dedupe: ['react', 'react-dom'],
    preserveSymlinks: ${this.skipModules},
    alias: {
      '@flanksource/facet': resolve(__dirname, 'node_modules/@flanksource/facet'),
      '@facet': resolve(__dirname, 'node_modules/@flanksource/facet'),
      '@facet/core': resolve(__dirname, 'node_modules/@flanksource/facet'),
      '@src': resolve(__dirname, 'src'),
      'react-icons': resolve(__dirname, 'node_modules/react-icons'),
    },
    conditions: ['import', 'module', 'browser', 'default'],
  },
  };
});
`;
    writeFileSync(join(this.facetRoot, 'vite.client.config.ts'), config, 'utf-8');

    this.generatePostCSSConfig();
    this.logger.debug('Generated live-render client scaffold');
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
  async generatePackageJson(): Promise<void> {
    this.logger.debug('Generating package.json');

    if (this.skipModules) {
      const facetPackage = JSON.parse(readFileSync(rootPackageJson, 'utf-8'));
      const packageContent = JSON.stringify(createDefaultModulePackageJson({
        facetVersion: VERSION,
        facetPackage,
      }), null, 2);
      const packagePath = join(this.facetRoot, 'package.json');
      let existingPackage = '';
      try { existingPackage = readFileSync(packagePath, 'utf-8'); } catch { /* first generation */ }
      if (existingPackage !== packageContent) writeFileSync(packagePath, packageContent, 'utf-8');
      this.removePaths(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']);
      const npmrcPath = join(this.facetRoot, '.npmrc');
      writeFileSync(npmrcPath, defaultModuleNpmrc(), { encoding: 'utf-8', mode: 0o600 });
      chmodSync(npmrcPath, 0o600);
      this.logger.debug('Generated consumer-independent skip-modules manifest');
      return;
    }

    const facetOverride = this.skipModules ? undefined : resolveFacetPackageOverride();
    if (facetOverride?.kind === 'directory') {
      await this.ensureLocalFacetPackageBuilt(facetOverride.path);
    }

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

        const consumerPnpm = consumerPackage.pnpm;
        if (consumerPnpm && typeof consumerPnpm === 'object') {
          const resolvedPnpmField = { ...consumerPnpm } as Record<string, unknown>;
          if (resolvedPnpmField.overrides) {
            resolvedPnpmField.overrides = resolveOverrideValues(resolvedPnpmField.overrides as Record<string, unknown>, this.consumerRoot);
          }
          pnpmField = resolvedPnpmField;
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

    // Read package metadata from the local override when FACET_PACKAGE_PATH is a
    // directory; otherwise use the package metadata embedded into the CLI build.
    const rootPackageText = facetOverride?.kind === 'directory'
      ? this.readLocalFacetFile(facetOverride.path, 'package.json', true)
      : readFileSync(rootPackageJson, 'utf-8');
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
      'remark-frontmatter',
      'remark-github-blockquote-alert',
      'rehype-raw',
      'mermaid',
      'react-icons',
      'react-xarrows',
      '@flanksource/icons',
      '@iconify/react',
      'typescript',
      '@tailwindcss/typography',
      '@tailwindcss/postcss',
      '@tailwindcss/vite',
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
    if (facetOverride) {
      dependencies['@flanksource/facet'] = `file:${facetOverride.path}`;
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
    if (facetOverride?.kind === 'directory') {
      packageJson.facetLocalOverride = {
        path: facetOverride.path,
        fingerprint: localFacetBuildFingerprint(facetOverride.path),
      };
    }
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
    if (facetOverride?.kind === 'directory') {
      this.removeStaleInstalledLocalFacetOverride(facetOverride.path);
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
      // facet runs pnpm under a non-interactive shell (and CI). Without this,
      // pnpm aborts with ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY when it
      // wants to confirm purging a node_modules dir it considers foreign
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
      // Restrict to owner-only — inherited lines may carry auth tokens.
      writeFileSync(npmrcPath, npmrcContent, { encoding: 'utf-8', mode: 0o600 });
      chmodSync(npmrcPath, 0o600);
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
        const unsetVar = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
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

  private readLocalFacetFile(packageRoot: string, relPath: string, required: boolean): string {
    const path = join(packageRoot, relPath);
    try {
      return readFileSync(path, 'utf-8');
    } catch (error) {
      if (!required) throw error;
      throw new Error(
        `FACET_PACKAGE_PATH points to ${packageRoot}, but ${relPath} could not be read: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async ensureLocalFacetPackageBuilt(packageRoot: string): Promise<void> {
    const isCurrent = (): boolean =>
      !needsLocalFacetComponentsBuild(packageRoot) && !needsLocalFacetCssBuild(packageRoot);
    if (isCurrent()) {
      this.logger.debug(`FACET_PACKAGE_PATH build outputs are current: ${packageRoot}`);
      return;
    }

    await this.withLocalFacetBuildLock(packageRoot, async () => {
      // Another process may have completed the build while this process waited.
      if (isCurrent()) return;
      const shouldBuildCss = needsLocalFacetCssBuild(packageRoot);
      if (needsLocalFacetComponentsBuild(packageRoot)) {
        await this.runLocalFacetBuildScript(packageRoot, 'build:components');
      }
      // vite.lib.config.ts empties dist/ before building components. If CSS was
      // current before that run, it may now be missing, so re-check afterward.
      if (shouldBuildCss || needsLocalFacetCssBuild(packageRoot)) {
        await this.runLocalFacetBuildScript(packageRoot, 'build:css');
      }
    });
  }

  private async withLocalFacetBuildLock(
    packageRoot: string,
    action: () => void | Promise<void>,
  ): Promise<void> {
    const lockPath = join(packageRoot, '.facet-local-build.lock');
    const deadline = Date.now() + LOCAL_BUILD_TIMEOUT_MS;
    let fd: number | undefined;
    while (fd === undefined) {
      let acquiredFd: number;
      try {
        acquiredFd = openSync(lockPath, 'wx');
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'EEXIST') throw error;
        try {
          if (Date.now() - statSync(lockPath).mtimeMs > LOCAL_BUILD_TIMEOUT_MS * 2) {
            unlinkSync(lockPath);
            continue;
          }
        } catch {
          if (Date.now() >= deadline) {
            throw new Error(`Timed out waiting for local Facet build lock: ${lockPath}`);
          }
          await new Promise<void>((resolveWait) => setTimeout(resolveWait, 100));
          continue;
        }
        if (Date.now() >= deadline) {
          throw new Error(`Timed out waiting for local Facet build lock: ${lockPath}`);
        }
        await new Promise<void>((resolveWait) => setTimeout(resolveWait, 100));
        continue;
      }

      try {
        writeFileSync(acquiredFd, `${process.pid}\n`);
        fd = acquiredFd;
      } catch (error) {
        try { closeSync(acquiredFd); } catch { /* preserve the write error */ }
        try { unlinkSync(lockPath); } catch { /* preserve the write error */ }
        throw error;
      }
    }
    try {
      await action();
    } finally {
      closeSync(fd);
      try { unlinkSync(lockPath); } catch { /* already cleaned up */ }
    }
  }

  private removeStaleInstalledLocalFacetOverride(packageRoot: string): void {
    const installedRoot = join(this.facetRoot, 'node_modules/@flanksource/facet');
    if (!existsSync(installedRoot)) return;

    let isStale = false;
    try {
      isStale = facetBuildContentFingerprint(packageRoot) !== facetBuildContentFingerprint(installedRoot);
    } catch (error) {
      isStale = true;
      this.logger.warn(
        `Could not compare installed FACET_PACKAGE_PATH override with ${packageRoot}; reinstalling @flanksource/facet: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (!isStale) return;

    this.removePaths(['node_modules/@flanksource/facet', 'pnpm-lock.yaml']);
    this.logger.debug('Removed stale installed @flanksource/facet local override');
  }

  private async runLocalFacetBuildScript(packageRoot: string, script: string): Promise<void> {
    this.logger.info(`FACET_PACKAGE_PATH local override is stale; running pnpm run ${script}`);
    try {
      const result = await runLowPriority({
        command: 'pnpm',
        args: ['run', script],
        options: { cwd: packageRoot },
        timeoutMs: LOCAL_BUILD_TIMEOUT_MS,
        maxBufferBytes: 50 * 1024 * 1024,
      });
      if (result.stdout.length > 0) this.logger.debug(result.stdout.toString());
      if (result.stderr.length > 0) this.logger.debug(result.stderr.toString());
    } catch (error) {
      if (!(error instanceof LowPriorityProcessError)) throw error;
      const stdout = error.stdout.toString();
      const stderr = error.stderr.toString();
      if (stdout) this.logger.debug(stdout);
      if (stderr) this.logger.debug(stderr);
      if (error.cause !== undefined && error.exitCode === null && !error.timedOut) throw error.cause;
      const reason = error.timedOut
        ? `timed out after ${LOCAL_BUILD_TIMEOUT_MS / 1000}s`
        : `failed with exit code ${error.exitCode ?? 'unknown'}`;
      throw new Error(`pnpm run ${script} ${reason} in ${packageRoot}:\n${stdout}${stderr}`);
    }
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
    this.logger.debug('Generating Tailwind-compatible postcss.config.js');
    const config = `import autoprefixer from 'autoprefixer';
import { createRequire } from 'module';

const facetRequire = createRequire(import.meta.url);
const tailwindMajor = Number(facetRequire('tailwindcss/package.json').version.split('.')[0]);
const plugins = [autoprefixer()];
if (tailwindMajor === 3) {
  const tailwindcss = (await import('tailwindcss')).default;
  plugins.unshift(tailwindcss(process.env.FACET_POST_PROCESS === '1'
    ? './tailwind.postprocess.config.js'
    : './tailwind.config.js'));
}

export default { plugins };
`;

    writeFileSync(join(this.facetRoot, 'postcss.config.js'), config, 'utf-8');
    this.logger.debug('Generated postcss.config.js');
  }

  /**
   * Generate default tailwind.config.js if consumer doesn't have one
   */
  generateTailwindConfig(): void {
    const consumerConfigName = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts']
      .find((name) => existsSync(join(this.consumerRoot, name)));
    const config = consumerConfigName
      ? `import consumerConfig from './src/${consumerConfigName}';
export default consumerConfig;
`
      : `import typography from '@tailwindcss/typography';
export default {
  content: [
    "src/**/*.{html,js,jsx,ts,tsx,md,mdx}"
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
    const postProcessConfig = `import baseConfig from './tailwind.config.js';
export default {
  ...baseConfig,
  content: [...(baseConfig.content ?? []), './rendered-content.html'],
};
`;
    writeFileSync(join(this.facetRoot, 'tailwind.postprocess.config.js'), postProcessConfig, 'utf-8');
    this.logger.debug('Generated tailwind.config.js');
  }

  /**
   * Copy embedded styles.css to .facet/src/
   */
  copyStylesCss(): void {
    const installedStyles = join(this.facetRoot, 'node_modules/@flanksource/facet/dist/styles.css');
    const facetOverride = this.skipModules ? undefined : resolveFacetPackageOverride();
    const stylesPath = existsSync(installedStyles)
      ? installedStyles
      : facetOverride?.kind === 'directory'
        ? join(facetOverride.path, 'dist/styles.css')
        : assetPath('styles.css');
    writeFileSync(
      join(this.facetRoot, 'facet.css'),
      wrapFacetStylesInLayer(readFileSync(stylesPath, 'utf-8')),
      'utf-8',
    );

    const source = readFileSync(join(this.consumerRoot, this.templateFile), 'utf-8');
    const templateDir = dirname(join(this.consumerRoot, this.templateFile));
    const imports = [...source.matchAll(/(?:^|\n)\s*import\s+(?:[^'"\n]+\s+from\s+)?['"]([^'"]+\.css)['"]/g)]
      .map((match) => match[1])
      .map((specifier) => {
        if (!specifier.startsWith('.')) return specifier;
        const consumerPath = relative(this.consumerRoot, resolve(templateDir, specifier)).split(sep).join('/');
        return `./src/${consumerPath}`;
      });
    const postProcessLines = [
      "@import './facet.css';",
      ...imports.map((specifier) => `@import '${specifier}';`),
    ];
    const postProcess = [...postProcessLines, ''].join('\n');
    const normalizedTemplateFile = this.templateFile.replaceAll('\\', '/').replace(/^\.\//, '');
    const staticSource = normalizedTemplateFile.includes('/')
      ? normalizedTemplateFile.slice(0, normalizedTemplateFile.indexOf('/'))
      : normalizedTemplateFile;
    const postProcessV4 = [
      ...postProcessLines,
      '@import "tailwindcss/theme.css" layer(theme);',
      '@import "tailwindcss/utilities.css" layer(utilities) source(none);',
      `@source "./src/${staticSource}";`,
      '@source "./rendered-content.html";',
      '',
    ].join('\n');
    writeFileSync(join(this.facetRoot, 'post-process.css'), postProcess, 'utf-8');
    writeFileSync(join(this.facetRoot, 'post-process-v4.css'), postProcessV4, 'utf-8');
    writeFileSync(join(this.facetRoot, 'post-process.entry.ts'), "import './post-process.css';\n", 'utf-8');
    writeFileSync(join(this.facetRoot, 'post-process-v4.entry.ts'), "import './post-process-v4.css';\n", 'utf-8');
    this.logger.debug(`Generated Facet CSS entry with ${imports.length} consumer stylesheet import(s)`);
  }


  /**
   * Digest of the generated build configuration that shapes SSR output —
   * folded into the build-cache key so config changes at an unchanged facet
   * version invalidate cached bundles.
   */
  generatedConfigDigest(): string {
    const hash = createHash('sha256');
    const generated = [
      'vite.config.ts', 'postcss.config.js', 'tailwind.config.js',
      'tailwind.postprocess.config.js', 'post-process.css', 'post-process-v4.css',
    ];
    for (const name of generated) {
      try {
        hash.update(name);
        hash.update('\0');
        hash.update(readFileSync(join(this.facetRoot, name)));
        hash.update('\0');
      } catch { /* variant-specific file not generated */ }
    }
    return hash.digest('hex');
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
