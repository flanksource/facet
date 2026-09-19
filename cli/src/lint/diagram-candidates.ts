import remarkParse from 'remark-parse';
import { unified } from 'unified';
import * as ts from 'typescript';

const DIAGRAM_NAMES = new Set(['Diagram', 'FlowDiagram', 'DiagreDiagram']);

/**
 * Find the end of a JavaScript expression, retaining strings and templates as
 * opaque text so braces in them do not end the expression early.
 */
function scanJsExpression(source: string, start: number): number {
  let depth = 1;
  let position = start + 1;

  const scanString = (quote: string, from: number): number => {
    let index = from + 1;
    while (index < source.length) {
      if (source[index] === '\\') index += 2;
      else if (source[index] === quote) return index + 1;
      else index++;
    }
    return source.length;
  };
  const scanTemplate = (from: number): number => {
    let index = from + 1;
    while (index < source.length) {
      if (source[index] === '\\') {
        index += 2;
      } else if (source[index] === '`') {
        return index + 1;
      } else if (source.startsWith('${', index)) {
        index = scanJsExpression(source, index + 1);
      } else {
        index++;
      }
    }
    return source.length;
  };

  while (position < source.length && depth > 0) {
    const character = source[position];
    if (character === "'" || character === '"') {
      position = scanString(character, position);
    } else if (character === '`') {
      position = scanTemplate(position);
    } else if (source.startsWith('//', position)) {
      const newline = source.indexOf('\n', position + 2);
      position = newline < 0 ? source.length : newline + 1;
    } else if (source.startsWith('/*', position)) {
      const end = source.indexOf('*/', position + 2);
      position = end < 0 ? source.length : end + 2;
    } else if (character === '{') {
      depth++;
      position++;
    } else if (character === '}') {
      depth--;
      position++;
    } else {
      position++;
    }
  }
  return position;
}

interface JsxTag {
  end: number;
  selfClosing: boolean;
}

/** Scan a JSX opening/closing tag without interpreting its attributes. */
function scanJsxTag(source: string, start: number): JsxTag | undefined {
  if (source[start] !== '<') return undefined;
  const next = source[start + 1];
  const nextCodePoint = source.codePointAt(start + 1);
  if (next !== '>' && next !== '/' && (nextCodePoint === undefined || !ts.isIdentifierStart(nextCodePoint, ts.ScriptTarget.Latest))) return undefined;

  let position = start + 1;
  let quote: string | undefined;
  while (position < source.length) {
    const character = source[position];
    if (quote) {
      if (character === '\\') position += 2;
      else if (character === quote) {
        quote = undefined;
        position++;
      } else position++;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      position++;
    } else if (character === '{') {
      position = scanJsExpression(source, position);
    } else if (character === '>') {
      let previous = position - 1;
      while (previous > start && /\s/.test(source[previous])) previous--;
      return { end: position + 1, selfClosing: source[previous] === '/' };
    } else {
      position++;
    }
  }
  return undefined;
}

/**
 * Replace Markdown-only regions while retaining newlines for source positions
 * and for the compiler's tolerant recovery. JSX tags and expressions are then
 * scanned so their strings cannot be mistaken for Markdown syntax.
 */
interface MarkdownNode {
  type: string;
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
  children?: MarkdownNode[];
}

interface SourceRange {
  start: number;
  end: number;
}

