import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { Logger } from '../utils/logger.js';
import {
  createDefaultModulePackageJson,
  ensureGlobalModuleStore,
  isStoreCorruptionError,
  moduleCachePath,
  prepareProjectModules,
} from './module-store.js';

const scratchRoot = join(process.cwd(), '.tmp');
const roots: string[] = [];
const facetVersion = '1.2.3';
const sentinelVersions: Record<string, string> = {
  react: '18.3.1',
  vite: '6.4.3',
  '@vitejs/plugin-react': '4.2.0',
  '@flanksource/facet': facetVersion,
};

function scratch(): string {
  mkdirSync(scratchRoot, { recursive: true });
  const root = mkdtempSync(join(scratchRoot, 'module-store-'));
  roots.push(root);
  return root;
}

function embeddedPackage(): Record<string, unknown> {
  return {
    version: facetVersion,
    packageManager: 'pnpm@9.15.9',
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      '@flanksource/icons': '^1.0.53',
      '@iconify/react': '^5.1.0',
      'react-icons': '^5.4.0',
      'react-xarrows': '^2.0.2',
      'source-map-support': '^0.5.21',
      'd3-array': '^3.2.4',
      'd3-format': '^3.1.0',
      'd3-interpolate': '^3.0.1',
      'd3-scale': '^4.0.2',
      'd3-shape': '^3.2.0',
      'd3-time': '^3.1.0',
      'd3-time-format': '^4.1.0',
    },
    devDependencies: {
      vite: '^6.4.3',
      '@vitejs/plugin-react': '^4.2.0',
      '@mdx-js/rollup': '^3.0.0',
      'remark-gfm': '^4.0.0',
      'remark-frontmatter': '^5.0.0',
      'remark-github-blockquote-alert': '^2.1.0',
      'rehype-raw': '^7.0.0',
      mermaid: '^11.16.0',
      typescript: '^5.3.0',
      '@tailwindcss/typography': '^0.5.19',
      '@tailwindcss/postcss': '^4.1.17',
      '@tailwindcss/vite': '^4.1.17',
      tailwindcss: '^3.4.3',
      autoprefixer: '^10.4.16',
      postcss: '^8.5.0',
    },
    pnpm: { overrides: { vite: '6.4.3' } },
  };
}

