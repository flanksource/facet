import { defineConfig } from 'tsdown';

// Builds the library (index) and the Node CLI (cli.mjs, the published `facet`
// bin). Heavy runtime deps stay external and are resolved from node_modules at
// install time; vite/tsx run as separate processes from the consumer's .facet/.
export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  outExtensions: () => ({ js: '.mjs' }),
  dts: { entry: 'src/index.ts' },
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  external: ['tsx', 'puppeteer-core', 'vite', 'react', 'react-dom', /\.yaml$/, /\.json$/, /\.css$/, /vite-ssr-loader/],
  platform: 'node',
  target: 'node18',
  shims: false,
});
