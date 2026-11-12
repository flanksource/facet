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

import { mkdirSync, existsSync, symlinkSync, writeFileSync, readdirSync, statSync, rmSync, readlinkSync, readFileSync, lstatSync, unlinkSync, chmodSync, openSync, closeSync, copyFileSync } from 'fs';
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
  type RedactPolicy,
} from './remark-config.js';

import { assetPath } from '../utils/assets.js';
import { createDefaultModulePackageJson, defaultModuleNpmrc, REQUIRED_DEPENDENCIES } from '../runtime/manifest.js';
import { VERSION } from '../version-generated.js';
import { dependencyManifest } from '../runtime/dependencies.js';
import { LowPriorityProcessError, runLowPriority } from '../utils/subprocess-priority.js';
import { SHARP_VERSION } from '../utils/sharp.js';
import { PDFJS_VERSION, PDFJS_CANVAS_VERSION } from '../utils/pdfjs.js';
import { pageStyles, wrapFacetStylesInLayer } from '../../../dist/page-styles/index.mjs';
export { wrapFacetStylesInLayer } from '../../../dist/page-styles/index.mjs';
import { resolveConsumerDependencies, readWorkspaceOverrides, resolveOverrideValues } from './consumer-dependencies.js';
import { computeTemplateBuildKey } from '../bundler/build-cache.js';

const rootPackageJson = assetPath('package.json');

