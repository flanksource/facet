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

import { mkdirSync, existsSync, symlinkSync, writeFileSync, readdirSync, statSync, rmSync, readlinkSync, readFileSync } from 'fs';
import { join, relative, basename, dirname, resolve } from 'path';
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

function resolveFileProtocol(version: string, pkgDir: string, facetRoot: string): string {
  if (!version.startsWith('file:')) return version;
  const absPath = resolve(pkgDir, version.slice(5));
  return 'file:' + relative(facetRoot, absPath);
}

export class FacetDirectory {
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

    const entry = `import React from 'react';
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
    }),
    react({
      include: /\\.(mdx|js|jsx|ts|tsx)$/,
    }),
  ],
  resolve: {
    preserveSymlinks: true,  // Follow symlinks to their real paths
    alias: {
      '@flanksource/facet': resolve(__dirname, 'node_modules/@flanksource/facet/src/components'),
      '@facet': resolve(__dirname, 'node_modules/@flanksource/facet/src/components'),
      '@facet/core': resolve(__dirname, 'node_modules/@flanksource/facet/src/components'),
      '@src': resolve(__dirname, 'src'),
      'react-icons': resolve(__dirname, 'node_modules/react-icons'),
    },
    conditions: ['import', 'module', 'browser', 'default'],
  },
  ssr: {
    noExternal: ['react-icons'],
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
          '@facet': ['./node_modules/@flanksource/facet/src/components'],
          '@facet/*': ['./node_modules/@flanksource/facet/src/components/*'],
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
      'typescript',
      '@tailwindcss/typography',
      '@tailwindcss/postcss',
      'tailwindcss',
      'autoprefixer',
      'postcss',
    ];

    for (const dep of requiredDeps) {
      if (allDeps[dep]) {
        dependencies[dep] = allDeps[dep];
      }
    }

    // Add @flanksource/facet itself so Vite can resolve @facet alias
    dependencies['@flanksource/facet'] = rootPackage.version;

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

    const packageJson = {
      name: '.facet-build',
      private: true,
      type: 'module',
      dependencies,
    };

    const packagePath = join(this.facetRoot, 'package.json');
    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf-8');

    this.logger.debug('Generated package.json');
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
    "src/**/*.{html,js,jsx,ts,tsx,mdx}",
    "./node_modules/@flanksource/facet/src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Open Sans", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Consolas", "Monaco", "Courier New", "monospace"],
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
