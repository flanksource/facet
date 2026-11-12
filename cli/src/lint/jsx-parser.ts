import { children, node, parseProgram, walk, type AstNode } from './parser.js';
export interface JSXNode { name: string; line: number; children: JSXNode[]; hasContent: boolean }
export async function parseJSXTree(content: string): Promise<JSXNode[]> {
  let returned: AstNode | undefined;
  walk(await parseProgram(content), current => {
    if (returned || current.type !== 'ExportDefaultDeclaration') return;
    const declaration = node(current.declaration);
    if (!declaration) return;
    const body = node(declaration.body);
    if (declaration.type === 'ArrowFunctionExpression' && body?.type !== 'BlockStatement') returned = body;
    else walk(declaration, value => {
      if (value.type === 'ReturnStatement' && !returned) returned = node(value.argument);
    });
  });
  if (!returned) return [];
  const out: JSXNode[] = [];
  collect(returned, content, out);
  return out;
}
function collect(value: AstNode, content: string, out: JSXNode[]): void {
  if (value.type === 'JSXElement') {
    const opening = node(value.openingElement)!;
    const tag = node(opening.name)!;
    const nested: JSXNode[] = [];
    const items = Array.isArray(value.children) ? value.children : [];
    for (const child of items) if (node(child)) collect(node(child)!, content, nested);
    out.push({ name: content.slice(tag.start, tag.end), line: content.slice(0, value.start).split('\n').length,
      children: nested, hasContent: opening.selfClosing === true || items.some(child => {
        const item = node(child);
        if (!item) return false;
        if (item.type === 'JSXText') return String(item.value).trim().length > 0;
        if (item.type === 'JSXExpressionContainer') return node(item.expression)?.type !== 'JSXEmptyExpression';
        return item.type === 'JSXElement' || (item.type === 'JSXFragment' && nested.length > 0);
      }) });
    return;
  }
  for (const child of children(value)) collect(child, content, out);
}
