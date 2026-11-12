import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { materializeRuntime, payloadSatisfies, type RuntimePayload } from './payload.js';
import { runtimePlatform } from './platform.js';

const roots: string[] = [];
function fixture() {
  mkdirSync(resolve('../.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('../.tmp/runtime-payload-'));
  roots.push(root);
  const content = join(root, 'content');
  mkdirSync(join(content, 'node_modules/react'), { recursive: true });
  writeFileSync(join(content, 'node_modules/react/package.json'), JSON.stringify({ name: 'react', version: '18.3.1' }));
  const archive = join(root, 'runtime.tgz');
  execFileSync('tar', ['-czf', archive, '-C', content, '.']);
  const payload: RuntimePayload = { schema: 1, facetVersion: '1.2.3', target: runtimePlatform(), versions: { react: '18.3.1' }, sha256: createHash('sha256').update(readFileSync(archive)).digest('hex') };
  return { payload, archive, cacheRoot: join(root, 'cache'), facetVersion: '1.2.3' };
}
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

describe('installed runtime payloads', () => {
  it('materializes once without a package manager and reuses the runtime across callers', async () => {
    const options = fixture();
    const [first, second] = await Promise.all([materializeRuntime(options), materializeRuntime(options)]);
    rmSync(options.archive);
    expect(await materializeRuntime(options)).toEqual(first);
    expect(second).toEqual(first);
  });
  it('rejects modified payload bytes before publication', async () => {
    const options = fixture();
    writeFileSync(options.archive, 'damaged archive');
    await expect(materializeRuntime(options)).rejects.toThrow('integrity');
  });
  it('rejects a runtime for another Facet release or machine', async () => {
    const options = fixture();
    await expect(materializeRuntime({ ...options, facetVersion: '2.0.0' })).rejects.toThrow('does not match');
    await expect(materializeRuntime({ ...options, payload: { ...options.payload, target: { platform: 'other', arch: 'other' } } })).rejects.toThrow('this machine needs');
  });
  it('matches compatible dependencies while respecting explicit overrides', () => {
    const { payload } = fixture();
    expect([
      payloadSatisfies(payload, { dependencies: { react: '^18' } }),
      payloadSatisfies(payload, { dependencies: { react: '^19' } }),
      payloadSatisfies(payload, { dependencies: { react: 'link:../react' } }),
      payloadSatisfies(payload, { dependencies: { react: '^18' }, overrides: { react: '18.3.1' } }),
    ]).toEqual([true, false, false, false]);
  });
});
