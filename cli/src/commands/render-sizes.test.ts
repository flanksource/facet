import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execute = promisify(execFile);
const cliRoot = resolve(import.meta.dirname, '../..');

describe('size selection CLI validation', () => {
  it.each([
    ['png', ['--sizes', 'unknown-*'], 'Unknown or invalid page size'],
    ['pdf', ['--sizes', 'unknown-*'], 'Unknown or invalid page size'],
    ['png', ['--sizes', 'facebook-square', '--viewport', '800x600'], '--sizes cannot be combined with --viewport'],
    ['pdf', ['--sizes', 'facebook-square', '--page-size', 'a4'], '--sizes cannot be combined with --page-size'],
  ])('rejects invalid %s selection before resolving the template', async (format, flags, message) => {
    await expect(execute(process.execPath, ['--import', 'tsx', 'src/cli.ts', format, 'missing-template.tsx', ...flags], {
      cwd: cliRoot, env: { ...process.env, FACET_URL: '' },
    })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining(message) });
  });
});
