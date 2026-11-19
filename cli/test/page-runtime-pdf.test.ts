import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { createServer, type ServerHandle } from '../src/server/preview.js';
import { loadConfig } from '../src/server/config.js';
import { loadPdfJs } from '../src/utils/pdfjs.js';
import { execFileSync } from 'node:child_process';

const remote = vi.hoisted(() => ({ root: '' }));
const timestamp = vi.hoisted(() => vi.fn(async ({ pdf }: { pdf: Uint8Array }) => ({ pdf })));
vi.mock('pdf-rfc3161', () => ({ timestampPdf: timestamp }));
vi.mock('../src/utils/remote-resolver.js', async (original) => ({
  ...await original<typeof import('../src/utils/remote-resolver.js')>(),
  resolveRemoteRef: async () => ({ consumerRoot: remote.root, templateFile: 'report.tsx' }),
}));

const integration = process.env.FACET_TEST_PAGE_RUNTIME === '1';
let directory: string;
let templates: string;
let server: ServerHandle;

beforeAll(async () => {
  if (!integration) return;
  const scratch = resolve('../.tmp');
  await mkdir(scratch, { recursive: true });
  directory = await mkdtemp(join(scratch, 'page-runtime-pdf-'));
  templates = join(directory, 'templates');
  await mkdir(templates);
  for (const name of ['first', 'second']) {
    await mkdir(join(templates, name));
    await writeFile(join(templates, name, 'report.tsx'), `
      import { Document, Page } from '@flanksource/facet';
      import './style.css';
      let renders = 0;
      export default function Report({ data }) {
        return <Document title="${name}"><Page pageSize="a4">
          <p>{${JSON.stringify(name)} + ' ' + data.label + ' invocation ' + ++renders}</p>
          <img alt="Local graphic" width="24" src="./graphic.svg" />
        </Page><Page pageSize="letter"><p>Second sheet</p></Page></Document>;
      }
    `);
    await writeFile(join(templates, name, 'style.css'), 'p { color: rgb(27, 69, 105); }');
    await writeFile(join(templates, name, 'graphic.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>');
  }
  remote.root = join(templates, 'first');
  for (const name of ['benchmark-a', 'benchmark-b']) {
    await writeFile(join(templates, name + '.tsx'), `import { Document, Page } from '@flanksource/facet';
      export default function Report({ data }) { return <Document><Page><p>${name} {data.label}</p></Page></Document>; }`);
  }
  await writeFile(join(templates, 'slow.tsx'), `export const ready = () => new Promise(() => {});
    export default function Report() { return <p>Unfinished job</p>; }`);
  server = await createServer(loadConfig({ port: '0', templatesDir: templates, cacheDir: directory, workers: '1', pdfRenderer: 'page-runtime' }));
}, 120_000);

afterAll(async () => {
  await server?.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

async function render(payload: Record<string, unknown> | FormData, stream = false, target = server) {
  const response = await fetch(new URL(stream ? '/render/stream' : '/render', target.url), {
    method: 'POST',
    ...(payload instanceof FormData ? { body: payload } : { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ format: 'pdf', ...payload }) }),
  });
  const body = await response.text();
  expect(response.status, body).toBe(200);
  const result = stream
    ? body.match(/^data: (\{.*"url":"\/results\/[^"]+".*\})$/m)?.[1]
    : body;
  expect(result, body).toBeDefined();
  const { url } = JSON.parse(result!) as { url: string };
  const pdf = await fetch(new URL(url, target.url));
  expect(pdf.headers.get('content-type')).toBe('application/pdf');
  return { url, bytes: await pdf.arrayBuffer(), timing: response.headers.get('server-timing') ?? body };
}

async function pdfText(bytes: ArrayBuffer, index = 1) {
  return (await pdfTextItems(bytes, index)).map(item => item.str).join(' ');
}

async function pdfTextItems(bytes: ArrayBuffer, index = 1) {
  const pdfjs = await loadPdfJs();
  const loading = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)), useSystemFonts: true });
  const document = await loading.promise;
  try {
    const page = await document.getPage(index);
    return (await page.getTextContent()).items.filter(item => 'str' in item);
  } finally {
    await loading.destroy();
  }
}

it.skipIf(!integration)('switches installed templates on the same frame and starts each job with fresh module state', async () => {
  const first = await render({ template: 'first', data: { label: 'alpha' } });
  const second = await render({ template: 'second', data: { label: 'beta' } });
  const again = await render({ template: 'first', data: { label: 'gamma' } });
  const document = await PDFDocument.load(first.bytes);
  expect(document.getPages().map(page => Math.round(page.getWidth()))).toEqual([595, 612]);
  expect(await pdfText(first.bytes)).toContain('first alpha invocation 1');
  expect(await pdfText(second.bytes)).toContain('second beta invocation 1');
  expect(await pdfText(again.bytes)).toContain('first gamma invocation 1');
  expect(first.timing).toContain('runtime-boot');
  expect(second.timing).not.toContain('runtime-boot');
  expect(again.timing).not.toContain('runtime-boot');
}, 120_000);

