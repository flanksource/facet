// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), access: vi.fn(), spawn: vi.fn() }));
vi.mock('node:module', () => ({ createRequire: () => ({ resolve: mocks.resolve }) }));
vi.mock('node:fs', async (original) => ({ ...await original<typeof import('node:fs')>(), accessSync: mocks.access }));
vi.mock('node:child_process', () => ({ spawnSync: mocks.spawn }));

const script = new URL('../../scripts/build-runtime.mjs', import.meta.url).href;
const libraryDir = fileURLToPath(new URL('../../', import.meta.url));
const basePath = '/installed/clicky-ui/dist/runtime/importmap.json';
const buildPath = '/installed/page-runtime/src/build/index.ts';
const loaderPath = '/installed/tsx/dist/loader.mjs';
const originalExitCode = process.exitCode;

describe('Facet runtime build hook', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    mocks.resolve.mockImplementation((specifier: string) => {
      if (specifier === '@flanksource/clicky-ui/runtime/importmap.json') return basePath;
      if (specifier === '@flanksource/page-runtime/build') return buildPath;
      if (specifier === 'tsx') return loaderPath;
      throw new Error(`Unexpected specifier: ${specifier}`);
    });
    mocks.spawn.mockReturnValue({ status: 0, signal: null });
  });

  afterEach(() => { process.exitCode = originalExitCode; });

  it.each(['not exported', 'missing file'])('names the required clicky-ui version when its fragment is %s', async (failure) => {
    const cause = new Error(failure);
    if (failure === 'not exported') mocks.resolve.mockImplementationOnce(() => { throw cause; });
    else mocks.access.mockImplementationOnce(() => { throw cause; });
    await expect(import(script)).rejects.toThrow(/requires @flanksource\/clicky-ui >=0\.3\.57 shipping runtime\/importmap\.json/);
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it('runs the installed shared CLI with the installed base and facet root', async () => {
    await import(script);
    expect(mocks.spawn).toHaveBeenCalledWith(process.execPath, [
      '--import', loaderPath, '/installed/page-runtime/scripts/build-library-runtime.ts',
      libraryDir, basePath,
    ], { cwd: libraryDir, stdio: 'inherit' });
  });

  it('propagates a failing CLI exit code', async () => {
    mocks.spawn.mockReturnValue({ status: 1, signal: null });
    await import(script);
    expect(process.exitCode).toBe(1);
  });

  it('fails loudly when the CLI cannot start', async () => {
    const error = new Error('spawn failed');
    mocks.spawn.mockReturnValue({ error, status: null, signal: null });
    await expect(import(script)).rejects.toThrow(error);
  });

  it('reports a terminated CLI instead of returning success', async () => {
    mocks.spawn.mockReturnValue({ status: null, signal: 'SIGTERM' });
    await expect(import(script)).rejects.toThrow('Facet runtime build terminated by SIGTERM');
  });
});
