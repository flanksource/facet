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
  external: ['tsx', 'puppeteer-core', 'sharp', 'pdfjs-dist/legacy/build/pdf.mjs', '@napi-rs/canvas', 'vite', 'react', 'react-dom', /\.yaml$/, /\.css$/],
  noExternal: [/.*/],
  outputOptions: { inlineDynamicImports: true },
  platform: 'node',
  target: 'node24',
  shims: false,
});