function populateSentinels(root: string): void {
  for (const [name, version] of Object.entries(sentinelVersions)) {
    const packageRoot = join(root, 'node_modules', ...name.split('/'));
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ name, version }));
  }
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('global module store', () => {
  it('pins Facet to the CLI version in a consumer-independent manifest', () => {
    expect(createDefaultModulePackageJson({
      facetVersion,
      facetPackage: embeddedPackage(),
    })).toEqual({
      name: '.facet-default-modules',
      private: true,
      type: 'module',
      packageManager: 'pnpm@9.15.9',
      dependencies: expect.objectContaining({
        '@flanksource/facet': facetVersion,
        react: '^18.3.1',
        vite: '^6.4.3',
        lightningcss: '^1.30.2',
      }),
      pnpm: { overrides: { vite: '6.4.3' } },
    });
  });

  it('keys the immutable install by CLI, Node runtime, and manifest identity', () => {
    expect(moduleCachePath({
      cacheRoot: '/cache',
      facetVersion,
      platform: 'darwin',
      arch: 'arm64',
      nodeAbi: '127',
    })).toBe('/cache/modules/1.2.3/darwin-arm64-node127');
    expect(moduleCachePath({
      cacheRoot: '/cache',
      facetVersion,
      platform: 'darwin',
      arch: 'arm64',
      nodeAbi: '127',
      identity: 'abcdef0123456789',
    })).toBe('/cache/modules/1.2.3/darwin-arm64-node127-abcdef01');
  });

  it('lets same-version builds with different manifests coexist without reinstalling', async () => {
    const cacheRoot = scratch();
    let installs = 0;
    const install = async (root: string) => {
      installs++;
      populateSentinels(root);
      return '9.15.9';
    };
    const logger = new Logger(false);
    const longPackage = embeddedPackage();
    const shortPackage = embeddedPackage();
    delete (shortPackage.devDependencies as Record<string, string>).mermaid;

    const long = await ensureGlobalModuleStore({ cacheRoot, facetVersion, facetPackage: longPackage, logger, install });
    const short = await ensureGlobalModuleStore({ cacheRoot, facetVersion, facetPackage: shortPackage, logger, install });
    expect(short.root).not.toBe(long.root);
    expect(installs).toBe(2);

    await ensureGlobalModuleStore({ cacheRoot, facetVersion, facetPackage: longPackage, logger, install });
    await ensureGlobalModuleStore({ cacheRoot, facetVersion, facetPackage: shortPackage, logger, install });
    expect(installs).toBe(2);
  });

  it('prunes the oldest stores beyond FACET_MODULE_STORE_ENTRIES after an install', async () => {
    const cacheRoot = scratch();
    vi.stubEnv('FACET_MODULE_STORE_ENTRIES', '2');
    try {
      const install = async (root: string) => {
        populateSentinels(root);
        return '9.15.9';
      };
      const logger = new Logger(false);
      const packages = ['^18.3.1', '^18.3.2', '^18.3.3'].map((reactVersion) => {
        const facetPackage = embeddedPackage();
        (facetPackage.dependencies as Record<string, string>).react = reactVersion;
        return facetPackage;
      });

      const first = await ensureGlobalModuleStore({ cacheRoot, facetVersion, facetPackage: packages[0], logger, install });
      utimesSync(first.root, new Date(Date.now() - 60_000), new Date(Date.now() - 60_000));
      const second = await ensureGlobalModuleStore({ cacheRoot, facetVersion, facetPackage: packages[1], logger, install });
      const third = await ensureGlobalModuleStore({ cacheRoot, facetVersion, facetPackage: packages[2], logger, install });

      expect(existsSync(third.root)).toBe(true);
      expect(existsSync(second.root)).toBe(true);
      expect(existsSync(first.root)).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('recognizes the pnpm store-corruption signature', () => {
    expect(isStoreCorruptionError(
      'ERR_PNPM_ENOENT  [importPackage /x/node_modules/socks-proxy-agent] the source path is not an existing regular file, reflink \'/store/files/d2/8295\' -> \'/x/README.md\'',
    )).toBe(true);
    expect(isStoreCorruptionError('ERR_PNPM_ENOENT  no such file /x/package.json')).toBe(false);
    expect(isStoreCorruptionError('ERR_PNPM_FETCH_404 package not found')).toBe(false);
  });

  it('installs once and reuses a verified ready entry without mtime checks', async () => {
    const cacheRoot = scratch();
    let installs = 0;
    const options = {
      cacheRoot,
      facetVersion,
      facetPackage: embeddedPackage(),
      logger: new Logger(false),
      install: async (root: string) => {
        installs++;
        populateSentinels(root);
        return '9.15.9';
      },
    };

    const first = await ensureGlobalModuleStore(options);
    const second = await ensureGlobalModuleStore(options);

    expect(second).toEqual(first);
    expect(installs).toBe(1);
    expect(JSON.parse(readFileSync(join(first.root, '.ready.json'), 'utf-8'))).toMatchObject({
      facetVersion,
      pnpmVersion: '9.15.9',
    });
  });
});

describe('project module preparation', () => {
  it('clones the global install before reconciling the project manifest', async () => {
    const root = scratch();
    const cacheRoot = join(root, 'cache');
    const consumerRoot = join(root, 'consumer');
    const facetRoot = join(consumerRoot, '.facet');
    mkdirSync(facetRoot, { recursive: true });
    writeFileSync(join(facetRoot, 'package.json'), JSON.stringify({
      name: '.facet-build',
      private: true,
      dependencies: { '@flanksource/facet': facetVersion, 'custom-module': '2.0.0' },
    }));
    writeFileSync(join(facetRoot, '.npmrc'), 'node-linker=hoisted\n');

    const seed = await ensureGlobalModuleStore({
      cacheRoot,
      facetVersion,
      facetPackage: embeddedPackage(),
      logger: new Logger(false),
      install: async (installRoot) => {
        populateSentinels(installRoot);
        return '9.15.9';
      },
    });
    let clones = 0;
    let reconciles = 0;

    await prepareProjectModules({
      consumerRoot,
      facetRoot,
      seed,
      logger: new Logger(false),
      platform: 'darwin',
      clone: async (source, target) => {
        clones++;
        cpSync(source, target, { recursive: true });
      },
      install: async (installRoot) => {
        reconciles++;
        const manifest = JSON.parse(readFileSync(join(installRoot, 'package.json'), 'utf-8'));
        expect(manifest.dependencies['custom-module']).toBe('2.0.0');
        const customRoot = join(installRoot, 'node_modules', 'custom-module');
        mkdirSync(customRoot, { recursive: true });
        writeFileSync(join(customRoot, 'package.json'), '{"name":"custom-module","version":"2.0.0"}');
        return '9.15.9';
      },
    });

    expect(clones).toBe(1);
    expect(reconciles).toBe(1);
    expect(readFileSync(join(facetRoot, 'node_modules/custom-module/package.json'), 'utf-8')).toContain('2.0.0');
  });

  it('links skip mode directly to the global install without reconciling project modules', async () => {
    const root = scratch();
    const consumerRoot = join(root, 'consumer');
    const facetRoot = join(consumerRoot, '.facet');
    const seedRoot = join(root, 'seed');
    mkdirSync(facetRoot, { recursive: true });
    mkdirSync(join(seedRoot, 'node_modules'), { recursive: true });
    writeFileSync(join(facetRoot, 'package.json'), '{}');

    await prepareProjectModules({
      consumerRoot,
      facetRoot,
      seed: { root: seedRoot, nodeModules: join(seedRoot, 'node_modules'), identity: 'seed-id' },
      logger: new Logger(false),
      skipModules: true,
      install: async () => {
        throw new Error('project install must not run in skip mode');
      },
    });

    expect(readlinkSync(join(facetRoot, 'node_modules'))).toBe(join(seedRoot, 'node_modules'));
  });
});
