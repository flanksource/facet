import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { getPriority, tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  CHILD_PROCESS_NICE,
  applySpawnedProcessPriority,
  buildLowPriorityCommand,
  runLowPriority,
  spawnLowPriority,
} from './subprocess-priority.js';

describe('buildLowPriorityCommand', () => {
  const input = { command: '/opt/example tool', args: ['--label', 'value with spaces'] };

  it('wraps macOS commands in nice without the background QoS band', () => {
    expect(buildLowPriorityCommand({ ...input, platform: 'darwin' })).toEqual({
      command: '/usr/bin/nice',
      args: ['-n', '10', input.command, ...input.args],
    });
  });

  it('leaves commands untouched when FACET_LOW_PRIORITY=0', () => {
    vi.stubEnv('FACET_LOW_PRIORITY', '0');
    try {
      expect(buildLowPriorityCommand({ ...input, platform: 'darwin' })).toEqual(input);
      expect(buildLowPriorityCommand({ ...input, platform: 'linux' })).toEqual(input);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('wraps Linux commands in nice', () => {
    expect(buildLowPriorityCommand({ ...input, platform: 'linux' })).toEqual({
      command: '/usr/bin/nice',
      args: ['-n', '10', input.command, ...input.args],
    });
  });

  it('runs the nice PATH finds, as Alpine keeps it in /bin', () => {
    const bin = mkdtempSync(join(tmpdir(), 'facet-nice-'));
    const nice = join(bin, 'nice');
    writeFileSync(nice, '#!/bin/sh\n', { mode: 0o755 });
    vi.stubEnv('PATH', [join(bin, 'missing'), bin].join(delimiter));
    try {
      expect(buildLowPriorityCommand({ ...input, platform: 'linux' })).toEqual({
        command: nice,
        args: ['-n', '10', input.command, ...input.args],
      });
    } finally {
      vi.unstubAllEnvs();
      rmSync(bin, { recursive: true, force: true });
    }
  });

  it('names the missing nice and the escape hatch', () => {
    vi.stubEnv('PATH', '/facet-no-such-dir');
    try {
      expect(() => buildLowPriorityCommand({ ...input, platform: 'linux' })).toThrow(
        'nice was not found on PATH (/facet-no-such-dir); install it, or set FACET_LOW_PRIORITY=0 to run subprocesses at normal priority',
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('leaves Windows command arguments intact for native priority assignment', () => {
    expect(buildLowPriorityCommand({ ...input, platform: 'win32' })).toEqual(input);
  });

  it('rejects unsupported operating systems', () => {
    expect(() => buildLowPriorityCommand({ ...input, platform: 'freebsd' })).toThrow(
      'Low-priority subprocesses are unsupported on freebsd',
    );
  });
});

describe('applySpawnedProcessPriority', () => {
  it('sets Windows children to below-normal priority', () => {
    const setPriority = vi.fn();
    applySpawnedProcessPriority({ pid: 8123, platform: 'win32', setPriority });
    expect(setPriority).toHaveBeenCalledWith(8123, CHILD_PROCESS_NICE);
  });

  it('kills a Windows child when priority assignment fails', () => {
    const kill = vi.fn();
    expect(() => applySpawnedProcessPriority({
      pid: 8123,
      platform: 'win32',
      kill,
      setPriority: () => { throw new Error('access denied'); },
    })).toThrow('Failed to lower subprocess 8123 priority: access denied');
    expect(kill).toHaveBeenCalledOnce();
  });
});

if (process.platform === 'darwin' || process.platform === 'linux') {
  it('launches a child with niceness increased by ten', async () => {
    const fixture = fileURLToPath(new URL('../../test/fixtures/report-priority.cjs', import.meta.url));
    const child = spawnLowPriority({
      command: process.execPath,
      args: [fixture],
      options: { stdio: ['ignore', 'pipe', 'pipe'] },
    });
    const output = await collectOutput(child);
    expect(output).toEqual({
      code: 0,
      stderr: '',
      stdout: String(Math.min(19, getPriority(0) + CHILD_PROCESS_NICE)),
    });
  });

  it('preserves failed process output and exit status', async () => {
    const fixture = fileURLToPath(new URL('../../test/fixtures/report-priority.cjs', import.meta.url));
    try {
      await runLowPriority({ command: process.execPath, args: [fixture, 'error'] });
      throw new Error('expected subprocess failure');
    } catch (error) {
      expect(error).toMatchObject({
        exitCode: 7,
        stderr: Buffer.from('expected failure'),
        stdout: Buffer.from('partial output'),
      });
    }
  });

  it('terminates processes that exceed their timeout', async () => {
    const fixture = fileURLToPath(new URL('../../test/fixtures/report-priority.cjs', import.meta.url));
    await expect(runLowPriority({
      command: process.execPath,
      args: [fixture, 'wait'],
      timeoutMs: 20,
    })).rejects.toMatchObject({ timedOut: true });
  });
}

function collectOutput(child: ChildProcess): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({
      code,
      stdout: Buffer.concat(stdout).toString(),
      stderr: Buffer.concat(stderr).toString(),
    }));
  });
}
