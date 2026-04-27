import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolvePackageManager, _resetPackageManagerCache } from './package-manager.js';

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'facet-pm-test-'));
  _resetPackageManagerCache();
});

afterEach(async () => {
  _resetPackageManagerCache();
  await rm(workDir, { recursive: true, force: true });
});

describe('resolvePackageManager', () => {
  it('returns pnpm when no packageManager pin is present', async () => {
    await writeFile(join(workDir, 'package.json'), JSON.stringify({ name: 'x' }));
    const pm = await resolvePackageManager(workDir);
    expect(pm.cmd).toBe('pnpm');
    expect(pm.exec).toBe('pnpm exec');
    expect(pm.version).toMatch(/^\d+\.\d+/);
  });

  it('returns pnpm when packageManager pins pnpm', async () => {
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({ name: 'x', packageManager: 'pnpm@8.13.1' })
    );
    const pm = await resolvePackageManager(workDir);
    expect(pm.cmd).toBe('pnpm');
  });

  it('throws with a clear message when packageManager pins yarn', async () => {
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({ name: 'x', packageManager: 'yarn@4.0.0' })
    );
    await expect(resolvePackageManager(workDir)).rejects.toThrow(
      /facet requires pnpm.*yarn@4\.0\.0/s
    );
  });

  it('throws with a clear message when packageManager pins npm', async () => {
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({ name: 'x', packageManager: 'npm@10.2.0' })
    );
    await expect(resolvePackageManager(workDir)).rejects.toThrow(
      /facet requires pnpm.*npm@10\.2\.0/s
    );
  });

  it('walks up the directory tree to find the pin', async () => {
    const nested = join(workDir, 'a', 'b');
    const { mkdir } = await import('fs/promises');
    await mkdir(nested, { recursive: true });
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({ name: 'root', packageManager: 'pnpm@8.13.1' })
    );
    const pm = await resolvePackageManager(nested);
    expect(pm.cmd).toBe('pnpm');
  });

  it('ignores malformed package.json and keeps walking', async () => {
    const nested = join(workDir, 'child');
    const { mkdir } = await import('fs/promises');
    await mkdir(nested);
    await writeFile(join(nested, 'package.json'), '{not valid json');
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({ name: 'root', packageManager: 'pnpm@8.13.1' })
    );
    const pm = await resolvePackageManager(nested);
    expect(pm.cmd).toBe('pnpm');
  });
});
