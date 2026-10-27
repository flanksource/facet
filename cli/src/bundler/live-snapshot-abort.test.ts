import { describe, expect, it, vi } from 'vitest';

const browser = vi.hoisted(() => {
  let rejectPage!: (error: Error) => void;
  return {
    newPage: vi.fn(() => new Promise<never>((_, reject) => { rejectPage = reject; })),
    close: vi.fn(async () => { rejectPage(new Error('browser closed')); }),
  };
});
vi.mock('../utils/pdf-generator.js', () => ({ launchBrowser: async () => browser }));

import { Logger } from '../utils/logger.js';
import { snapshotHTML } from './live-snapshot.js';

describe('live snapshot cancellation', () => {
  it('closes the owned browser and returns the cancellation reason', async () => {
    const controller = new AbortController();
    const result = snapshotHTML('http://localhost/', new Logger(false), { signal: controller.signal });
    await vi.waitFor(() => expect(browser.newPage).toHaveBeenCalled());
    controller.abort(new Error('render canceled'));
    await expect(result).rejects.toThrow('render canceled');
    expect(browser.close).toHaveBeenCalled();
  });
});
