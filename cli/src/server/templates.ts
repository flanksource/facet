import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';

export interface TemplateInfo {
  name: string;
  entryFile: string;
  consumerRoot: string;
  schema?: Record<string, unknown>;
  description?: string;
}

const ENTRY_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];

async function findEntryFile(dir: string): Promise<string | null> {
  const files = await readdir(dir);
  for (const ext of ENTRY_EXTENSIONS) {
    const match = files.find(
      (f) => f === `index${ext}` || f === `template${ext}` || f === `main${ext}`,
    );
    if (match) return match;
  }
  // Fall back to first tsx/jsx file
  for (const ext of ENTRY_EXTENSIONS) {
    const match = files.find((f) => f.endsWith(ext));
    if (match) return match;
  }
  return null;
}

export async function discoverTemplates(dir: string): Promise<TemplateInfo[]> {
  const templates: TemplateInfo[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return templates;
  }

  for (const name of entries) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const fullPath = join(dir, name);
    const s = await stat(fullPath);

    if (s.isFile() && ENTRY_EXTENSIONS.some(ext => name.endsWith(ext))) {
      const templateName = name.replace(/\.[^.]+$/, '');
      templates.push({ name: templateName, entryFile: name, consumerRoot: dir });
      continue;
    }

    if (!s.isDirectory()) continue;

    const entryFile = await findEntryFile(fullPath);
    if (!entryFile) continue;

    const info: TemplateInfo = { name, entryFile, consumerRoot: fullPath };

    try {
      const schemaRaw = await readFile(join(fullPath, 'schema.json'), 'utf-8');
      const schema = JSON.parse(schemaRaw);
      info.schema = schema;
      info.description = schema.description;
    } catch {
      // no schema
    }

    templates.push(info);
  }

  return templates;
}

export function resolveLocalTemplate(
  name: string,
  templates: TemplateInfo[],
): TemplateInfo | null {
  return templates.find((t) => t.name === name) ?? null;
}
