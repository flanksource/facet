// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), access: vi.fn(), read: vi.fn(), build: vi.fn() }));
vi.mock('node:module', () => ({ createRequire: () => ({ resolve: mocks.resolve }) }));
vi.mock('node:fs', async (original) => ({ ...await original<typeof import('node:fs')>(), accessSync: mocks.access, readFileSync: mocks.read }));
vi.mock('@flanksource/page-runtime/build', () => ({ buildLibraryRuntime: mocks.build }));

const script = new URL('../../scripts/build-runtime.mjs', import.meta.url).href;
const libraryDir = fileURLToPath(new URL('../../', import.meta.url));
const basePath = '/installed/clicky-ui/dist/runtime/importmap.json';
const base = { fragment: 1, name: '@flanksource/clicky-ui', imports: {} };

describe('Facet runtime build hook', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    mocks.resolve.mockReturnValue(basePath);
    mocks.read.mockReturnValue(JSON.stringify(base));
    mocks.build.mockResolvedValue({});
  });

  it.each(['not exported', 'missing file'])('names the required clicky-ui version when its fragment is %s', async (failure) => {
    const cause = new Error(failure);
    if (failure === 'not exported') mocks.resolve.mockImplementationOnce(() => { throw cause; });
    else mocks.access.mockImplementationOnce(() => { throw cause; });
    await expect(import(script)).rejects.toThrow(/requires @flanksource\/clicky-ui >=0\.3\.57 shipping runtime\/importmap\.json/);
    expect(mocks.build).not.toHaveBeenCalled();
  });

  it('calls the compiled shared builder with the installed base and facet root', async () => {
    await import(script);
    expect(mocks.build).toHaveBeenCalledWith({ libraryDir, outDir: fileURLToPath(new URL('../../dist/runtime/', import.meta.url)), base });
  });

  it('propagates compiler errors', async () => {
    mocks.build.mockRejectedValue(new Error('dependency compiler failed'));
    await expect(import(script)).rejects.toThrow('dependency compiler failed');
  });
});
