import { posix } from 'node:path';
import JSZip from 'jszip';
import { first, parseXml, walk, type XmlNode } from './xml.js';

export interface Relationship { id: string; type: string; target: string; external: boolean }
export interface DocxPackage {
  main: string;
  files: Map<string, JSZip.JSZipObject>;
  xml: Map<string, XmlNode[]>;
  relationships: Map<string, Relationship[]>;
  contentType: (path: string) => string;
}

function partPath(path: string): string {
  const decoded = decodeURIComponent(path);
  const normalized = posix.normalize(decoded.replace(/^\//, ''));
  if (normalized.startsWith('../') || normalized === '..' || decoded.includes('\\')) throw new Error(`Invalid Office part path: ${path}`);
  return normalized;
}

function resolveTarget(owner: string, target: string): string {
  const path = target.split('#')[0];
  return partPath(path.startsWith('/') ? path : posix.join(posix.dirname(owner), path));
}

function ownerPath(path: string): string {
  if (path === '_rels/.rels') return '';
  const match = path.match(/^(.*\/)?_rels\/(.+)\.rels$/);
  if (!match) throw new Error(`Invalid relationships path: ${path}`);
  return `${match[1] ?? ''}${match[2]}`;
}

export async function openDocx(data: Uint8Array): Promise<DocxPackage> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(data, { checkCRC32: true }); }
  catch (cause) { throw new Error(`Invalid DOCX ZIP: ${cause instanceof Error ? cause.message : String(cause)}`, { cause }); }
  const files = new Map<string, JSZip.JSZipObject>();
  for (const file of Object.values(zip.files).filter((file) => !file.dir)) {
    const path = partPath(file.name);
    if (files.has(path)) throw new Error(`Duplicate Office part: ${path}`);
    files.set(path, file);
  }
  for (const path of ['[Content_Types].xml', '_rels/.rels']) if (!files.has(path)) throw new Error(`Missing DOCX part: ${path}`);
  const xml = new Map<string, XmlNode[]>();
  for (const [path, file] of files) if (/\.(xml|rels)$/i.test(path)) xml.set(path, parseXml({ path, xml: await file.async('string') }));
  const relationships = new Map<string, Relationship[]>();
  for (const [path, tree] of xml) if (path.endsWith('.rels')) {
    const owner = ownerPath(path);
    const entries: Relationship[] = [];
    for (const node of walk(tree)) if (node.name === 'Relationship') {
      const { Id: id, Type: type, Target: target, TargetMode } = node.attributes;
      if (!id || !type || !target || entries.some((entry) => entry.id === id)) throw new Error(`${path}: invalid or duplicate relationship ${id}`);
      const external = TargetMode === 'External';
      const resolved = external ? target : resolveTarget(owner, target);
      if (!external && !files.has(resolved)) throw new Error(`${path}: missing referenced part ${resolved}`);
      entries.push({ id, type, target: resolved, external });
    }
    relationships.set(owner, entries);
  }
  const main = relationships.get('')?.find((entry) => entry.type.endsWith('/officeDocument') && !entry.external)?.target;
  if (!main || !first(xml.get(main) ?? [], 'document')) throw new Error('Not a DOCX document: missing Word document part');
  const overrides = new Map<string, string>();
  const defaults = new Map<string, string>();
  for (const node of walk(xml.get('[Content_Types].xml')!)) {
    if (node.name === 'Override') overrides.set(partPath(node.attributes.PartName), node.attributes.ContentType);
    if (node.name === 'Default') defaults.set(node.attributes.Extension.toLowerCase(), node.attributes.ContentType);
  }
  const contentType = (path: string): string => {
    const type = overrides.get(path) ?? defaults.get(posix.extname(path).slice(1).toLowerCase());
    if (!type) throw new Error(`Missing Office content type: ${path}`);
    return type;
  };
  if (contentType(main) !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml') throw new Error(`Unsupported Word document type: ${contentType(main)}`);
  return { main, files, xml, relationships, contentType };
}

export function relationship(pkg: DocxPackage, part: string, id: string): Relationship {
  const entry = pkg.relationships.get(part)?.find((entry) => entry.id === id);
  if (!entry) throw new Error(`${part}: missing relationship ${id}`);
  return entry;
}