export interface FacetDirectoryOptions {
  buildRoot?: string;
  /** Consumer's project root directory */
  consumerRoot: string;
  /** Template file to build */
  templateFile: string;
  /** Logger instance */
  logger: Logger;
  /** Extra remark/rehype plugins declared in the template's frontmatter. */
  remarkConfig?: RemarkConfig;
  /** Which classified regions this build may carry. Absent leaves content untouched. */
  redact?: RedactPolicy;
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

// Embedded in the generated vite configs so an unsupported tailwindcss fails
// the first build step, before the SSR bundle runs, rather than mid-pipeline.
const TAILWIND_V4_GUARD = `const __dirname = fileURLToPath(new URL('.', import.meta.url));
const facetRequire = createRequire(import.meta.url);
const tailwindVersion = facetRequire('tailwindcss/package.json').version;
if (Number(tailwindVersion.split('.')[0]) !== 4) {
  throw new Error(\`Found tailwindcss \${tailwindVersion}; facet requires Tailwind CSS v4 (with @tailwindcss/vite). Upgrade tailwindcss to ^4 and install @tailwindcss/vite.\`);
}`;

export interface FacetPackageOverride {
  kind: 'directory' | 'tarball';
  path: string;
}

// Upper bound on a local FACET_PACKAGE_PATH rebuild (`pnpm run <script>`); a
// stuck script must not hang the CLI's install/build path indefinitely.
const LOCAL_BUILD_TIMEOUT_MS = 5 * 60 * 1000;

const SOURCE_DIR_SKIP = new Set(['node_modules', 'dist', '.git', '.facet', 'storybook-static']);
const COMPONENT_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json']);
const CSS_BUILD_INPUTS = [
  'src/styles.css',
  'src/page-styles/type-scale.mjs',
  'src/page-styles/font-scale.mjs',
  'src/page-styles/recipe.mjs',
  'src/page-styles/preset.mjs',
  'src/page-styles/stylesheet.mjs',
  'postcss/build-styles.mjs',
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
  if (!existsSync(join(packageRoot, 'dist/page-styles/index.mjs'))) return true;
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
  addTreeContentFingerprint(hash, packageRoot, 'dist/page-styles');
  return hash.digest('hex');
}

export function localFacetBuildFingerprint(packageRoot: string): string {
  const hash = createHash('sha256');
  hash.update(`root:${packageRoot}\n`);
  addFileFingerprint(hash, packageRoot, 'package.json');
  addFileFingerprint(hash, packageRoot, 'dist/styles.css');
  addTreeFingerprint(hash, packageRoot, 'dist/components');
  addTreeFingerprint(hash, packageRoot, 'dist/page-styles');
  return hash.digest('hex').slice(0, 20);
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
  private redact?: RedactPolicy;
  private skipModules: boolean;

  constructor(options: FacetDirectoryOptions) {
    this.consumerRoot = options.consumerRoot;
    this.facetRoot = options.buildRoot ?? join(this.consumerRoot, '.facet');
    this.facetSrc = join(this.facetRoot, 'src');
    this.templateFile = options.templateFile;
    this.logger = options.logger;
    this.remarkConfig = options.remarkConfig ?? EMPTY_REMARK_CONFIG;
    this.redact = options.redact;
    this.skipModules = options.skipModules ?? false;
  }

  /**
   * MDX plugin source for the generated vite configs: extra imports, the
   * remarkPlugins array (always-on defaults + frontmatter-declared plugins),
   * and the rehypePlugins array. Local plugin paths resolve relative to
   * the template file's directory.
   */
  /**
   * The redaction policy compiled into the bundle for the runtime `<Classified>`, which
   * applies it to TSX content the remark plugin never sees. Always emitted — the empty
   * policy when none is given — so a classified render fails closed instead of guessing.
   */
  private redactDefine(): string {
    return `define: { __FACET_REDACT__: ${JSON.stringify(JSON.stringify(this.redact ?? { allow: {} }))} },`;
  }

  /** Copied beside the generated config so `./facet-redact.mjs` resolves. */
  private copyRedactPlugin(): void {
    copyFileSync(assetPath('facet-redact.mjs'), join(this.facetRoot, 'facet-redact.mjs'));
    copyFileSync(assetPath('facet-runtime.mjs'), join(this.facetRoot, 'facet-runtime.mjs'));
  }

  private mdxPluginSource(): { imports: string; remarkArray: string; rehypeArray: string } {
    const templateDir = dirname(resolve(this.consumerRoot, this.templateFile));
    const codegen = generatePluginCodegen(this.remarkConfig, templateDir);
    // Relative, like facet-font-scale.mjs: a bare specifier would resolve
    // against the consumer's pinned facet version rather than this build's.
    const allImports = [`import facetRedact from './facet-redact.mjs';`, ...codegen.imports];
    return {
      imports: allImports.length ? '\n' + allImports.join('\n') : '',
      remarkArray: remarkPluginsArray(codegen.remarkItems, this.redact),
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
import { Page, RedactPolicyProvider } from '@flanksource/facet';
import { Icon } from '@iconify/react';
import Content from './src/${templateRelPath}';

export default function Template({ data }) {
  return (
    <RedactPolicyProvider policy={${JSON.stringify(this.redact ?? { allow: {} })}}><Page pageSize="a4" margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
      <article className="prose">
        <Content components={{ Icon }} {...data} />
      </article>
    </Page></RedactPolicyProvider>
  );
}
`
      : `import React from 'react';
import './facet.css';
import { RedactPolicyProvider } from '@flanksource/facet';
import Template from './src/${templateRelPath}';


export default function Entry(props) {
  return <RedactPolicyProvider policy={${JSON.stringify(this.redact ?? { allow: {} })}}><Template {...props} /></RedactPolicyProvider>;
}
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

    this.copyRedactPlugin();
    const { imports, remarkArray, rehypeArray } = this.mdxPluginSource();
    const config = `
import { defineConfig } from 'vite';
import { facetRuntimePlugin } from './facet-runtime.mjs';
import * as viteNs from 'vite';
import tailwind from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeRaw from 'rehype-raw';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';${imports}

${TAILWIND_V4_GUARD}

export default defineConfig(async () => {
  const tailwindPlugins = [tailwind()];
  const mdxPlugin = {
    enforce: 'pre',
    ...mdx({
      remarkPlugins: ${remarkArray},
      rehypePlugins: ${rehypeArray},
      include: [/\\.(md|mdx)$/],
      exclude: [/\\?raw(?:&|$)/],
    }),
  };
  const mdxTransform = mdxPlugin.transform;
  if (typeof mdxTransform === 'function') {
    mdxPlugin.transform = function(code, id, ...args) {
      if (/(?:\\?|&)raw(?:&|$)/.test(id)) return null;
      return mdxTransform.call(this, code, id, ...args);
    };
  }
  // Rolldown crosses the native->JS boundary for every module unless a hook
  // declares a filter (the plugin's own include only filters inside JS). With
  // zero markdown files this dispatch tax was measured at 76% of build time.
  if (viteNs.rolldownVersion && typeof mdxPlugin.transform === 'function') {
    mdxPlugin.transform = { filter: { id: /\\.(md|mdx)$/ }, handler: mdxPlugin.transform };
  }
  return {
  ${this.redactDefine()}
  cacheDir: resolve(__dirname, '.vite'),
  plugins: [
    { ...await facetRuntimePlugin(__dirname, 'node'), enforce: 'pre' },
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
    preserveSymlinks: true,
    alias: [
      { find: '@facet/core', replacement: '@flanksource/facet' },
      { find: '@facet', replacement: '@flanksource/facet' },
      { find: '@src', replacement: resolve(__dirname, 'src') },
    ],
    conditions: ['import', 'module', 'browser', 'default'],
  },
  ssr: {
    noExternal: true,
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
      formats: ['es'],
    },
    rolldownOptions: {
      output: {
        entryFileNames: 'bundle.mjs',
        codeSplitting: false,
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
import './live-tailwind.css';

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

    this.copyRedactPlugin();
    const { imports, remarkArray, rehypeArray } = this.mdxPluginSource();
    const config = `
import { defineConfig } from 'vite';
import { facetRuntimePlugin } from './facet-runtime.mjs';
import tailwind from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeRaw from 'rehype-raw';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';${imports}

${TAILWIND_V4_GUARD}

export default defineConfig(async () => {
  const tailwindPlugins = [tailwind()];
  const mdxPlugin = {
    enforce: 'pre',
    ...mdx({
      remarkPlugins: ${remarkArray},
      rehypePlugins: ${rehypeArray},
      include: [/\\.(md|mdx)$/],
      exclude: [/\\?raw(?:&|$)/],
    }),
  };
  const mdxTransform = mdxPlugin.transform;
  if (typeof mdxTransform === 'function') {
    mdxPlugin.transform = function(code, id, ...args) {
      if (/(?:\\?|&)raw(?:&|$)/.test(id)) return null;
      return mdxTransform.call(this, code, id, ...args);
    };
  }
  return {
  ${this.redactDefine()}
  cacheDir: resolve(__dirname, '.vite'),
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [
    { ...await facetRuntimePlugin(__dirname, 'browser'), enforce: 'pre' },
    ...tailwindPlugins,
    // enforce: 'pre' — in dev mode plugin-react's transform runs before
    // array-ordered plugins, so MDX must be hoisted to the pre stage or
    // react-babel parses raw .mdx and fails. Build mode respects array order.
    mdxPlugin,
    react({
      include: /\\.(md|mdx|js|jsx|ts|tsx)$/,
    }),
  ],
  resolve: {
    // Resolve symlinks to real paths so pnpm's symlinked transitive deps
    // (e.g. d3-array → internmap) are reachable during esbuild dep optimization.
    // dedupe keeps a single React copy, which preserveSymlinks otherwise guarded.
    dedupe: ['react', 'react-dom'],
    preserveSymlinks: true,
    alias: [
      { find: '@facet/core', replacement: '@flanksource/facet' },
      { find: '@facet', replacement: '@flanksource/facet' },
      { find: '@src', replacement: resolve(__dirname, 'src') },
    ],
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

        dependencies = await resolveConsumerDependencies({ dependencies: raw, packageDir: this.consumerRoot });

        // pnpm 11 keeps overrides in pnpm-workspace.yaml; pnpm 10 kept them in
        // package.json. Merge both, with package.json winning on a key present
        // in each, so a consumer mid-migration behaves the way pnpm itself does.
        const workspaceOverrides = readWorkspaceOverrides(this.consumerRoot);
        const consumerPnpm = consumerPackage.pnpm;
        if ((consumerPnpm && typeof consumerPnpm === 'object') || workspaceOverrides) {
          const resolvedPnpmField = { ...(consumerPnpm ?? {}) } as Record<string, unknown>;
          const merged = {
            ...workspaceOverrides,
            ...(resolvedPnpmField.overrides as Record<string, unknown> | undefined),
          };
          if (Object.keys(merged).length > 0) {
            resolvedPnpmField.overrides = resolveOverrideValues(merged, this.consumerRoot);
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
      throw new Error(`Failed to load consumer dependencies from ${join(this.consumerRoot, 'package.json')}: ${error}`, { cause: error });
    }

    // Read package metadata from the local override when FACET_PACKAGE_PATH is a
    // directory; otherwise use the package metadata embedded into the CLI build.
    const rootPackageText = facetOverride?.kind === 'directory'
      ? this.readLocalFacetFile(facetOverride.path, 'package.json', true)
      : readFileSync(rootPackageJson, 'utf-8');
    const rootPackage = JSON.parse(rootPackageText);
    const allDeps = { ...rootPackage.dependencies, ...rootPackage.devDependencies };

    // Extract only the dependencies we need for building
    const requiredDeps = REQUIRED_DEPENDENCIES;

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
        Object.assign(dependencies, await resolveConsumerDependencies({
          dependencies: { ...pkg.dependencies, ...pkg.devDependencies },
          packageDir: searchDir,
        }));
        this.logger.debug(`Merged deps from ${pkgPath}`);
        break;
      }
      searchDir = dirname(searchDir);
    }

    // Add lightningcss if not present (optional Vite dependency)
    if (!dependencies['lightningcss']) {
      dependencies['lightningcss'] = '^1.30.2';
    }

    // sharp backs `facet png --autocrop`; the SEA binary cannot embed the native
    // addon, so it has to be resolvable from .facet at runtime.
    if (!dependencies['sharp']) {
      dependencies['sharp'] = SHARP_VERSION;
    }
    dependencies['pdfjs-dist'] = PDFJS_VERSION;
    dependencies['@napi-rs/canvas'] = PDFJS_CANVAS_VERSION;

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
   * Generate default postcss.config.js if consumer doesn't have one
   */
  generatePostCSSConfig(): void {
    this.logger.debug('Generating Tailwind-compatible postcss.config.js');
    writeFileSync(join(this.facetRoot, 'facet-font-scale.mjs'),
      "export { facetFontScale as default } from '@flanksource/facet/page-styles';\n", 'utf-8');

    const config = `import autoprefixer from 'autoprefixer';
import facetFontScale from './facet-font-scale.mjs';

// Tailwind itself runs through @tailwindcss/vite. facetFontScale runs after
// it, rewriting the utilities it generated — the arbitrary text-[8pt] classes
// a template uses — and the --text-* theme properties its utilities read
// through var().
export default { plugins: [autoprefixer(), facetFontScale()] };
`;

    writeFileSync(join(this.facetRoot, 'postcss.config.js'), config, 'utf-8');
    this.logger.debug('Generated postcss.config.js');
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
    const normalizedTemplateFile = this.templateFile.replaceAll('\\', '/').replace(/^\.\//, '');
    const staticSource = normalizedTemplateFile.includes('/')
      ? normalizedTemplateFile.slice(0, normalizedTemplateFile.indexOf('/'))
      : normalizedTemplateFile;
    const postProcessV4 = [
      ...postProcessLines,
      pageStyles.entry,
      `@source "./src/${staticSource}";`,
      '@source "./rendered-content.html";',
      '',
    ].join('\n');
    // Live-render utilities: facet.css is pre-compiled and only covers classes
    // used by the facet library itself. The dev server must generate the
    // template's own classes (via @tailwindcss/vite source detection) before
    // the browser measures layout, or diagrams bake arrows against an unstyled
    // page. Imported by the live client entry only; the SSR path gets template
    // classes from the post-process pass instead.
    writeFileSync(join(this.facetRoot, 'live-tailwind.css'), '@tailwind utilities;\n', 'utf-8');
    writeFileSync(join(this.facetRoot, 'post-process-v4.css'), postProcessV4, 'utf-8');
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
      'package.json', 'runtime.json',
      'vite.config.ts', 'postcss.config.js', 'post-process-v4.css',
      // facet.css is the whole facet stylesheet and the SSR bundle inlines it.
      // Leaving it out meant editing facet's own CSS — or installing a patched
      // build at the same version — reused a bundle carrying the old styles,
      // which reads as the edit simply having no effect.
      'facet.css',
      // Same reasoning for the font-scale plugin: it rewrites every size in the
      // generated CSS, so a change to it changes the output of this build.
      'facet-font-scale.mjs',
      // The redaction plugin decides what content survives into the bundle. The
      // policy itself lives in vite.config.ts above, so two audiences already
      // fork the key; this covers a change to the plugin's own logic.
      'facet-redact.mjs',
      'facet-runtime.mjs',
    ];
    for (const name of generated) {
      try {
        hash.update(name);
        hash.update('\0');
        hash.update(readFileSync(join(this.facetRoot, name)));
        hash.update('\0');
      } catch { /* variant-specific file not generated */ }
    }
    const manifest = JSON.parse(readFileSync(join(this.facetRoot, 'package.json'), 'utf8'));
    for (const path of Object.keys(dependencyManifest(manifest).localDependencies ?? {})) {
      if (!statSync(path).isDirectory()) continue;
      hash.update(computeTemplateBuildKey({ consumerRoot: path, facetVersion: VERSION }));
      if (JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')).name === '@flanksource/facet') hash.update(facetBuildContentFingerprint(path));
      else addTreeContentFingerprint(hash, path, 'dist');
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
