import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts', 'src/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    // Renders shell out to pnpm install + Vite builds, which are slow.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