function markdownCodeRanges(source: string): SourceRange[] {
  const tree = unified().use(remarkParse).parse(source) as MarkdownNode;
  const ranges: SourceRange[] = [];
  const visit = (node: MarkdownNode): void => {
    if ((node.type === 'code' || node.type === 'inlineCode') && node.position?.start?.offset !== undefined && node.position.end?.offset !== undefined) {
      ranges.push({ start: node.position.start.offset, end: node.position.end.offset });
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return ranges.sort((left, right) => left.start - right.start || left.end - right.end);
}

function neutralizeMdx(source: string): string {
  const chars = source.split('');
  const blank = (start: number, end: number): void => {
    for (let index = start; index < end; index++) {
      if (chars[index] !== '\n' && chars[index] !== '\r') chars[index] = ' ';
    }
  };
  const protectedRanges = markdownCodeRanges(source);
  for (const range of protectedRanges) blank(range.start, range.end);
  let protectedRangeIndex = 0;
  const skipProtectedRange = (position: number): number | undefined => {
    while (protectedRangeIndex < protectedRanges.length && protectedRanges[protectedRangeIndex].end <= position) protectedRangeIndex++;
    const range = protectedRanges[protectedRangeIndex];
    if (range && position >= range.start && position < range.end) return range.end;
    return undefined;
  };
  const lineEnd = (position: number): number => {
    const newline = source.indexOf('\n', position);
    return newline < 0 ? source.length : newline;
  };
  const lineStart = (position: number): number => {
    const newline = source.lastIndexOf('\n', position - 1);
    return newline < 0 ? 0 : newline + 1;
  };
  const blankFence = (start: number, marker: string, length: number): number => {
    const openingEnd = lineEnd(start);
    blank(start, openingEnd);
    let position = openingEnd < source.length ? openingEnd + 1 : openingEnd;
    const closing = new RegExp(`^ {0,3}${marker}{${length},}\\s*$`);
    while (position < source.length) {
      const end = lineEnd(position);
      const line = source.slice(position, end);
      blank(position, end);
      position = end < source.length ? end + 1 : end;
      if (closing.test(line)) break;
    }
    return position;
  };

  let position = 0;
  let jsxDepth = 0;
  while (position < source.length) {
    const protectedEnd = skipProtectedRange(position);
    if (protectedEnd !== undefined) {
      position = protectedEnd;
      continue;
    }
    if (jsxDepth > 0) {
      if (source[position] === '{') {
        position = scanJsExpression(source, position);
      } else if (source[position] === '<') {
        const tag = scanJsxTag(source, position);
        if (!tag) {
          position++;
        } else {
          const closing = source[position + 1] === '/';
          if (closing) jsxDepth--;
          else if (!tag.selfClosing) jsxDepth++;
          position = tag.end;
        }
      } else {
        position++;
      }
      continue;
    }

    const start = lineStart(position);
    if (position === start) {
      const end = lineEnd(position);
      const fence = /^ {0,3}(`{3,}|~{3,})/.exec(source.slice(position, end));
      if (fence) {
        position = blankFence(position, fence[1][0], fence[1].length);
        continue;
      }
    }

    if (source[position] === '<') {
      const tag = scanJsxTag(source, position);
      if (tag) {
        if (source[position + 1] !== '/' && !tag.selfClosing) jsxDepth = 1;
        position = tag.end;
        continue;
      }
    }
    if (source.startsWith('<!--', position)) {
      const end = source.indexOf('-->', position + 4);
      const commentEnd = end < 0 ? source.length : end + 3;
      blank(position, commentEnd);
      position = commentEnd;
      continue;
    }
    if (source.startsWith('{/*', position)) {
      const end = source.indexOf('*/}', position + 3);
      const commentEnd = end < 0 ? source.length : end + 3;
      blank(position, commentEnd);
      position = commentEnd;
      continue;
    }
    if (source[position] === '{') {
      position = scanJsExpression(source, position);
      continue;
    }
    if (source[position] === '`') {
      let length = 1;
      while (source[position + length] === '`') length++;
      const closing = source.indexOf('`'.repeat(length), position + length);
      const codeEnd = closing < 0 ? source.length : closing + length;
      blank(position, codeEnd);
      position = codeEnd;
      continue;
    }
    position++;
  }
  return chars.join('');
}

function sourceHasDiagramElement(source: string): boolean {
  const file = ts.createSourceFile('diagram-candidate.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isJsxOpeningLikeElement(node) && ts.isIdentifier(node.tagName) && DIAGRAM_NAMES.has(node.tagName.text)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/**
 * Detect direct diagram JSX with the TypeScript parser. Aliases, member
 * expressions, and wrapper components are deliberately not candidates.
 */
export function hasDirectDiagramCandidate(source: string, fileType: 'tsx' | 'mdx'): boolean {
  const prepared = fileType === 'mdx' ? neutralizeMdx(source) : source;
  if (sourceHasDiagramElement(prepared)) return true;

  // Markdown prose before a JSX block can stop TypeScript's normal recovery
  // before it reaches the block. Scanner positions are only used to isolate
  // possible JSX starts; acceptance still requires a parsed JSX opening node.
  if (fileType !== 'mdx') return false;
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, prepared);
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (token === ts.SyntaxKind.LessThanToken && sourceHasDiagramElement(prepared.slice(scanner.getTokenPos()))) return true;
    token = scanner.scan();
  }
  return false;
}
