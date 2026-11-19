import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { readHTMLSource } from './html-source.js';

it('collects reachable source and assets without embedding project data or declarations', async () => {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp('.tmp/html-source-');
  const inputs = {
    'report.tsx': 'import type { Missing } from "./types"; import { title } from "./title"; import "./report.css"; import { sum } from "d3-array"; export default () => <h1>{title(sum([1, 2]))}</h1>; export const load = () => import("./lazy");',
    'title.ts': 'export const title = (value: number) => `Total ${value}`;',
    'lazy.ts': 'export const detail: string = "Dynamic import";',
    'report.css': '@import url("./colors.css"); h1 { background-image: url("./mark.svg"); }',
    'colors.css': ':root { color: blue; }',
    'mark.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
  };
  try {
    await Promise.all(Object.entries({ ...inputs, 'unrelated.json': '{"title":"Separate report"}',
      'package.json': '{"dependencies":{"d3-array":"3.2.4","unused-package":"1.0.0"}}',
    }).map(([file, contents]) => writeFile(join(root, file), contents)));
    const result = await readHTMLSource({ templatePath: 'report.tsx', consumerRoot: root });
    const { [result.layout]: layout, ...sources } = result.files;
    expect({ page: result.page, sources, dependencies: result.dependencies, hasLayout: !!layout }).toEqual({
      page: 'report.tsx',
      sources: Object.fromEntries(Object.entries(inputs).map(([name, text]) => [name, { text }])),
      dependencies: { 'd3-array': '3.2.4' },
      hasLayout: true,
    });
  } finally { await rm(root, { recursive: true, force: true }); }
});
