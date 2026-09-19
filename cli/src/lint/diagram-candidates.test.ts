import { describe, expect, it } from 'vitest';
import { hasDirectDiagramCandidate } from './diagram-candidates.js';

describe('diagram candidate detection', () => {
  it.each([
    ['<Diagram />', 'tsx'],
    ['const Page = () => <FlowDiagram>content</FlowDiagram>', 'tsx'],
    ['# Architecture\n\n<DiagreDiagram />', 'mdx'],
    ['# Architecture\n\n<FlowDiagram\n  direction="LR"\n/>', 'mdx'],
    ['<div title="<!--" />\n\n<Diagram />', 'mdx'],
    ['<div title="{/*" />\n\n<Diagram />', 'mdx'],
    ['<div title="`<!--`" />\n\n<Diagram />', 'mdx'],
    ['<_Widget title="<!--" />\n\n<Diagram />', 'mdx'],
    ['<$Widget title="{/*" />\n\n<Diagram />', 'mdx'],
    ['<ΔWidget title="`<!--`" />\n\n<Diagram />', 'mdx'],
    ['> ```tsx\n> <Diagram />\n> ```\n\n<Diagram />', 'mdx'],
    ["<div value={'<!--'} />\n\n<Diagram />", 'mdx'],
    ['<div value={`{/*`} />\n\n<Diagram />', 'mdx'],
    ['<div>{"{/*"}</div>\n\n<Diagram />', 'mdx'],
    ['<div>{`<!-- ${"{/*"}`}</div>\n\n<Diagram />', 'mdx'],
  ] as const)('detects direct %s candidates in %s', (source, fileType) => {
    expect(hasDirectDiagramCandidate(source, fileType)).toBe(true);
  });

  it.each([
    ['const text = "<Diagram />";', 'tsx'],
    ['const text = `\n<FlowDiagram />\n`;', 'tsx'],
    ['const Wrapped = () => <div />; <Wrapped />', 'tsx'],
    ['<Components.Diagram />', 'tsx'],
    ['```tsx\n<Diagram />\n```\n\n`<FlowDiagram />`', 'mdx'],
    ['```\n<Diagram />\n```', 'mdx'],
    [' > ```tsx\n > <Diagram />\n > ```', 'mdx'],
    ['> > ```tsx\n> > <FlowDiagram />\n> > ```', 'mdx'],
    ['- ```tsx\n  <DiagreDiagram />\n  ```', 'mdx'],
    ['<!-- <DiagreDiagram /> -->\n\n{/* <Diagram /> */}', 'mdx'],
    ['A string: "<Diagram />" and text: <NotADiagram />', 'mdx'],
  ] as const)('ignores non-candidates: %s (%s)', (source, fileType) => {
    expect(hasDirectDiagramCandidate(source, fileType)).toBe(false);
  });
});
