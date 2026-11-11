import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { needsLocalFacetComponentsBuild } from './facet-directory.js';

describe('page-size catalog build freshness', () => {
  it('rebuilds local components when only the JSON catalog changes', async () => {
    const scratch = resolve(import.meta.dirname, '../../../.tmp');
    await mkdir(scratch, { recursive: true });
    const root = await mkdtemp(join(scratch, 'page-size-build-'));
    try {
      await mkdir(join(root, 'src/types'), { recursive: true });
      await mkdir(join(root, 'dist/components'), { recursive: true });
      await writeFile(join(root, 'dist/components/index.js'), 'export {};');
      const catalog = join(root, 'src/types/page-sizes.json');
      await writeFile(catalog, JSON.stringify({ 'powerpoint-standard': { width: 960, height: 720, unit: 'px' } }));
      const changed = new Date(Date.now() + 60_000);
      await utimes(catalog, changed, changed);
      expect(needsLocalFacetComponentsBuild(root)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
