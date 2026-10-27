import { describe, expect, it } from 'vitest';
import { AbortLock } from './abort-lock.js';

describe('AbortLock', () => {
  it('removes a cancelled waiter without allowing later work to bypass the active owner', async () => {
    const lock = new AbortLock();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const first = lock.run('project', undefined, async () => { await blocked; return 'first'; });
    const controller = new AbortController();
    const second = lock.run('project', controller.signal, async () => 'second');
    let thirdStarted = false;
    const third = lock.run('project', undefined, async () => { thirdStarted = true; return 'third'; });
    controller.abort(new Error('cancelled waiter'));
    await expect(second).rejects.toThrow('cancelled waiter');
    expect(thirdStarted).toBe(false);
    release();
    await expect(first).resolves.toBe('first');
    await expect(third).resolves.toBe('third');
  });
});
