import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    env: { FACET_CACHE_DIR: process.env.FACET_CACHE_DIR ?? resolve(import.meta.dirname, '.tmp/test-runtime-cache') },
    globals: true,
    server: { deps: { external: ['pptxgenjs-plus'] } },
    include: ['test/**/*.test.ts', 'src/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    // Integration suites share examples/.facet install state and browser
    // resources, so running files concurrently corrupts installs and stalls
    // both worker-pool setup hooks.
    fileParallelism: false,
    // Renders shell out to pnpm install + Vite builds, which are slow.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
