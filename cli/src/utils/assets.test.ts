// Verifies asset resolution returns the correct on-disk files — in particular
// the repo-root @flanksource/facet manifest, not cli/package.json.
import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { assetPath } from './assets.js';

describe('assetPath', () => {
  it('resolves the repo-root @flanksource/facet package.json (not cli/package.json)', () => {
    const p = assetPath('package.json');
    expect(existsSync(p)).toBe(true);
    expect(JSON.parse(readFileSync(p, 'utf-8')).name).toBe('@flanksource/facet');
  });

  it('resolves styles.css, openapi.yaml, and the vite loaders to existing files', () => {
    for (const name of ['styles.css', 'openapi.yaml', 'vite-ssr-loader.ts', 'vite-dev-loader.ts'] as const) {
      expect(existsSync(assetPath(name))).toBe(true);
    }
  });
});
