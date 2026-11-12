import { pathToFileURL } from 'node:url';
import { toolPath } from '../runtime/tools.js';

export interface AstNode { type: string; start: number; end: number; [key: string]: unknown }
let parser: Promise<typeof import('rolldown/utils')> | undefined;

export function node(value: unknown): AstNode | undefined {
  return value !== null && typeof value === 'object' && 'type' in value && typeof value.type === 'string' ? value as AstNode : undefined;
}

export function children(value: AstNode): AstNode[] {
  return Object.values(value).flatMap(item => (Array.isArray(item) ? item : [item]).flatMap(child => {
    const parsed = node(child);
    return parsed ? [parsed] : [];
  }));
}

export function walk(value: AstNode, visit: (value: AstNode) => boolean | void): void {
  if (visit(value) === false) return;
  for (const child of children(value)) walk(child, visit);
}

export async function parseProgram(source: string): Promise<AstNode> {
  parser ??= toolPath('rolldown/utils').then(path => import(pathToFileURL(path).href));
  const { parseSync } = await parser;
  const program = node(parseSync('template.tsx', source).program);
  if (!program) throw new Error('Rolldown returned no syntax tree for template.tsx');
  return program;
}
