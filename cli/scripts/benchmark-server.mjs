#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const cli = resolve('../dist/facet');
const templatesDir = resolve(process.argv[2] ?? 'examples');
const iterations = Math.max(1, Number(process.env.FACET_BENCH_ITERATIONS ?? 5));
const sectionCount = Math.max(1, Number(process.env.FACET_BENCH_SECTIONS ?? 1));
const templateName = process.env.FACET_BENCH_TEMPLATE ?? 'SimpleReport';
const formats = (process.env.FACET_BENCH_FORMATS ?? 'html,pdf')
  .split(',').map((format) => format.trim()).filter((format) => format === 'html' || format === 'pdf');
if (formats.length === 0) throw new Error('FACET_BENCH_FORMATS must contain html and/or pdf');
const port = Number(process.env.FACET_BENCH_PORT ?? 39123);
const cacheDir = await mkdtemp(join(tmpdir(), 'facet-server-bench-'));

function processTreeRss(pid, seen = new Set()) {
  if (process.platform !== 'linux' || seen.has(pid)) return 0;
  seen.add(pid);
  let rss = 0;
  try {
    rss = Number(readFileSync(`/proc/${pid}/statm`, 'utf8').trim().split(/\s+/)[1] ?? 0) * 4096;
  } catch { return 0; }
  try {
    const children = readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8').trim().split(/\s+/).filter(Boolean);
    for (const child of children) rss += processTreeRss(Number(child), seen);
  } catch { /* process exited while sampling */ }
  return rss;
}

const server = spawn(cli, [
  'serve', '--port', String(port), '--templates-dir', templatesDir,
  '--workers', '1', '--cache-dir', cacheDir,
], { stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
server.stdout.on('data', (chunk) => { logs += chunk; });
server.stderr.on('data', (chunk) => { logs += chunk; });
let peakRss = 0;
let requestPeakRss = 0;
const sampler = setInterval(() => {
  const rss = processTreeRss(server.pid);
  peakRss = Math.max(peakRss, rss);
  requestPeakRss = Math.max(requestPeakRss, rss);
}, 25);

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode != null) throw new Error(`Server exited early:\n${logs}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) return;
    } catch { /* starting */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Server did not become ready:\n${logs}`);
}

async function render(format, index) {
  requestPeakRss = processTreeRss(server.pid);
  const sections = Array.from({ length: sectionCount }, (_, section) => ({
    title: `Benchmark section ${section + 1}`,
    content: `Unique render ${index}. ${'Facet performance and memory benchmark content. '.repeat(12)}`,
  }));
  const started = performance.now();
  const response = await fetch(`http://127.0.0.1:${port}/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      template: templateName,
      format,
      data: {
        title: `Server benchmark ${format} ${index}-${Date.now()}`,
        sections,
      },
    }),
  });
  if (!response.ok) throw new Error(`${format} render failed (${response.status}): ${await response.text()}\n${logs}`);
  let bytes = 0;
  let renderMs = performance.now() - started;
  let downloadMs = 0;
  if (format === 'pdf') {
    const result = await response.json();
    const downloadStarted = performance.now();
    const file = await fetch(`http://127.0.0.1:${port}${result.url}`);
    if (!file.ok) throw new Error(`PDF download failed (${file.status})`);
    bytes = (await file.arrayBuffer()).byteLength;
    downloadMs = performance.now() - downloadStarted;
  } else {
    bytes = (await response.arrayBuffer()).byteLength;
    renderMs = performance.now() - started;
  }
  const durationMs = performance.now() - started;
  const health = await fetch(`http://127.0.0.1:${port}/healthz`).then((result) => result.json());
  return {
    durationMs: Number(durationMs.toFixed(1)),
    renderMs: Number(renderMs.toFixed(1)),
    downloadMs: Number(downloadMs.toFixed(1)),
    outputKb: Number((bytes / 1024).toFixed(1)),
    peakRssMb: Number((requestPeakRss / 1024 / 1024).toFixed(1)),
    chromiumRssMb: health.workers.chromiumRssMb,
    nodeRssMb: health.memory.rssMb,
    nodeHeapMb: health.memory.heapUsedMb,
    nodeExternalMb: health.memory.externalMb,
  };
}

const results = [];
try {
  await waitForServer();
  for (const format of formats) {
    for (let index = 0; index <= iterations; index++) {
      results.push({
        format,
        mode: index === 0 ? 'first' : 'subsequent',
        ...await render(format, index),
      });
    }
  }
} finally {
  clearInterval(sampler);
  server.kill('SIGTERM');
  await new Promise((resolveClose) => {
    if (server.exitCode != null) return resolveClose();
    server.once('close', resolveClose);
    setTimeout(() => { server.kill('SIGKILL'); resolveClose(); }, 10_000).unref();
  });
  await rm(cacheDir, { recursive: true, force: true });
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const summaries = formats.map((format) => {
  const samples = results.filter((result) => result.format === format && result.mode === 'subsequent');
  return {
    format,
    medianDurationMs: Number(median(samples.map((sample) => sample.durationMs)).toFixed(1)),
    medianPeakRssMb: Number(median(samples.map((sample) => sample.peakRssMb)).toFixed(1)),
    outputKb: samples[0]?.outputKb ?? 0,
  };
});
console.table(results);
console.table(summaries);
console.log(JSON.stringify({
  templatesDir,
  templateName,
  iterations,
  sectionCount,
  formats,
  processTreePeakRssMb: Number((peakRss / 1024 / 1024).toFixed(1)),
  summaries,
  results,
}, null, 2));
