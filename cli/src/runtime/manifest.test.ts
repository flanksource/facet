import { describe, expect, it } from 'vitest';
import { createDefaultModulePackageJson } from './manifest.js';
import { isStoreCorruptionError } from './install.js';

const facetVersion = '1.2.3';
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
      tailwindcss: '^4.1.17',
      autoprefixer: '^10.4.16',
      postcss: '^8.5.0',
    },
    pnpm: { overrides: { vite: '6.4.3' } },
  };
}

describe('default runtime dependency manifest', () => {
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
  it('recognizes the pnpm store-corruption signature', () => {
    expect(isStoreCorruptionError(
      'ERR_PNPM_ENOENT  [importPackage /x/node_modules/socks-proxy-agent] the source path is not an existing regular file, reflink \'/store/files/d2/8295\' -> \'/x/README.md\'',
    )).toBe(true);
    expect(isStoreCorruptionError('ERR_PNPM_ENOENT  no such file /x/package.json')).toBe(false);
    expect(isStoreCorruptionError('ERR_PNPM_FETCH_404 package not found')).toBe(false);
  });
});
