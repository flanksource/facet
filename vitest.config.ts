import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// The component package had tests but no runner: `cli/vitest.config.ts` globs
// are relative to `cli/`, so `src/**/*.test.tsx` was never executed anywhere.
export default defineConfig({
  resolve: {
    alias: {
      '@src': resolve(__dirname, './src'),
      '@facet': resolve(__dirname, './src/components/index.tsx'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'cli/**'],
  },
});
