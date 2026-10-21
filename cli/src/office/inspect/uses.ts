import type { AssetUse, Dimensions } from './types.js';
import { relationship, type DocxPackage } from './package.js';
import { first, mm, numeric, walk, type XmlNode } from './xml.js';

export interface AssetReferences { uses: Map<string, AssetUse[]>; progIds: Map<string, Set<string>>; previews: Map<string, Set<string>> }

export function partRole(pkg: DocxPackage, part: string): AssetUse['role'] {
  if (part === pkg.main) return 'body';
  for (const entries of pkg.relationships.values()) for (const entry of entries) if (!entry.external && entry.target === part) {
    for (const role of ['header', 'footer'] as const) if (entry.type.endsWith(`/${role}`)) return role;
    if (entry.type.endsWith('/fontTable')) return 'font';
  }
  return 'other';
}

function shapeSize(node: XmlNode | undefined): Dimensions | undefined {
  const values = new Map((node?.attributes.style ?? '').split(';').flatMap((entry) => {
    const [key, value] = entry.trim().split(/\s*:\s*/, 2);
    return value === undefined ? [] : [[key, value] as const];
  }));
  const length = (value: string | undefined): number | undefined => {
    if (value === undefined) return undefined;
    const match = value.match(/^([+-]?[\d.]+)(pt|px|mm|cm|in)?$/);
    if (!match) throw new Error(`Unsupported Word shape dimension: ${value}`);
    const scales: Record<string, number> = { pt: 25.4 / 72, px: 25.4 / 96, mm: 1, cm: 10, in: 25.4 };
    return mm(numeric(match[1], 'Word shape dimension') * scales[match[2] ?? 'px']);
  };
  const widthMm = length(values.get('width'));
  const heightMm = length(values.get('height'));
  return widthMm === undefined || heightMm === undefined ? undefined : { widthMm, heightMm };
}

export function inspectReferences(pkg: DocxPackage): AssetReferences {
  const result: AssetReferences = { uses: new Map(), progIds: new Map(), previews: new Map() };
  const add = (part: string, id: string, details: Pick<AssetUse, 'kind' | 'dimensions' | 'preview'>): string | undefined => {
    const rel = relationship(pkg, part, id);
    if (rel.external) return undefined;
    const uses = result.uses.get(rel.target) ?? [];
    uses.push({ part, relationshipId: id, role: partRole(pkg, part), ...details });
    result.uses.set(rel.target, uses);
    return rel.target;
  };
  const visit = (part: string, node: XmlNode): void => {
    if (node.name === 'object') {
      for (const object of walk(node.children)) if (object.name === 'OLEObject') {
        const shape = [...walk(node.children)].find((child) => child.name === 'shape' && child.attributes.id === object.attributes.ShapeID);
        const dimensions = shapeSize(shape);
        const imageId = shape ? first(shape.children, 'imagedata')?.attributes.id : undefined;
        const preview = imageId ? add(part, imageId, { kind: 'image', dimensions }) : undefined;
        const target = add(part, object.attributes.id, { kind: 'object', ...(dimensions ? { dimensions } : {}), ...(preview ? { preview } : {}) });
        if (target && object.attributes.ProgID) result.progIds.set(target, (result.progIds.get(target) ?? new Set()).add(object.attributes.ProgID));
        if (preview && target) result.previews.set(preview, (result.previews.get(preview) ?? new Set()).add(target));
      }
      return;
    }
    if (node.name === 'drawing') {
      const extent = first(node.children, 'extent');
      const dimensions = extent?.attributes.cx !== undefined && extent.attributes.cy !== undefined ? {
        widthMm: mm(numeric(extent.attributes.cx, `${part}: image width`) / 36000), heightMm: mm(numeric(extent.attributes.cy, `${part}: image height`) / 36000),
      } : undefined;
      for (const image of walk(node.children)) if (image.name === 'blip' && image.attributes.embed) add(part, image.attributes.embed, { kind: 'image', ...(dimensions ? { dimensions } : {}) });
      return;
    }
    if (node.name === 'pict') {
      for (const shape of walk(node.children)) if (shape.name === 'shape') {
        const image = first(shape.children, 'imagedata');
        if (image?.attributes.id) add(part, image.attributes.id, { kind: 'image', dimensions: shapeSize(shape) });
      }
      return;
    }
    if (/^embed(Regular|Bold|Italic|BoldItalic)$/.test(node.name) && node.attributes.id) add(part, node.attributes.id, { kind: 'font' });
    node.children.forEach((child) => visit(part, child));
  };
  for (const [part, nodes] of pkg.xml) nodes.forEach((node) => visit(part, node));
  for (const [part, entries] of pkg.relationships) for (const entry of entries) {
    if (entry.external || !/\/(image|oleObject|package|font|audio|video)$/.test(entry.type)) continue;
    if (!result.uses.get(entry.target)?.some((use) => use.part === part && use.relationshipId === entry.id)) add(part, entry.id, { kind: 'relationship' });
  }
  return result;
}