it.skipIf(!integration)('renders a streamed inline MDX PDF after redaction', async () => {
  const result = await render({
    code: '# Public heading\n\n<Classified tier="Internal">\n\nRestricted passage\n\n</Classified>\n',
    ext: 'mdx', redact: { allow: { tier: ['Public'] } },
  }, true);
  const text = await pdfText(result.bytes);
  expect(text.match(/Public heading/g)).toEqual(['Public heading']);
  expect(text).not.toContain('Restricted passage');
}, 120_000);

it.skipIf(!integration)('lays out named and custom PDF pages at their landscape print widths before snapshotting', async () => {
  const result = await render({
    code: `import { Document, Page } from '@flanksource/facet';
      export function ready() {
        for (const page of document.querySelectorAll('[data-page-size]')) {
          page.querySelector('output').textContent = Math.round(page.getBoundingClientRect().width) + ' CSS pixels';
        }
      }
      export default function Report() {
        return <Document><Page pageSize="letter"><output /></Page><Page pageSize="180x280"><output /></Page></Document>;
      }`,
    pdfOptions: { landscape: true },
  }, true);
  const pdf = await PDFDocument.load(result.bytes);
  expect(pdf.getPages().map(page => [Math.round(page.getWidth()), Math.round(page.getHeight())])).toEqual([[792, 612], [794, 510]]);
  expect(await Promise.all([pdfText(result.bytes, 1), pdfText(result.bytes, 2)])).toEqual(['1056 CSS pixels', '1058 CSS pixels']);
}, 120_000);

it.skipIf(!integration)('applies theme margins once and overrides individual sides in a PDF with running chrome', async () => {
  const code = `import { Document, Page, Header, Footer } from '@flanksource/facet';
    import { ThemeProvider } from '@flanksource/facet/Theme';
    const theme = { id: 'inset', defaults: { margins: { top: 9.5, right: 8.5, bottom: 11.5, left: 12.5 } } };
    export default function Report() {
      return <ThemeProvider theme={theme}>
        <Document header={<Header height={8}>Running header</Header>} footer={<Footer height={5}>Running footer</Footer>}>
          <Page><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Left edge</span><span>Right edge</span></div></Page>
        </Document>
      </ThemeProvider>;
    }`;
  const inherited = await render({ code, pdfOptions: { debug: true } }, true);
  const overridden = await render({ code, pdfOptions: { debug: true, margins: { left: 0, right: 23, top: 18.5 } } }, true);
  const [before, after] = await Promise.all([pdfTextItems(inherited.bytes), pdfTextItems(overridden.bytes)]);
  const left = (items: typeof before) => items.find(item => item.str === 'Left edge')!.transform;
  const right = (items: typeof before) => {
    const marker = items.find(item => item.str === 'Right edge')!;
    return marker.transform[4] + marker.width;
  };
  const mm = (points: number) => points * 25.4 / 72;
  const measured = [left(before)[4], left(after)[4], right(before) - right(after), left(before)[5] - left(after)[5]];
  [12.5, 0, 14.5, 9].forEach((expected, index) => expect(mm(measured[index])).toBeCloseTo(expected, 0));
  expect(after.map(item => item.str).join(' ')).toMatch(/margin-bottom\s+16\.5mm/);
}, 120_000);

it.skipIf(!integration)('renders an archive and a resolved remote template in fresh contexts', async () => {
  const gzip = execFileSync('tar', ['-czf', '-', '-C', remote.root, 'report.tsx', 'style.css', 'graphic.svg']);
  const archive = new FormData();
  archive.set('archive', new Blob([new Uint8Array(gzip)], { type: 'application/gzip' }), 'report.tar.gz');
  archive.set('data', JSON.stringify({ label: 'archive' }));
  archive.set('options', JSON.stringify({ entryFile: 'report.tsx', format: 'pdf' }));
  const uploaded = await render(archive);
  const fetched = await render({ template: 'github:example/reports/report.tsx', data: { label: 'remote' } }, true);
  expect(await pdfText(uploaded.bytes)).toContain('first archive invocation 1');
  expect(await pdfText(fetched.bytes)).toContain('first remote invocation 1');
  expect([uploaded.timing, fetched.timing].every(timing => timing.includes('runtime-boot'))).toBe(true);
}, 120_000);

it.skipIf(!integration)('never serves the previous snapshot when a replacement template fails', async () => {
  const entry = join(templates, 'second', 'report.tsx');
  await writeFile(entry, 'export default function Report() { throw new Error("replacement failed"); }');
  const response = await fetch(new URL('/render', server.url), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ format: 'pdf', template: 'second' }),
  });
  expect(response.status).toBe(422);
  expect(await response.text()).toContain('replacement failed');
  const following = await render({ template: 'first', data: { label: 'after failure' } });
  expect(await pdfText(following.bytes)).toContain('first after failure invocation 1');
}, 120_000);

