// Runs the real `facet/no-data-driven-diagram` oxlint rule (oxlint-plugins/facet-diagrams.js) through
// facet's own oxlint, so the AST shapes the rule depends on are the ones oxlint actually produces.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runExternalTool } from './external-runner.js';
import { runOxlint } from './oxlint.js';

const cwd = mkdtempSync(join(tmpdir(), 'facet-oxlint-rule-'));
afterAll(() => rmSync(cwd, { recursive: true, force: true }));

let sequence = 0;
async function lint(source: string): Promise<{ line: number; message: string }[]> {
  const file = `case-${sequence++}.tsx`;
  writeFileSync(join(cwd, file), source);
  const issues = await runOxlint({ files: [file], cwd, runner: runExternalTool });
  return issues.map(({ line, message }) => ({ line: line!, message }));
}
const drawn = (tag: string, callee: string) => `\`<${tag}>\` is drawn from data (\`${callee}\`); write each diagram shape as JSX so it can be edited in place.`;

describe('facet/no-data-driven-diagram', () => {
  it('reports all four security-style loops, including HTML, custom components and the legend', async () => {
    const issues = await lint([
      'import { Diagram, Arrow } from "@flanksource/facet";',
      'const KINDS = { authn: { color: "blue" } };',
      'export default function Security() { return <>',
      '  <Diagram>{() => <>',
      '    {TIERS.map(tier => <div>{tier.title}</div>)}',
      '    {CONTROLS.map(({ title }) => <Chip title={title} />)}',
      '    {HANDOFFS.map(item => <Arrow from={item.from} to={item.to} />)}',
      '  </>}</Diagram>',
      '  {Object.keys(KINDS).map(kind => <span>{kind}</span>)}',
      '</>; }',
    ].join('\n'));
    expect(issues.map(issue => issue.line)).toEqual([5, 6, 7, 9]);
  });

  it('follows named callbacks and same-file components while respecting shadowed diagram names', async () => {
    const issues = await lint([
      'import { Diagram as Canvas } from "@flanksource/facet";',
      'function renderRow(row) { return <Chip title={row.title} />; }',
      'function Legend() { return rows.map(renderRow); }',
      'export const Main = () => <><Canvas /><Legend /></>;',
      'function Other(Canvas) { return <><Canvas />{rows.map(row => <div>{row.title}</div>)}</>; }',
    ].join('\n'));
    expect(issues.map(issue => issue.line)).toEqual([3]);
  });

  it('reports nested JSX-generating loops once each and allows numeric maps and palette references', async () => {
    const issues = await lint([
      'import * as F from "@flanksource/facet";',
      'const widths = rows.map(row => row.width * 2);',
      'export const Main = () => <F.FlowDiagram style={{ color: PALETTE.ink }}>',
      '  {groups.flatMap(group => <section>{group.rows.map(row => <><div key={row.id} /></>)}</section>)}',
      '</F.FlowDiagram>;',
      'const List = () => rows.map(row => <li>{row.title}</li>);',
    ].join('\n'));
    expect(issues).toHaveLength(2);
    expect(issues.every(issue => issue.line === 4)).toBe(true);
  });

  it('ignores discarded JSX in a numeric map and follows a same-file diagram wrapper', async () => {
    expect((await lint([
      'import { DiagreDiagram } from "@flanksource/facet";',
      'const Canvas = () => <DiagreDiagram />;',
      'const Main = () => <><Canvas />',
      '  {rows.map(row => { const unused = <div />; return row.width; })}',
      '  {rows.map(row => <div />)}',
      '</>;',
    ].join('\n'))).map(issue => issue.line)).toEqual([5]);
  });

  it('warns on a BoundarySvg-style shape computed from the mapped item', async () => {
    expect(await lint([
      'export const Zones = ({ zones }) => (',
      '  <svg>',
      '    {zones.map((zone) => <rect key={zone.id} x={zone.x} y={zone.y} width={zone.w} height={zone.h} />)}',
      '  </svg>',
      ');',
    ].join('\n'))).toEqual([{ line: 3, message: drawn('rect', 'zones.map') }]);
  });

  it('warns when the parameter is destructured', async () => {
    expect(await lint('export const A = ({ zones }) => zones.map(({ x, y }) => <circle cx={x} cy={y} r={2} />);'))
      .toEqual([{ line: 1, message: drawn('circle', 'zones.map') }]);
  });

  it('warns on a facet node fed by a spread of the item, including renamed and namespace imports', async () => {
    expect(await lint([
      'import { BoxNode, Arrow as Link } from "@flanksource/facet";',
      'import * as Facet from "@flanksource/facet/diagram";',
      'export const A = ({ items }) => (<>',
      '  {items.map((item) => <BoxNode {...item} />)}',
      '  {items.map((item) => <Link label={item.name} />)}',
      '  {items.map((item) => <Facet.Zone title={item.name} />)}',
      '</>);',
    ].join('\n'))).toEqual([
      { line: 4, message: drawn('BoxNode', 'items.map') },
      { line: 5, message: drawn('Link', 'items.map') },
      { line: 6, message: drawn('Facet.Zone', 'items.map') },
    ]);
  });

  it('warns on a shape whose child text reads the item and on flatMap', async () => {
    expect(await lint('export const A = ({ rows }) => rows.flatMap((row) => [<text key="t">{row.title}</text>]);'))
      .toEqual([{ line: 1, message: drawn('text', 'rows.flatMap') }]);
  });

  it('follows values derived from the item inside the callback', async () => {
    expect(await lint([
      'export const A = ({ rows }) => rows.map((row, i) => {',
      '  const width = row.w * 2;',
      '  return <rect x={0} width={width} />;',
      '});',
    ].join('\n'))).toEqual([{ line: 3, message: drawn('rect', 'rows.map') }]);
  });

  it('reports each element once and leaves a wrapper alone when only a nested map reads the item', async () => {
    expect(await lint([
      'export const A = ({ groups }) => groups.map((group) => (',
      '  <g>{group.rows.map((row) => <rect x={row.x} />)}</g>',
      '));',
    ].join('\n'))).toEqual([{ line: 2, message: drawn('rect', 'group.rows.map') }]);
  });

  it('is clean for static JSX', async () => {
    expect(await lint('export const A = () => <svg><rect x={1} y={2} width={3} height={4} /><BoxNode title="A" /></svg>;')).toEqual([]);
  });

  it('is clean when the map renders non-shape elements', async () => {
    expect(await lint('export const A = ({ items }) => <ul>{items.map((item) => <li key={item.id}>{item.title}</li>)}</ul>;')).toEqual([]);
  });

  it('is clean for a shape inside a map that never reads the callback parameters', async () => {
    expect(await lint('export const A = ({ items }) => <svg>{items.map((item) => <rect key={item.id} x={0} width={10} />)}</svg>;')).toEqual([]);
  });

  it('is clean for a local component that happens to be named BoxNode', async () => {
    expect(await lint([
      'import { BoxNode } from "./local";',
      'export const A = ({ items }) => items.map((item) => <BoxNode {...item} />);',
    ].join('\n'))).toEqual([]);
  });

  it('is clean for a shape that reads a variable declared outside the callback', async () => {
    expect(await lint('export const A = ({ items, width }) => items.map((item) => <rect key={item.id} width={width} />);')).toEqual([]);
  });
});
