import * as ts from 'typescript';

export interface JSXNode {
  name: string;
  line: number;
  children: JSXNode[];
  hasContent: boolean;
}

export function parseJSXTree(content: string): JSXNode[] {
  const source = ts.createSourceFile('temp.tsx', content, ts.ScriptTarget.Latest, true);
  const returnJSX = findDefaultExportReturn(source);
  if (!returnJSX) return [];
  return extractChildren(returnJSX, source);
}

function findDefaultExportReturn(source: ts.SourceFile): ts.Expression | undefined {
  let result: ts.Expression | undefined;

  function visit(node: ts.Node) {
    if (result) return;

    if (ts.isFunctionDeclaration(node) && hasExportDefault(node)) {
      result = findReturn(node);
      return;
    }

    if (ts.isExportAssignment(node) && ts.isArrowFunction(node.expression)) {
      result = findReturn(node.expression);
      return;
    }

    if (ts.isVariableStatement(node) && hasExportDefault(node)) {
      const decl = node.declarationList.declarations[0];
      if (decl?.initializer && ts.isArrowFunction(decl.initializer)) {
        result = findReturn(decl.initializer);
      }
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return result;
}

function hasExportDefault(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  if (!modifiers) return false;
  return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    && modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}

function findReturn(node: ts.Node): ts.Expression | undefined {
  let result: ts.Expression | undefined;

  function visit(child: ts.Node) {
    if (result) return;
    if (ts.isReturnStatement(child) && child.expression) {
      result = child.expression;
      return;
    }
    ts.forEachChild(child, visit);
  }

  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
    return node.body;
  }

  visit(node);
  return result;
}

function extractChildren(node: ts.Node, source: ts.SourceFile): JSXNode[] {
  if (ts.isParenthesizedExpression(node)) {
    return extractChildren(node.expression, source);
  }

  if (ts.isJsxFragment(node)) {
    return node.children
      .filter((c) => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c))
      .map((c) => jsxNodeFrom(c, source));
  }

  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    return [jsxNodeFrom(node, source)];
  }

  return [];
}

function jsxNodeFrom(node: ts.JsxElement | ts.JsxSelfClosingElement, source: ts.SourceFile): JSXNode {
  const name = getTagName(node);
  const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const children: JSXNode[] = [];
  let hasContent = ts.isJsxSelfClosingElement(node);

  if (ts.isJsxElement(node)) {
    for (const child of node.children) {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
        children.push(jsxNodeFrom(child, source));
        hasContent = true;
      } else if (ts.isJsxExpression(child) && child.expression) {
        collectFromExpression(child.expression, source, children);
        hasContent = true;
      } else if (ts.isJsxText(child) && child.text.trim().length > 0) {
        hasContent = true;
      }
    }
  }

  return { name, line, children, hasContent };
}

function collectFromExpression(expr: ts.Expression, source: ts.SourceFile, out: JSXNode[]) {
  if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr)) {
    out.push(jsxNodeFrom(expr, source));
    return;
  }

  if (ts.isConditionalExpression(expr)) {
    collectFromExpression(expr.whenTrue, source, out);
    collectFromExpression(expr.whenFalse, source, out);
    return;
  }

  if (ts.isCallExpression(expr)) {
    for (const arg of expr.arguments) {
      if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
        visitForJSX(arg.body, source, out);
      }
    }
    return;
  }

  if (ts.isParenthesizedExpression(expr)) {
    collectFromExpression(expr.expression, source, out);
  }
}

function visitForJSX(node: ts.Node, source: ts.SourceFile, out: JSXNode[]) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    out.push(jsxNodeFrom(node, source));
    return;
  }
  if (ts.isParenthesizedExpression(node)) {
    visitForJSX(node.expression, source, out);
    return;
  }
  ts.forEachChild(node, (child) => visitForJSX(child, source, out));
}

function getTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const tag = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  if (ts.isIdentifier(tag)) return tag.text;
  if (ts.isPropertyAccessExpression(tag)) return tag.getText();
  return tag.getText();
}
