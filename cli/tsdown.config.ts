import { defineConfig } from 'tsdown';

// Library build only — the CLI binary is built separately (tsdown.sea.config.ts).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  external: ['tsx', 'puppeteer-core', 'vite', 'react', 'react-dom', /\.yaml$/, /\.json$/, /\.css$/],
  platform: 'node',
  target: 'node18',
  shims: false,
});
