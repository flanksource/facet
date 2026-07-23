#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { processTreeRss } from './lib/proc-rss.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const cli = resolve(scriptDir, '../../dist/facet');
const template = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(scriptDir, '../examples/SimpleReport.tsx');
const data = process.argv[3]
  ? resolve(process.argv[3])
  : resolve(scriptDir, '../examples/simple-data.json');
const output = resolve('.benchmark-output');
const iterations = Math.max(1, Number(process.env.FACET_BENCH_ITERATIONS ?? 5));

function run(format, cold) {
  return new Promise((resolveRun, reject) => {
    const args = [cli, format, template, '--data', data, '--output', output];
    if (cold) args.push('--clear-cache');
    const started = performance.now();
    const child = spawn(args.shift(), args, {
      env: { ...process.env, FACET_PROFILE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let peakRss = 0;
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const sampler = setInterval(() => {
      peakRss = Math.max(peakRss, processTreeRss(child.pid));
    }, 25);
    child.on('error', reject);
    child.on('close', (code) => {
      clearInterval(sampler);
      if (code !== 0) return reject(new Error(`${format} failed:\n${stderr || stdout}`));
      const profiles = `${stdout}\n${stderr}`.split('\n')
        .map((line) => {
          const start = line.indexOf('[FACET_PROFILE] ');
          return start < 0 ? undefined : line.slice(start + '[FACET_PROFILE] '.length);
        })
        .filter(Boolean)
        .map((payload) => JSON.parse(payload));
      resolveRun({
        format,
        mode: cold ? 'cold' : 'warm',
        durationMs: Number((performance.now() - started).toFixed(1)),
        processTreePeakRssMb: Number((peakRss / 1024 / 1024).toFixed(1)),
        profiles,
      });
    });
  });
}

await mkdir(output, { recursive: true });
const results = [];
for (const format of ['html', 'pdf']) {
  results.push(await run(format, true));
  for (let index = 0; index < iterations; index++) results.push(await run(format, false));
}
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const summaries = ['html', 'pdf'].map((format) => {
  const samples = results.filter((result) => result.format === format && result.mode === 'warm');
  return {
    format,
    medianDurationMs: Number(median(samples.map((sample) => sample.durationMs)).toFixed(1)),
    medianPeakRssMb: Number(median(samples.map((sample) => sample.processTreePeakRssMb)).toFixed(1)),
  };
});
console.table(results.map(({ format, mode, durationMs, processTreePeakRssMb }) => ({
  format, mode, durationMs, processTreePeakRssMb,
})));
console.table(summaries);
console.log(JSON.stringify({ template, data, iterations, summaries, results }, null, 2));
await rm(output, { recursive: true, force: true });
