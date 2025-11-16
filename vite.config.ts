import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

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
