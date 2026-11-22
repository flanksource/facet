import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { isSea } from 'node:sea';
import { pathToFileURL } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import type { DocumentSource } from '@flanksource/page-runtime/schema';
import { discoverThemes } from '../builders/themes.js';
import { browserTemplateLayout } from '../runtime/browser-template-layout.js';
import { cliDependencyPath } from '../runtime/cli-dependencies.js';
import { toolPath } from '../runtime/tools.js';

const scripts = /\.[cm]?[jt]sx?$/i;
const textFiles = /\.(?:[cm]?[jt]sx?|mdx?|css|json|txt|svg)$/i;
const relativePath = /^\.{1,2}\//;
const platformPackages = new Set(['react', 'react-dom', 'scheduler', 'jotai', '@tanstack/react-query', '@flanksource/clicky-ui', '@flanksource/facet']);
let parser: Promise<typeof import('rolldown/utils')> | undefined;

async function loadParser(): Promise<typeof import('rolldown/utils')> {
  const specifier = 'rolldown/utils';
  const path = isSea() ? await toolPath(specifier) : cliDependencyPath(specifier);
  return import(pathToFileURL(path).href);
}

async function scriptReferences(path: string, source: string): Promise<string[]> {
  parser ??= loadParser();
  const { parseSync } = await parser;
  const { module } = parseSync(path, source);
  return [
    ...module.staticImports.filter(item => !item.entries.length || item.entries.some(entry => !entry.isType)).map(item => item.moduleRequest.value),
    ...module.staticExports.flatMap(item => item.entries.flatMap(entry => entry.moduleRequest && !entry.isType ? [entry.moduleRequest.value] : [])),
    ...module.dynamicImports.flatMap(item => {
      const request = source.slice(item.moduleRequest.start, item.moduleRequest.end);
      return /^(['"])[^\n]*\1$/.test(request) ? [request.slice(1, -1)] : [];
    }),
  ];
}

async function fileReferences(path: string, source: string): Promise<string[]> {
  if (scripts.test(path)) {
    const assets = [...source.matchAll(/new URL\(\s*(['"])([^'":?#]+)\1\s*,\s*import\.meta\.url\s*\)/g)]
      .map(match => match[2]!.startsWith('/') ? match[2]! : `./${match[2]}`);
    return [...await scriptReferences(path, source), ...assets];
  }
  if (path.endsWith('.css')) {
    return [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)|@import\s+(?:"([^"]+)"|'([^']+)')/g)]
      .flatMap(match => { const url = match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5]!; return /^(?:[a-z][a-z+.-]*:|[#/])/i.test(url) ? [] : [`./${url}`]; });
  }
  if (!/\.mdx?$/i.test(path)) return [];
  type Markdown = { type: string; value?: string; url?: string; identifier?: string; children?: Markdown[] };
  const markdown = unified().use(remarkParse).use(remarkMdx).parse(source);
  const imageDefinitions = new Set<string>();
  const findImageDefinitions = (node: Markdown) => {
    if (node.type === 'imageReference' && node.identifier) imageDefinitions.add(node.identifier);
    node.children?.forEach(findImageDefinitions);
  };
  findImageDefinitions(markdown);
  const imports = async (node: Markdown): Promise<string[]> => {
    if (node.type === 'mdxjsEsm' && node.value) return fileReferences('document.mjs', node.value);
    if ((node.type === 'image' || (node.type === 'definition' && node.identifier && imageDefinitions.has(node.identifier))) && node.url && !/^(?:[a-z][a-z+.-]*:|[#/])/i.test(node.url)) return [`./${node.url}`];
    return (await Promise.all((node.children ?? []).map(imports))).flat();
  };
  return imports(markdown);
}

async function isFile(path: string): Promise<boolean> {
  try { return (await stat(path)).isFile(); }
  catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) return false;
    throw error;
  }
}

async function localReference(path: string, specifier: string): Promise<string> {
  const target = resolve(dirname(path), specifier.split(/[?#]/)[0]!);
  for (const suffix of ['', '.tsx', '.ts', '.jsx', '.js', '.mdx', '.md', '/index.tsx', '/index.ts', '/index.jsx', '/index.js']) {
    if (await isFile(target + suffix)) return target + suffix;
  }
  throw new Error(`${path}: cannot resolve local file ${specifier}`);
}

function within(root: string, file: string): string {
  const path = relative(root, file).split(sep).join('/');
  if (!path || path.startsWith('../') || path === '..' || path.split('/').includes('node_modules')) throw new Error(`${file}: browser export source must be within ${root}`);
  return path;
}

async function declaredDependencies(root: string, directory: string): Promise<Record<string, string>> {
  const manifest = resolve(directory, 'package.json');
  const inherited = directory === root ? {} : await declaredDependencies(root, dirname(directory));
  if (!await isFile(manifest)) return inherited;
  const { dependencies, optionalDependencies } = JSON.parse(await readFile(manifest, 'utf8'));
  return { ...inherited, ...dependencies, ...optionalDependencies };
}

export async function readHTMLSource(options: {
  templatePath: string; consumerRoot?: string; theme?: string; skipModules?: boolean;
  signal?: AbortSignal; maxBytes?: number; dependencies?: Record<string, string>; dynamicStyles?: boolean;
}): Promise<Pick<DocumentSource, 'page' | 'layout' | 'files' | 'dependencies' | 'dynamicStyles'>> {
  const entry = resolve(options.consumerRoot ?? process.cwd(), options.templatePath);
  const project = options.consumerRoot ?? (withinWorkingDirectory(entry) ? process.cwd() : dirname(entry));
  const root = await realpath(project);
  const page = within(root, resolve(root, relative(project, entry)));
  if (!/\.(?:tsx?|jsx?|mjs|mdx?)$/i.test(page)) throw new Error(`Unsupported browser template entry ${page}`);
  const files: DocumentSource['files'] = Object.create(null);
  const dependencies: Record<string, string> = Object.create(null);
  const seen = new Set<string>();
  let bytes = 0;
  const manifests = new Map<string, Promise<Record<string, string>>>();
  async function collect(file: string): Promise<void> {
    const path = within(root, file);
    if (seen.has(path)) return;
    seen.add(path);
    within(root, await realpath(file));
    const data = await readFile(file, { signal: options.signal });
    bytes += data.length;
    if (options.maxBytes !== undefined && bytes > options.maxBytes) throw new Error('Browser template exceeds the configured source size limit');
    if (!textFiles.test(path)) { files[path] = { base64: data.toString('base64') }; return; }
    const text = data.toString('utf8');
    files[path] = { text };
    for (const specifier of await fileReferences(path, text)) {
      if (relativePath.test(specifier)) { await collect(await localReference(file, specifier)); continue; }
      if (options.skipModules || specifier.startsWith('/') || /^[a-z]+:/i.test(specifier)) continue;
      const name = specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
      if (platformPackages.has(name)) continue;
      const directory = dirname(file);
      if (!manifests.has(directory)) manifests.set(directory, declaredDependencies(root, directory));
      const range = options.dependencies?.[name] ?? (await manifests.get(directory)!)?.[name];
      if (range === undefined) continue;
      if (typeof range !== 'string' || !range || /[:/]/.test(range)) throw new Error(`${path}: unsupported browser dependency ${name}@${String(range)}`);
      if (dependencies[name] && dependencies[name] !== range) throw new Error(`${path}: conflicting browser dependency ranges for ${name}`);
      dependencies[name] = range;
    }
  }
  await collect(resolve(root, page));
  const theme = options.theme && options.theme !== 'facet' ? [...discoverThemes(root), ...discoverThemes(process.cwd())].find(theme => theme.id === options.theme) : undefined;
  if (options.theme && options.theme !== 'facet' && !theme) throw new Error(`Unknown theme ${options.theme}`);
  if (theme) dependencies[theme.package] = theme.version;
  let layout = '.facet-document-layout.tsx';
  while (Object.hasOwn(files, layout)) layout = `.${layout}`;
  files[layout] = { text: browserTemplateLayout({ page, prose: true, themeModule: theme?.module ?? '@flanksource/facet/Theme', ...(theme ? { stylesheet: theme.module.slice(0, theme.module.lastIndexOf('/')) + '/styles.css' } : {}) }) };
  return { page, layout, dependencies, files, dynamicStyles: options.dynamicStyles !== false };
}

function withinWorkingDirectory(file: string): boolean {
  const path = relative(process.cwd(), file);
  return path !== '..' && !path.startsWith(`..${sep}`);
}
