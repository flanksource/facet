import type { DocxPackage } from './package.js';
import type { SectionInfo } from './types.js';
import { mm, numeric, type XmlNode } from './xml.js';

function* sections(nodes: XmlNode[]): Generator<XmlNode> {
  for (const node of nodes) {
    if (node.name === 'sectPrChange' || node.name === 'pPrChange') continue;
    if (node.name === 'sectPr') yield node;
    else yield* sections(node.children);
  }
}

export function inspectSections(pkg: DocxPackage): SectionInfo[] {
  return [...sections(pkg.xml.get(pkg.main)!)].map((node, index) => {
    const size = node.children.find((child) => child.name === 'pgSz');
    const margins = node.children.find((child) => child.name === 'pgMar');
    const value = (attributes: Record<string, string> | undefined, key: string): number | null => attributes?.[key] === undefined
      ? null : mm(numeric(attributes[key], `${pkg.main}: section ${index + 1} ${key}`) * 25.4 / 1440);
    const widthMm = value(size?.attributes, 'w');
    const heightMm = value(size?.attributes, 'h');
    if ((widthMm !== null && widthMm <= 0) || (heightMm !== null && heightMm <= 0)) throw new Error(`${pkg.main}: invalid section ${index + 1} page size`);
    return { index: index + 1, size: widthMm === null || heightMm === null ? null : { widthMm, heightMm }, orientation: size?.attributes.orient ?? null,
      margins: { topMm: value(margins?.attributes, 'top'), rightMm: value(margins?.attributes, 'right'), bottomMm: value(margins?.attributes, 'bottom'),
        leftMm: value(margins?.attributes, 'left'), headerMm: value(margins?.attributes, 'header'), footerMm: value(margins?.attributes, 'footer'), gutterMm: value(margins?.attributes, 'gutter') } };
  });
}
