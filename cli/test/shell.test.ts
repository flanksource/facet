import { describe, it, expect } from 'vitest';
import { $ } from '../src/utils/shell.js';

describe('shell $', () => {
  it('captures stdout as a Buffer', async () => {
    const result = await $`printf hello`.quiet();
    expect(result.stdout.toString()).toBe('hello');
    expect(result.exitCode).toBe(0);
  });

  it('returns trimmed stdout via text()', async () => {
    expect(await $`printf 'spaced\n'`.text()).toBe('spaced\n');
  });

  it('shell-escapes interpolated values', async () => {
    const danger = 'a b; echo pwned';
    const result = await $`printf '%s' ${danger}`.quiet();
    expect(result.stdout.toString()).toBe(danger);
  });

  it('escapes each element of an interpolated array as a separate argument', async () => {
    const args = ['a', 'b;echo pwned'];
    const result = await $`printf '%s\n' ${args}`.quiet();
    expect(result.stdout.toString()).toBe('a\nb;echo pwned\n');
  });

  it('rejects with signal details when the child is terminated by a signal', async () => {
    try {
      await $`sh -c 'kill -TERM $$'`.quiet();
      throw new Error('expected rejection');
    } catch (e: any) {
      expect(e.signal).toBe('SIGTERM');
      expect(e.exitCode).toBeNull();
    }
  });

  it('injects raw fragments verbatim', async () => {
    const result = await $`printf one ${{ raw: '&& printf two' }}`.quiet();
    expect(result.stdout.toString()).toBe('onetwo');
  });

  it('honors shell operators like && and ||', async () => {
    const result = await $`false || printf a && printf b`.quiet();
    expect(result.stdout.toString()).toBe('ab');
  });

  it('merges stderr into stdout with 2>&1', async () => {
    const result = await $`sh -c 'printf out; printf err 1>&2' 2>&1`.quiet();
    expect(result.stdout.toString()).toBe('outerr');
  });

  it('passes extra env vars via env()', async () => {
    const result = await $`printf '%s' "$FACET_TEST_VAR"`.env({ FACET_TEST_VAR: 'envval' }).quiet();
    expect(result.stdout.toString()).toBe('envval');
  });

  it('rejects with stdout/stderr/exitCode on non-zero exit', async () => {
    await expect($`sh -c 'printf out; printf err 1>&2; exit 3'`.quiet()).rejects.toMatchObject({
      exitCode: 3,
    });
    try {
      await $`sh -c 'printf out; printf err 1>&2; exit 3'`.quiet();
    } catch (e: any) {
      expect(e.stdout.toString()).toBe('out');
      expect(e.stderr.toString()).toBe('err');
    }
  });
});
