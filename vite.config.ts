import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { CarbonLoader } from './plugins/unplugin-carbon/src/index';
import scorecardPlugin from './plugins/vite-plugin-scorecard.js';
import securityPlugin from './plugins/vite-plugin-security.js';
import flanksourceIconsPlugin from './plugins/vite-plugin-flanksource-icons.js';

export default defineConfig(async () => {
  const mdx = await import('@mdx-js/rollup');
  const remarkGfm = await import('remark-gfm');

  // Determine which variant to build (default to all if not specified)
  const variant = process.env.DATASHEET_VARIANT || 'architecture';

  return {
    resolve: {
      alias: {
        '@src': resolve(__dirname, './src'),
      },
    },
    plugins: [
      flanksourceIconsPlugin(),
      {
        enforce: 'pre',
        ...mdx.default({
          remarkPlugins: [remarkGfm.default]
        })
      },
      scorecardPlugin(),
      securityPlugin(),
      // CarbonLoader({
      //   outputDir: 'assets/carbon-screenshots',
      //   cacheDir: '.cache/carbon-loader',
      //   carbonOptions: {
      //     theme: 'vscode',
      //     windowTheme: 'none',
      //     windowControls: true,
      //     fontFamily: 'Fira Code',
      //     fontSize: '14px',
      //     lineNumbers: true,
      //     dropShadow: false,
      //     exportSize: '2x',
      //     watermark: false,
      //   }
      // }),
      react()
    ],
    build: {
      ssr: true,
      outDir: 'dist',
      emptyOutDir: false, // Don't clean dist directory between builds
      lib: {
        entry: resolve(__dirname, `src/DatasheetApp-${variant}.tsx`),
        name: `DatasheetApp${variant.charAt(0).toUpperCase() + variant.slice(1)}`,
        fileName: `DatasheetApp-${variant}`,
        formats: ['cjs']
      },
      rollupOptions: {
        external: ['react', 'react-dom'],
        output: {
          exports: 'named'
        }
      },
      cssCodeSplit: false
    }
  };
});
