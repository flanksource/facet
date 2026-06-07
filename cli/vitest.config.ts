import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
