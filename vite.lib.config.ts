import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/components/**', 'src/utils/**', 'src/types/**'],
      outDir: 'dist',
      tsconfigPath: './tsconfig.lib.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/components/index.tsx'),
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        /^@flanksource\//,
        /^react-icons\//,
        '@iconify/react',
        'clsx',
        'dayjs',
        'd3-scale',
        'd3-shape',
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
