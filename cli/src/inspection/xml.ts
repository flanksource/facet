import { XMLParser, XMLValidator } from 'fast-xml-parser';

export interface XmlNode { name: string; path: string; attributes: Record<string, string>; children: XmlNode[] }

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected an XML node');
  return value as Record<string, unknown>;
}

function nodes(value: unknown, parent = ''): XmlNode[] {
  if (!Array.isArray(value)) throw new Error('Expected ordered XML nodes');
  const counts = new Map<string, number>();
  return value.flatMap((item): XmlNode[] => {
    const entry = record(item);
    const attributes = Object.fromEntries(Object.entries(entry[':@'] === undefined ? {} : record(entry[':@'])).map(([key, value]) => [key, String(value)]));
    return Object.entries(entry).filter(([name]) => ![':@', '#text', '#comment', '#cdata'].includes(name) && !name.startsWith('?'))
      .map(([name, children]) => {
        const index = (counts.get(name) ?? 0) + 1;
        counts.set(name, index);
        const path = `${parent}/${name}[${index}]`;
        return { name, path, attributes, children: nodes(children, path) };
      });
  });
}

export function parseXml(options: { path: string; xml: string }): XmlNode[] {
  try {
    if (/<!DOCTYPE\b/i.test(options.xml)) throw new Error('DOCTYPE declarations are not supported in Office parts');
    const valid = XMLValidator.validate(options.xml);
    if (valid !== true) throw new Error(valid.err.msg);
    const parsed: unknown = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '', removeNSPrefix: true,
      parseTagValue: false, parseAttributeValue: false, trimValues: false, ignoreDeclaration: true, ignorePiTags: true }).parse(options.xml);
    return nodes(parsed);
  } catch (cause) {
    throw new Error(`${options.path}: invalid XML: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}

export function* walk(nodes: XmlNode[]): Generator<XmlNode> {
  for (const node of nodes) { yield node; yield* walk(node.children); }
}

export function first(nodes: XmlNode[], name: string): XmlNode | undefined {
  for (const node of walk(nodes)) if (node.name === name) return node;
  return undefined;
}

export function mm(value: number): number { return Math.round(value * 1000) / 1000; }

export function numeric(value: string, context: string): number {
  if (!/^-?\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw new Error(`${context}: invalid number ${JSON.stringify(value)}`);
  return Number(value);
}
