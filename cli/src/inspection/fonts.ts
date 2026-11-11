import { relationship, type DocxPackage } from './package.js';
import type { WordFont } from './types.js';
import { first, walk } from './xml.js';

export function inspectWordFonts(pkg: DocxPackage): WordFont[] {
  const fonts = new Map<string, WordFont>();
  const themes = new Map<string, string>();
  const add = (name: string, source: { part: string; elementPath: string; kind?: WordFont['kind'] }): WordFont => {
    const { part, elementPath, kind = 'font' } = source;
    const key = `${kind}:${name}`;
    const font = fonts.get(key) ?? { name, kind, sources: [], embedded: [], locations: [] };
    if (!font.sources.includes(part)) font.sources.push(part);
    if (!font.locations.some(location => location.part === part && location.elementPath === elementPath)) font.locations.push({ part, elementPath });
    fonts.set(key, font);
    return font;
  };
  const themeParts = new Set([...pkg.relationships.values()].flat().filter((entry) => !entry.external && entry.type.endsWith('/theme')).map((entry) => entry.target));
  for (const part of themeParts) for (const node of walk(pkg.xml.get(part) ?? [])) {
    if (!['majorFont', 'minorFont'].includes(node.name)) continue;
    for (const child of node.children) {
      const name = child.attributes.typeface;
      if (!name) continue;
      add(name, { part, elementPath: child.path });
      const family = node.name === 'majorFont' ? 'major' : 'minor';
      if (child.name === 'latin') for (const suffix of ['Ascii', 'HAnsi']) themes.set(`${family}${suffix}`, name);
      if (child.name === 'ea') themes.set(`${family}EastAsia`, name);
      if (child.name === 'cs') themes.set(`${family}Bidi`, name);
    }
  }
  const fontTables = new Set([...pkg.relationships.values()].flat().filter((entry) => !entry.external && entry.type.endsWith('/fontTable')).map((entry) => entry.target));
  for (const [part, tree] of pkg.xml) {
    for (const node of walk(tree)) {
      if (node.name === 'rFonts') {
        for (const [attribute, value] of Object.entries(node.attributes)) {
          if (!value || attribute === 'hint') continue;
          if (['ascii', 'hAnsi', 'eastAsia', 'cs'].includes(attribute)) add(value, { part, elementPath: node.path });
          if (attribute.toLowerCase().endsWith('theme')) add(themes.get(value) ?? value, { part, elementPath: node.path, kind: themes.has(value) ? 'font' : 'theme' });
        }
      }
      if (fontTables.has(part) && node.name === 'font') {
        const name = node.attributes.name;
        if (!name) throw new Error(`${part}: font entry is missing its name`);
        const font = add(name, { part, elementPath: node.path });
        for (const child of node.children) if (/^embed(Regular|Bold|Italic|BoldItalic)$/.test(child.name)) {
          const rel = relationship(pkg, part, child.attributes.id);
          if (rel.external) throw new Error(`${part}: embedded font cannot be external: ${rel.id}`);
          font.embedded.push({ part: rel.target, variant: child.name.slice('embed'.length).replace(/^[A-Z]/, (letter) => letter.toLowerCase()) });
        }
        const alias = first(node.children, 'altName')?.attributes.val;
        if (alias) add(alias, { part, elementPath: node.path });
      }
    }
  }
  return [...fonts.values()].map((font) => ({ ...font, sources: font.sources.sort(), embedded: font.embedded.sort((a, b) => a.variant.localeCompare(b.variant) || a.part.localeCompare(b.part)) }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));
}
