import { describe, it, expect } from '@jest/globals';
import { parseJSXTree } from '../src/lint/jsx-parser.js';

describe('parseJSXTree', () => {
  it('parses single element return', () => {
    const tree = parseJSXTree([
      'export default function Foo() {',
      '  return <Page pageSize="a4"><div>hello</div></Page>;',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Page');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe('div');
  });

  it('parses fragment with multiple children', () => {
    const tree = parseJSXTree([
      'export default function Foo() {',
      '  return (',
      '    <>',
      '      <Header />',
      '      <Page pageSize="a4">',
      '        <Section />',
      '      </Page>',
      '      <Footer />',
      '    </>',
      '  );',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(3);
    expect(tree[0].name).toBe('Header');
    expect(tree[1].name).toBe('Page');
    expect(tree[2].name).toBe('Footer');
  });

  it('parses self-closing elements', () => {
    const tree = parseJSXTree([
      'export default function Foo() {',
      '  return <PageBreak />;',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('PageBreak');
    expect(tree[0].hasContent).toBe(true);
  });

  it('sets hasContent false for empty element', () => {
    const tree = parseJSXTree([
      'export default function Foo() {',
      '  return <Page></Page>;',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].hasContent).toBe(false);
  });

  it('sets hasContent false for whitespace-only element', () => {
    const tree = parseJSXTree([
      'export default function Foo() {',
      '  return (',
      '    <Page>',
      '      ',
      '    </Page>',
      '  );',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].hasContent).toBe(false);
  });

  it('sets hasContent true for text content', () => {
    const tree = parseJSXTree([
      'export default function Foo() {',
      '  return <Page>Hello World</Page>;',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].hasContent).toBe(true);
  });

  it('sets hasContent true for child elements', () => {
    const tree = parseJSXTree([
      'export default function Foo() {',
      '  return <Page><div>content</div></Page>;',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].hasContent).toBe(true);
  });

  it('sets hasContent true for expression children', () => {
    const tree = parseJSXTree([
      'export default function Foo({ items }) {',
      '  return (',
      '    <Page>',
      '      {items.map(i => <div key={i}>{i}</div>)}',
      '    </Page>',
      '  );',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].hasContent).toBe(true);
  });

  it('returns empty array for non-component file', () => {
    const tree = parseJSXTree('const x = 42; export { x };');
    expect(tree).toHaveLength(0);
  });

  it('handles arrow function default export', () => {
    const tree = parseJSXTree([
      'const Foo = () => <Page><div>hi</div></Page>;',
      'export default Foo;',
    ].join('\n'));
    // This pattern uses export default with identifier, not handled by AST
    // Only export default function and export default arrow are supported
    expect(tree).toHaveLength(0);
  });

  it('handles export default arrow function', () => {
    const tree = parseJSXTree([
      'export default () => (',
      '  <Page><div>hi</div></Page>',
      ');',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Page');
  });

  it('provides correct line numbers', () => {
    const tree = parseJSXTree([
      'export default function Foo() {',
      '  return (',
      '    <>',
      '      <Header />',
      '      <Page pageSize="a4">',
      '        <div>content</div>',
      '      </Page>',
      '    </>',
      '  );',
      '}',
    ].join('\n'));
    expect(tree[0].line).toBe(4);
    expect(tree[1].line).toBe(5);
  });

  it('handles ternary expressions in JSX', () => {
    const tree = parseJSXTree([
      'export default function Foo({ show }) {',
      '  return (',
      '    <Page>',
      '      {show ? <Section /> : <div>fallback</div>}',
      '    </Page>',
      '  );',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].hasContent).toBe(true);
    expect(tree[0].children).toHaveLength(2);
  });

  it('handles .map() callback children', () => {
    const tree = parseJSXTree([
      'export default function Foo({ items }) {',
      '  return (',
      '    <Page>',
      '      {items.map(item => (',
      '        <Card key={item.id} />',
      '      ))}',
      '    </Page>',
      '  );',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].hasContent).toBe(true);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe('Card');
  });

  it('handles deeply nested structure', () => {
    const tree = parseJSXTree([
      'export default function Foo() {',
      '  return (',
      '    <Page>',
      '      <Section>',
      '        <Card>',
      '          <Text />',
      '        </Card>',
      '      </Section>',
      '    </Page>',
      '  );',
      '}',
    ].join('\n'));
    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].name).toBe('Section');
    expect(tree[0].children[0].children[0].name).toBe('Card');
    expect(tree[0].children[0].children[0].children[0].name).toBe('Text');
  });
});
