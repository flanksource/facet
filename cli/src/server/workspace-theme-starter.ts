import { readFileSync } from 'node:fs';
import { assetPath } from '../utils/assets.js';

export function workspaceThemeStarter(id: string): Record<string, string> {
  const name = id + '-facet-theme';
  const facet = JSON.parse(readFileSync(assetPath('package.json'), 'utf8'));
  const manifest = {
    name, version: '0.1.0', private: true, type: 'module', files: ['dist'],
    facet: {
      themes: { [id]: './theme' },
      themeEditor: { [id]: { defaults: 'theme.defaults.json', palette: { file: 'theme.css', selector: `[data-facet-theme="${id}"]` } } },
    },
    exports: {
      '.': { types: './dist/theme.d.ts', import: './dist/theme.js' },
      './theme': { types: './dist/theme.d.ts', import: './dist/theme.js' },
      './page-styles': './dist/page-styles.mjs', './styles.css': './dist/styles.css',
      './runtime/*': './dist/runtime/*', './package.json': './package.json',
    },
    scripts: { build: 'vite build && tsc --emitDeclarationOnly && node build-runtime.mjs' },
    devDependencies: {
      '@flanksource/facet': '^' + facet.version, '@flanksource/clicky-ui': facet.peerDependencies['@flanksource/clicky-ui'],
      '@flanksource/page-runtime-build': '^0.1.0', '@types/react': '^18.3.12',
      react: '^18.3.1', 'react-dom': '^18.3.1',
      typescript: facet.devDependencies.typescript, vite: facet.devDependencies.vite,
    },
    peerDependencies: { '@flanksource/facet': '>=' + facet.version, react: '>=18', 'react-dom': '>=18' },
  };
  return {
    'package.json': JSON.stringify(manifest, null, 2) + '\n',
    '.gitignore': 'node_modules/\ndist/\n.tmp/\n',
    'theme.defaults.json': '{}\n',
    'theme.tsx': `import { facetTheme, type FacetTheme } from '@flanksource/facet';
import defaults from './theme.defaults.json';
import './theme.css';

export const theme: FacetTheme = {
  id: '${id}',
  extends: facetTheme,
  defaults,
};
`,
    'theme.css': `[data-facet-theme="${id}"] {
  --theme-ink: #1e293b;
  --theme-accent: #2563eb;
  color: var(--theme-ink);
}

[data-facet-theme="${id}"] a { color: var(--theme-accent); }
`,
    'vite.config.mjs': `export default {
  css: { postcss: { plugins: [{
    postcssPlugin: 'theme-layer',
    Once(root) {
      const nodes = root.nodes.slice();
      root.removeAll();
      root.append({ name: 'layer', params: '${id}', nodes });
    },
  }] } },
  build: {
    lib: { entry: 'theme.tsx', formats: ['es'], fileName: () => 'theme.js', cssFileName: 'styles' },
    rolldownOptions: { external: [/^react(?:\\/|$)/, /^react-dom(?:\\/|$)/, /^@flanksource\\//] },
  },
};
`,
    'tsconfig.json': JSON.stringify({ compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx',
      resolveJsonModule: true, types: ['vite/client'], strict: true, skipLibCheck: true, declaration: true,
      emitDeclarationOnly: true, outDir: 'dist',
    }, include: ['**/*.ts', '**/*.tsx'], exclude: ['dist', 'node_modules'] }, null, 2) + '\n',
    'page-styles.mjs': `export const pageStyles = {
  name: '${name}', layer: '${id}', base: ['${name}/styles.css'],
  extends: ['@flanksource/facet'], runtimeDependencies: [], entry: '', theme: '',
};
`,
    'build-runtime.mjs': `import { copyFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildLibraryRuntime, composeImportMap } from '@flanksource/page-runtime-build';

const resolve = createRequire(import.meta.url).resolve;
const libraries = ['@flanksource/clicky-ui', '@flanksource/facet'];
const fragments = libraries.map(name => JSON.parse(readFileSync(resolve(name + '/runtime/importmap.json'), 'utf8')));
const { map, failures } = composeImportMap(fragments, '');
if (failures.length) throw new Error(failures.map(failure => failure.detail).join('\\n'));
const base = { fragment: 1, name: 'facet-theme-base', ...map, remaps: {}, aliases: {}, inherits: [],
  integrity: Object.assign({}, ...fragments.map(fragment => fragment.integrity)) };
copyFileSync(new URL('page-styles.mjs', import.meta.url), new URL('dist/page-styles.mjs', import.meta.url));
await buildLibraryRuntime({
  libraryDir: fileURLToPath(new URL('.', import.meta.url)),
  outDir: fileURLToPath(new URL('dist/runtime/', import.meta.url)),
  base,
});
`,
  };
}
