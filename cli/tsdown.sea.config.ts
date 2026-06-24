import { defineConfig } from 'tsdown';

// Single-file CommonJS bundle of the CLI for the Node SEA binary. All CLI
// dependencies are bundled in; the render toolchain (vite/react/tsx) is loaded
// dynamically from .facet at runtime, so it is never statically reachable here
// and stays out of the bundle.
export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],
  outDir: 'dist-sea',
  dts: false,
  sourcemap: false,
  clean: true,
  noExternal: [/.*/],
  external: ['vite', 'react', 'react-dom', '@vitejs/plugin-react', '@mdx-js/rollup', 'remark-gfm', 'tsx'],
  platform: 'node',
  target: 'node20',
  shims: true,
  // SEA embeds a single main script — force everything into one chunk. The
  // entry's own `#!/usr/bin/env node` shebang is preserved, which the SEA
  // runtime ignores and the @flanksource/facet-cli npm bin uses.
  outputOptions: { inlineDynamicImports: true },
});
