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
  external: ['tsx', 'puppeteer', 'vite', 'react', 'react-dom'],
  platform: 'node',
  target: 'node18',
  shims: false,
});
