import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
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
