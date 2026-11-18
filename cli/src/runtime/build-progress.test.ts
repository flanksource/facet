import { PassThrough } from 'node:stream';
import { stripVTControlCharacters } from 'node:util';
import chalk from 'chalk';
import { expect, test } from 'vitest';
import { createRuntimeBuildProgress } from './build-progress.js';

test.each([0, 1] as const)('reports completed stages with color level %i', level => {
  const output = new PassThrough().setEncoding('utf8');
  let logs = '';
  output.on('data', chunk => { logs += chunk; });
  const progress = createRuntimeBuildProgress(output, new chalk.Instance({ level }));

  progress.stage('prepare', 'Preparing input');
  progress.stage('node', 'Compiling Node runtime');
  progress.detail('100/200 files verified');
  progress.stage('publish', 'Publishing runtime');
  progress.done('Built example@1.2.0');

  const plain = stripVTControlCharacters(logs);
  expect(plain).toBe([
    '[------] 0/6  Preparing input',
    '[==----] 2/6  Compiling Node runtime',
    '  100/200 files verified',
    '[=====-] 5/6  Publishing runtime',
    '[======] 6/6  Built example@1.2.0',
    '',
  ].join('\n'));
  if (level === 0) expect(logs).toBe(plain);
  else {
    expect(logs).toContain('\u001b[36m');
    expect(logs).toContain('\u001b[32m');
  }
});