it.skipIf(!integration)('generates a new signed and timestamped PDF for each identical request', async () => {
  const request = { template: 'benchmark-a', data: { label: 'signed' }, signature: { selfSigned: true, timestampUrl: 'https://tsa.example' } };
  const first = await render(request);
  const second = await render(request);
  expect(first.url).not.toBe(second.url);
  expect(Buffer.from(second.bytes).includes(Buffer.from('/ByteRange'))).toBe(true);
  expect(timestamp).toHaveBeenCalledTimes(2);
  expect(second.timing).toContain('timestamping');
}, 120_000);

it.skipIf(!integration)('preserves running headers, footers, internal links, and typography diagnostics', async () => {
  const result = await render({
    code: `import { Document, Page, Header, Footer } from '@flanksource/facet';
      export default function Report() {
        return <Document header={<Header>Running header</Header>} footer={<Footer>Running footer</Footer>}>
          <Page pageSize="a4"><a href="#details">Details link</a></Page>
          <Page pageSize="letter" id="details"><h2>Details section</h2></Page>
        </Document>;
      }`,
    pdfOptions: { debugTypography: true },
  });
  const pdf = await PDFDocument.load(result.bytes);
  expect(pdf.getPageCount()).toBe(3);
  const destinations = pdf.catalog.lookup(PDFName.of('Dests'), PDFDict);
  expect(destinations.lookup(PDFName.of('details'), PDFArray).get(0).toString()).toBe(pdf.getPage(1).ref.toString());
  for (const index of [1, 2]) {
    const text = await pdfText(result.bytes, index);
    expect(text).toContain('Running header');
    expect(text).toContain('Running footer');
  }
  expect(await pdfText(result.bytes, 3)).toContain('Typography Reference');
}, 120_000);

it.skipIf(!integration)('releases a timed-out worker and renders a fresh result on the next request', async () => {
  const response = await fetch(new URL('/render', server.url), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ format: 'pdf', template: 'slow', timeout: 750 }),
  });
  expect(response.status).toBe(504);
  expect(await response.text()).toContain('RENDER_TIMEOUT');
  const following = await render({ template: 'first', data: { label: 'after timeout' } });
  expect(await pdfText(following.bytes)).toContain('first after timeout invocation 1');
}, 120_000);

it.skipIf(!integration || process.env.FACET_BENCH_PAGE_RUNTIME !== '1')('measures cold and warm PDF jobs by renderer', async () => {
  await server.stop();
  const measures: Record<string, unknown> = {};
  const node = await createServer(loadConfig({ port: '0', templatesDir: templates, cacheDir: directory, workers: '1', pdfRenderer: 'node' }));
  try { measures.node = await measurePdfJobs(node); }
  finally { await node.stop(); }
  server = await createServer(loadConfig({ port: '0', templatesDir: templates, cacheDir: directory, workers: '1', pdfRenderer: 'page-runtime' }));
  measures['page-runtime'] = await measurePdfJobs(server);
  process.stdout.write(`PDF benchmark ${JSON.stringify(measures)}\n`);
}, 180_000);

async function measurePdfJobs(target: ServerHandle) {
  const measure = async (template: string, label: string) => {
    const start = performance.now();
    const { timing } = await render({ template, data: { label } }, false, target);
    return { ms: Math.round(performance.now() - start), timing };
  };
  const cold = await measure('benchmark-a', 'cold');
  const summarize = (items: number[]) => {
    const sorted = items.toSorted((left, right) => left - right);
    return { p50: sorted[Math.ceil(sorted.length * 0.50) - 1], p95: sorted[Math.ceil(sorted.length * 0.95) - 1] };
  };
  const repeated = [];
  const alternating = [];
  for (let index = 0; index < 5; index++) repeated.push((await measure('benchmark-a', `repeat-${index}`)).ms);
  for (let index = 0; index < 6; index++) alternating.push((await measure(index % 2 === 0 ? 'benchmark-b' : 'benchmark-a', `alternate-${index}`)).ms);
  const health = await (await fetch(new URL('/healthz', target.url))).json();
  const chromiumRssMb = process.platform === 'darwin' ? localChromiumMemory() : health.workers.chromiumRssMb;
  return { coldMs: cold.ms, repeated: summarize(repeated), alternating: summarize(alternating), chromiumRssMb };
}

function localChromiumMemory(): number {
  const processes = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=,comm='], { encoding: 'utf8' });
  const children = new Map<number, { pid: number; rss: number }[]>();
  for (const [, pid, parent, rss, command] of processes.matchAll(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/gm)) {
    const entries = children.get(Number(parent)) ?? [];
    entries.push({ pid: Number(pid), rss: /chrom(?:e|ium)/i.test(command!) ? Number(rss) : 0 });
    children.set(Number(parent), entries);
  }
  const treeRss = (pid: number): number => (children.get(pid) ?? []).reduce((sum, child) => sum + child.rss + treeRss(child.pid), 0);
  return Math.round(treeRss(process.pid) / 1024);
}
