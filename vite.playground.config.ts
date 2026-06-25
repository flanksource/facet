import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Builds the Fill-PDF playground island: a self-contained IIFE bundle (React +
// clicky-ui JsonSchemaForm/Tabs/SplitPane + js-yaml) plus clicky-ui's CSS. The
// bundle is base64-inlined into cli/src/server/playground-form-generated.ts by
// cli/scripts/gen-playground-form.cjs so `facet serve` can embed and serve it at
// /playground-form.js (+ .css) with no runtime file dependency. The entry
// exposes window.FacetFillPdf.mountFillPdf(selector).
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  // clicky-ui ships already-compiled CSS; bypass facet's root Tailwind/PostCSS
  // pipeline so its `@layer` rules are not re-processed (which errors without a
  // matching `@tailwind` directive).
  css: { postcss: { plugins: [] } },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    cssCodeSplit: false,
    minify: true,
    lib: {
      entry: resolve(__dirname, 'src/playground/fill-pdf-app.tsx'),
      formats: ['iife'],
      name: 'FacetFillPdf',
      fileName: () => 'playground-form.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (asset) =>
          asset.name && asset.name.endsWith('.css') ? 'playground-form.css' : 'assets/[name][extname]',
      },
    },
  },
});
