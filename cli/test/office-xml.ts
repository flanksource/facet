import { XMLParser, XMLValidator } from 'fast-xml-parser';

export function officeText(xml: string): string {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error(`Invalid Office XML: ${JSON.stringify(valid)}`);
  const walk = (node: unknown, insideText = false): string => {
    if (Array.isArray(node)) return node.map((item) => walk(item, insideText)).join('');
    if (typeof node !== 'object' || node === null) return insideText ? String(node) : '';
    return Object.entries(node).map(([key, value]) => walk(value, insideText || key === 'a:t' || key === 'w:t')).join('');
  };
  return walk(new XMLParser({ preserveOrder: true, trimValues: false, parseTagValue: false }).parse(xml));
}
