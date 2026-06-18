import { describe, it, expect } from 'bun:test';
import { hardcodedPageBreak } from '../src/lint/rules/hardcoded-page-break.js';
import { inlineHexColors } from '../src/lint/rules/inline-hex-colors.js';
import { mixedUnits } from '../src/lint/rules/mixed-units.js';
import { inlineStyleLayout } from '../src/lint/rules/inline-style-layout.js';
import { emptyPage } from '../src/lint/rules/empty-page.js';
import { conflictingTailwind } from '../src/lint/rules/conflicting-tailwind.js';
import { conflictingPrintCss } from '../src/lint/rules/conflicting-print-css.js';
import { pageStructure } from '../src/lint/rules/page-structure.js';
import { interactiveContent } from '../src/lint/rules/interactive-content.js';
import type { LintContext } from '../src/lint/types.js';

function ctx(filePath: string, content: string): LintContext {
  return { filePath, lines: content.split('\n'), content };
}

describe('hardcoded-page-break', () => {
  it('flags pageBreakAfter in inline style', () => {
    const issues = hardcodedPageBreak.check(ctx('Foo.tsx',
      `<div style={{ pageBreakAfter: 'always' }}>`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('PageBreak');
  });

  it('flags breakAfter in inline style', () => {
    const issues = hardcodedPageBreak.check(ctx('Foo.tsx',
      `<div style={{ breakAfter: 'page' }}>`));
    expect(issues).toHaveLength(1);
  });

  it('skips Page.tsx', () => {
    const issues = hardcodedPageBreak.check(ctx('Page.tsx',
      `<div style={{ pageBreakAfter: 'always' }}>`));
    expect(issues).toHaveLength(0);
  });

  it('skips PageBreak.tsx', () => {
    const issues = hardcodedPageBreak.check(ctx('PageBreak.tsx',
      `<div style={{ breakAfter: 'page' }}>`));
    expect(issues).toHaveLength(0);
  });

  it('passes clean code', () => {
    const issues = hardcodedPageBreak.check(ctx('Foo.tsx',
      `<div className="page-break" />`));
    expect(issues).toHaveLength(0);
  });
});

describe('inline-hex-colors', () => {
  it('flags hex color in style object', () => {
    const issues = inlineHexColors.check(ctx('Foo.tsx',
      `<div style={{ border: "1px solid #10b981" }}>`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('#10b981');
  });

  it('flags multiline style block', () => {
    const issues = inlineHexColors.check(ctx('Foo.tsx', [
      '<div style={{',
      '  color: "#ff0000",',
      '  background: "#00ff00"',
      '}}>',
    ].join('\n')));
    expect(issues).toHaveLength(2);
  });

  it('skips SVG stroke/fill attributes', () => {
    const issues = inlineHexColors.check(ctx('Foo.tsx',
      `<svg stroke="#10b981" fill="#ffffff">`));
    expect(issues).toHaveLength(0);
  });

  it('skips hex in className arbitrary values', () => {
    const issues = inlineHexColors.check(ctx('Foo.tsx',
      `<div className="bg-[#3578e5]">`));
    expect(issues).toHaveLength(0);
  });

  it('passes clean code', () => {
    const issues = inlineHexColors.check(ctx('Foo.tsx',
      `<div className="text-emerald-500">`));
    expect(issues).toHaveLength(0);
  });
});

describe('mixed-units', () => {
  it('flags px in Tailwind arbitrary values', () => {
    const issues = mixedUnits.check(ctx('Foo.tsx',
      `<div className="p-[10px] gap-[16px]">`));
    expect(issues).toHaveLength(2);
    expect(issues[0].message).toContain('px');
  });

  it('passes mm and pt units', () => {
    const issues = mixedUnits.check(ctx('Foo.tsx',
      `<div className="p-[4mm] text-[12pt]">`));
    expect(issues).toHaveLength(0);
  });

  it('passes standard Tailwind numeric classes', () => {
    const issues = mixedUnits.check(ctx('Foo.tsx',
      `<div className="gap-4 p-2 text-sm">`));
    expect(issues).toHaveLength(0);
  });
});

describe('inline-style-layout', () => {
  it('flags padding in inline style', () => {
    const issues = inlineStyleLayout.check(ctx('Foo.tsx',
      `<div style={{ padding: "5mm" }}>`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('p-[5mm]');
  });

  it('flags fontSize in inline style', () => {
    const issues = inlineStyleLayout.check(ctx('Foo.tsx',
      `<div style={{ fontSize: "12pt" }}>`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('text-[12pt]');
  });

  it('skips dynamic template literal values', () => {
    const issues = inlineStyleLayout.check(ctx('Foo.tsx',
      '<div style={{ padding: `${size}mm` }}>'));
    expect(issues).toHaveLength(0);
  });

  it('passes clean Tailwind code', () => {
    const issues = inlineStyleLayout.check(ctx('Foo.tsx',
      `<div className="p-[5mm] text-[12pt]">`));
    expect(issues).toHaveLength(0);
  });
});

describe('conflicting-tailwind', () => {
  it('flags conflicting flex direction', () => {
    const issues = conflictingTailwind.check(ctx('Foo.tsx',
      `<div className="flex flex-row flex-col">`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('flex-direction');
  });

  it('flags duplicate gap classes', () => {
    const issues = conflictingTailwind.check(ctx('Foo.tsx',
      `<div className="gap-2 gap-[4mm]">`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('gap');
  });

  it('flags duplicate text size', () => {
    const issues = conflictingTailwind.check(ctx('Foo.tsx',
      `<div className="text-sm text-[12pt]">`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('text-size');
  });

  it('passes non-conflicting classes', () => {
    const issues = conflictingTailwind.check(ctx('Foo.tsx',
      `<div className="flex flex-col gap-4 text-sm p-2">`));
    expect(issues).toHaveLength(0);
  });

  it('allows gap-x and gap-y together', () => {
    const issues = conflictingTailwind.check(ctx('Foo.tsx',
      `<div className="gap-x-2 gap-y-4">`));
    expect(issues).toHaveLength(0);
  });
});

describe('conflicting-print-css', () => {
  it('flags @page rules', () => {
    const issues = conflictingPrintCss.check(ctx('Foo.tsx',
      `const css = "@page { margin: 0; }"`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('@page');
  });

  it('flags @media print', () => {
    const issues = conflictingPrintCss.check(ctx('Foo.tsx',
      `const css = "@media print { body { margin: 0; } }"`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('@media print');
  });

  it('flags break-before-page in className', () => {
    const issues = conflictingPrintCss.check(ctx('Foo.tsx',
      `<div className="break-before-page mt-8">`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('PageBreak');
  });

  it('flags break-after-page in className', () => {
    const issues = conflictingPrintCss.check(ctx('Foo.tsx',
      `<div className="break-after-page">`));
    expect(issues).toHaveLength(1);
  });

  it('does not flag break-* outside className', () => {
    const issues = conflictingPrintCss.check(ctx('Foo.tsx',
      `// break-before-page is used for pagination`));
    expect(issues).toHaveLength(0);
  });

  it('flags CSS size with page-like values', () => {
    const issues = conflictingPrintCss.check(ctx('Foo.tsx',
      `const css = "size: 'a4'";`));
    expect(issues).toHaveLength(1);
  });

  it('does not flag JS size prop', () => {
    const issues = conflictingPrintCss.check(ctx('Foo.tsx',
      `const config = { size: 'xs' };`));
    expect(issues).toHaveLength(0);
  });

  it('passes clean code', () => {
    const issues = conflictingPrintCss.check(ctx('Foo.tsx',
      `<PageBreak />`));
    expect(issues).toHaveLength(0);
  });
});

describe('page-structure', () => {
  it('skips non-template components', () => {
    const issues = pageStructure.check(ctx('Section.tsx', [
      'export default function Section({ children }) {',
      '  return <div>{children}</div>;',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('skips exempt files', () => {
    const issues = pageStructure.check(ctx('Header.tsx', [
      'import Page from "./Page";',
      'export default function Header() {',
      '  return <div>header</div>;',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('skips Page.tsx itself', () => {
    const issues = pageStructure.check(ctx('components/Page.tsx', [
      'import Page from "./Page";',
      'export default function Page() {',
      '  return <div>page</div>;',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('flags template missing Page wrapper', () => {
    const issues = pageStructure.check(ctx('MyTemplate.tsx', [
      'import Page from "./Page";',
      'export default function MyTemplate() {',
      '  return (',
      '    <div>content without Page</div>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues.length).toBeGreaterThan(0);
  });

  it('passes template with Page wrapper', () => {
    const issues = pageStructure.check(ctx('MyTemplate.tsx', [
      'import Page from "./Page";',
      'export default function MyTemplate() {',
      '  return (',
      '    <Page pageSize="a4">',
      '      <Section title="Hello" />',
      '    </Page>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('flags nested Page components', () => {
    const issues = pageStructure.check(ctx('MyTemplate.tsx', [
      'import Page from "./Page";',
      'export default function MyTemplate() {',
      '  return (',
      '    <Page pageSize="a4">',
      '      <Page pageSize="a3">',
      '        <div>nested</div>',
      '      </Page>',
      '    </Page>',
      '  );',
      '}',
    ].join('\n')));
    const nested = issues.filter((i) => i.message.includes('Nested'));
    expect(nested).toHaveLength(1);
  });

  it('allows Header/Footer/PageBreak siblings to Page', () => {
    const issues = pageStructure.check(ctx('MyTemplate.tsx', [
      'import Page from "./Page";',
      'export default function MyTemplate() {',
      '  return (',
      '    <>',
      '      <Header />',
      '      <Page pageSize="a4">',
      '        <div>content</div>',
      '      </Page>',
      '      <PageBreak />',
      '      <Page pageSize="a4">',
      '        <div>page 2</div>',
      '      </Page>',
      '      <Footer />',
      '    </>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('flags content outside Page', () => {
    const issues = pageStructure.check(ctx('MyTemplate.tsx', [
      'import Page from "./Page";',
      'export default function MyTemplate() {',
      '  return (',
      '    <>',
      '      <Page pageSize="a4">',
      '        <div>inside</div>',
      '      </Page>',
      '      <Section title="orphaned" />',
      '    </>',
      '  );',
      '}',
    ].join('\n')));
    const orphaned = issues.filter((i) => i.message.includes('outside'));
    expect(orphaned).toHaveLength(1);
  });

  it('allows CoverPage as sibling to Page', () => {
    const issues = pageStructure.check(ctx('MyTemplate.tsx', [
      'import Page from "./Page";',
      'export default function MyTemplate() {',
      '  return (',
      '    <>',
      '      <CoverPage title="Report" />',
      '      <Page pageSize="a4">',
      '        <div>content</div>',
      '      </Page>',
      '    </>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('allows LandscapePage as sibling to Page', () => {
    const issues = pageStructure.check(ctx('MyTemplate.tsx', [
      'import Page from "./Page";',
      'export default function MyTemplate() {',
      '  return (',
      '    <>',
      '      <Page pageSize="a4">',
      '        <div>portrait content</div>',
      '      </Page>',
      '      <LandscapePage>',
      '        <div>landscape content</div>',
      '      </LandscapePage>',
      '    </>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('flags nested CoverPage inside Page', () => {
    const issues = pageStructure.check(ctx('MyTemplate.tsx', [
      'import Page from "./Page";',
      'export default function MyTemplate() {',
      '  return (',
      '    <Page pageSize="a4">',
      '      <CoverPage title="bad nesting" />',
      '    </Page>',
      '  );',
      '}',
    ].join('\n')));
    const nested = issues.filter((i) => i.message.includes('Nested'));
    expect(nested).toHaveLength(1);
  });

  it('flags custom Page file that does not use facet Page', () => {
    const issues = pageStructure.check(ctx('CoverPage.tsx', [
      'export default function CoverPage({ title }) {',
      '  return <div className="cover">{title}</div>;',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('must use the facet <Page>');
  });

  it('passes custom Page file that uses facet Page', () => {
    const issues = pageStructure.check(ctx('CoverPage.tsx', [
      'import { Page } from "@flanksource/facet";',
      'export default function CoverPage({ title }) {',
      '  return (',
      '    <Page pageSize="a4">',
      '      <div className="cover">{title}</div>',
      '    </Page>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });
});

describe('empty-page', () => {
  it('flags Page with no children', () => {
    const issues = emptyPage.check(ctx('Foo.tsx', [
      'export default function Foo() {',
      '  return <Page pageSize="a4"></Page>;',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('Empty');
  });

  it('flags Page with only whitespace', () => {
    const issues = emptyPage.check(ctx('Foo.tsx', [
      'export default function Foo() {',
      '  return (',
      '    <Page pageSize="a4">',
      '      ',
      '    </Page>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(1);
  });

  it('passes Page with element children', () => {
    const issues = emptyPage.check(ctx('Foo.tsx', [
      'export default function Foo() {',
      '  return (',
      '    <Page pageSize="a4">',
      '      <Section title="Hello" />',
      '    </Page>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('passes Page with text content', () => {
    const issues = emptyPage.check(ctx('Foo.tsx', [
      'export default function Foo() {',
      '  return <Page pageSize="a4">Hello World</Page>;',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('passes Page with expression children', () => {
    const issues = emptyPage.check(ctx('Foo.tsx', [
      'export default function Foo({ items }) {',
      '  return (',
      '    <Page pageSize="a4">',
      '      {items.map(i => <div key={i}>{i}</div>)}',
      '    </Page>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });

  it('flags empty CoverPage', () => {
    const issues = emptyPage.check(ctx('Foo.tsx', [
      'export default function Foo() {',
      '  return <CoverPage></CoverPage>;',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('CoverPage');
  });

  it('flags only empty pages in multi-page template', () => {
    const issues = emptyPage.check(ctx('Foo.tsx', [
      'export default function Foo() {',
      '  return (',
      '    <>',
      '      <Page pageSize="a4">',
      '        <div>content</div>',
      '      </Page>',
      '      <Page pageSize="a4"></Page>',
      '    </>',
      '  );',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(1);
    expect(issues[0].line).toBe(7);
  });
});

describe('interactive-content', () => {
  it('flags onClick handler', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `<button onClick={() => setCount(count + 1)}>Click</button>`));
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.message.includes('Event handlers'))).toBe(true);
  });

  it('flags useState hook', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `const [count, setCount] = useState(0);`));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('hooks');
  });

  it('does not flag useMemo', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `const val = useMemo(() => compute(), [dep]);`));
    expect(issues).toHaveLength(0);
  });

  it('flags hover Tailwind classes', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `<div className="hover:bg-blue-500 text-sm">`));
    expect(issues.some((i) => i.message.includes('Hover/focus'))).toBe(true);
  });

  it('flags focus states', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `<input className="focus:ring-2 focus:ring-blue-500" />`));
    const focusIssues = issues.filter((i) => i.message.includes('Hover/focus'));
    expect(focusIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('flags cursor-pointer', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `<span className="cursor-pointer text-blue-600">click me</span>`));
    expect(issues.some((i) => i.message.includes('Cursor'))).toBe(true);
  });

  it('flags transitions', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `<div className="transition-colors duration-200">`));
    expect(issues.some((i) => i.message.includes('transitions'))).toBe(true);
  });

  it('flags form elements', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `<input type="text" placeholder="search" />`));
    expect(issues.some((i) => i.message.includes('Form elements'))).toBe(true);
  });

  it('flags video/audio/iframe', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `<video src="demo.mp4" autoPlay />`));
    expect(issues.some((i) => i.message.includes('media'))).toBe(true);
  });

  it('flags browser APIs', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `const width = window.innerWidth;`));
    expect(issues.some((i) => i.message.includes('Browser APIs'))).toBe(true);
  });

  it('flags timers', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `setTimeout(() => refresh(), 5000);`));
    expect(issues.some((i) => i.message.includes('Timers'))).toBe(true);
  });

  it('skips import lines', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `import { useState, useEffect } from 'react';`));
    expect(issues).toHaveLength(0);
  });

  it('skips comment lines', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx',
      `// onClick handler for interactive mode`));
    expect(issues).toHaveLength(0);
  });

  it('passes clean static component', () => {
    const issues = interactiveContent.check(ctx('Foo.tsx', [
      'export default function Foo({ title }) {',
      '  return <div className="text-lg font-bold">{title}</div>;',
      '}',
    ].join('\n')));
    expect(issues).toHaveLength(0);
  });
});
