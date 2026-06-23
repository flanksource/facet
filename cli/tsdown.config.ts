import { defineConfig } from 'tsdown';

// Library build only - CLI is built separately with Bun
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  external: ['tsx', 'puppeteer-core', 'vite', 'react', 'react-dom', 'bun', /\.yaml$/, /\.json$/, /\.css$/],
  platform: 'node',
  target: 'node18',
  shims: false,
});
