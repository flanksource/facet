import type { ColorEntry, ColorInventory } from './colors.js';
import type { DocxPackage } from './package.js';
import { walk, type XmlNode } from './xml.js';

function hex(value: string): string | undefined {
  return /^[\da-f]{6}$/i.test(value) ? `#${value.toLowerCase()}` : undefined;
}

function declaration(node: XmlNode): { value: string; kind: string; modifiers?: Record<string, string> }[] {
  const a = node.attributes;
  const modifiers = Object.fromEntries([...Object.entries(a).filter(([key]) => /tint|shade/i.test(key)), ...node.children.map(child => [child.name, child.attributes.val])]);
  if (['srgbClr', 'schemeClr', 'sysClr', 'prstClr', 'scrgbClr', 'hslClr'].includes(node.name)) {
    return [{ value: node.name === 'sysClr' ? hex(a.lastClr ?? '') ?? a.val : hex(a.val ?? '') ?? a.val ?? JSON.stringify(a), kind: node.name, modifiers }];
  }
  if (['color', 'highlight', 'shd', 'background', 'top', 'bottom', 'left', 'right', 'insideH', 'insideV', 'start', 'end', 'border'].includes(node.name)) {
    return ['val', 'color', 'fill', 'themeColor', 'themeFill'].flatMap(key => {
      const value = a[key];
      if (!value || (key === 'val' && !['color', 'highlight'].includes(node.name))) return [];
      return [{ value: hex(value) ?? value, kind: key.startsWith('theme') ? 'theme' : node.name, modifiers }];
    });
  }
  return [];
}

export function inspectDocxColors(pkg: DocxPackage, positions: boolean): ColorInventory {
  const themes = new Map<string, string>();
  for (const [part, tree] of pkg.xml) if (part.includes('/theme/')) for (const node of walk(tree)) {
    if (node.name !== 'clrScheme') continue;
    for (const child of node.children) {
      const color = child.children[0];
      const value = color && hex(color.attributes.val ?? color.attributes.lastClr ?? '');
      if (value) themes.set(child.name, value);
    }
  }
  const entries = new Map<string, ColorEntry>();
  for (const [part, tree] of pkg.xml) for (const node of walk(tree)) for (const color of declaration(node)) {
    const value = ['schemeClr', 'theme'].includes(color.kind) ? themes.get(color.value) ?? color.value : color.value;
    const entry = { ...color, value };
    const key = JSON.stringify(entry);
    const existing = entries.get(key) ?? { ...entry, ...(positions ? { locations: [] } : {}) };
    existing.locations?.push({ type: 'docx', part, elementPath: node.path });
    entries.set(key, existing);
  }
  return { approximate: false, entries: [...entries.values()].sort((a, b) => a.value!.localeCompare(b.value!)) };
}
