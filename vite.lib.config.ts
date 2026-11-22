import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      include: ['src/components/**', 'src/utils/**', 'src/types/**', 'src/playground/browser-runtime.tsx', 'src/playground/browser-page.ts'],
      outDir: 'dist',
      tsconfigPath: './tsconfig.lib.json',
    }),
  ],
  build: {
    target: 'esnext',
    lib: {
      entry: { 'components/index': resolve(__dirname, 'src/components/index.tsx'), 'playground/browser-runtime': resolve(__dirname, 'src/playground/browser-runtime.tsx') },
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        // Keep the dev JSX runtime external too, so a dev-mode build (jsxDEV)
        // still resolves it from the consumer's React at render time rather than
        // mis-bundling it (which surfaces as "jsxDEV is not a function").
        'react/jsx-dev-runtime',
        /^@flanksource\//,
        /^react-icons\//,
        '@iconify/react',
        'clsx',
        'dayjs',
        /^dayjs\//,
        'd3-scale',
        'd3-shape',
        'marked',
        'shiki',
        '@xyflow/react',
        'dagre',
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
  resolve: {
    alias: { '@src': resolve(__dirname, './src') },
  },
});
