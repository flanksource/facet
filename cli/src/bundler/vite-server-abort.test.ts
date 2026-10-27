import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

const child = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock('../builders/facet-directory.js', () => ({
  FacetDirectory: class {
    create() {} async generatePackageJson() {} symlinkConsumerFiles() {} copyStylesCss() {}
    generateEntryWrapper() {} generateTsConfig() {} generateTailwindConfig() {} generateClientScaffold() {}
    getFacetRoot() { return process.cwd(); }
  },
}));
vi.mock('../utils/frontmatter.js', () => ({ readRemarkFrontmatter: () => undefined }));
vi.mock('./vite-builder.js', () => ({ prepareModules: async () => {} }));
vi.mock('../utils/subprocess-priority.js', () => ({ spawnLowPriority: () => child.current }));

import { Logger } from '../utils/logger.js';
import { startViteServer } from './vite-server.js';

describe('live Vite server cancellation', () => {
  it('stops a server that is still waiting for its startup handshake', async () => {
    const proc = Object.assign(new EventEmitter(), { stdout: new PassThrough(), kill: vi.fn() });
    proc.kill.mockImplementation(() => { proc.emit('exit', null, 'SIGKILL'); return true; });
    child.current = proc;
    const controller = new AbortController();
    const result = startViteServer({ templatePath: 'diagram.tsx', data: {}, logger: new Logger(false), signal: controller.signal });
    await vi.waitFor(() => expect(proc.listenerCount('exit')).toBeGreaterThan(0));
    controller.abort(new Error('render canceled'));
    await expect(result).rejects.toThrow('render canceled');
    expect(proc.kill).toHaveBeenCalled();
  });
});
