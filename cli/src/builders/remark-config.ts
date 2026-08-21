/**
 * Frontmatter-driven remark/rehype plugin configuration.
 *
 * Markdown templates can declare extra remark/rehype plugins in their YAML
 * frontmatter; the generated `.facet/vite.config.ts` loads them in ADDITION to
 * the always-on defaults (remark-frontmatter to strip the YAML block, then
 * remark-gfm). This module holds the pure (filesystem-free) pieces so they can
 * be unit-tested without running a build: parsing frontmatter into specs and
 * turning specs into vite-config source.
 */

import { isAbsolute, resolve } from 'path';

/** A plugin reference: a module name/path, or `[name, options]`. */
export type PluginSpec = string | [string, unknown];

export interface RemarkConfig {
  remarkPlugins: PluginSpec[];
  rehypePlugins: PluginSpec[];
}

export const EMPTY_REMARK_CONFIG: RemarkConfig = { remarkPlugins: [], rehypePlugins: [] };

/**
 * Which classified regions this build may carry, as an explicit set of
 * permitted values per attribute. A set rather than a threshold: a
 * classification scheme need not be a total order, so a "level <= clearance"
 * comparison cannot express a tier that is less sensitive yet more widely
 * shared. `element` names the delimiting tag (default `Classified`).
 */
export interface RedactPolicy {
  element?: string;
  allow: Record<string, string[]>;
}

/** `tier=Public,Customer-Shared` → `{ tier: ['Public', 'Customer-Shared'] }`. */
export function parseRedactAllow(declarations: string[]): RedactPolicy | undefined {
  if (declarations.length === 0) return undefined;
  const allow: Record<string, string[]> = {};
  for (const declaration of declarations) {
    const separator = declaration.indexOf('=');
    if (separator < 1) {
      throw new Error(`--allow must be <attribute>=<value[,value]>, received "${declaration}"`);
    }
    const attribute = declaration.slice(0, separator).trim();
    const values = declaration.slice(separator + 1).split(',').map((value) => value.trim()).filter(Boolean);
    if (values.length === 0) throw new Error(`--allow ${attribute} lists no values`);
    allow[attribute] = [...(allow[attribute] ?? []), ...values];
  }
  return { allow };
}

export function hasPlugins(config: RemarkConfig): boolean {
  return config.remarkPlugins.length > 0 || config.rehypePlugins.length > 0;
}

/** Extract the leading `---`-delimited YAML frontmatter block, or null. */
export function extractFrontmatter(source: string): string | null {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  return match ? match[1] : null;
}

function normalizeSpecs(value: unknown, field: string): PluginSpec[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`frontmatter "${field}" must be a list of plugins, got ${typeof value}`);
  }
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (Array.isArray(item) && typeof item[0] === 'string') {
      return (item.length > 1 ? [item[0], item[1]] : item[0]) as PluginSpec;
    }
    throw new Error(`frontmatter "${field}" entries must be "name" or [name, options], got ${JSON.stringify(item)}`);
  });
}

/** Read remark/rehype plugin specs from a parsed frontmatter object. */
export function remarkConfigFromFrontmatter(frontmatter: Record<string, unknown> | null | undefined): RemarkConfig {
  if (!frontmatter) return { remarkPlugins: [], rehypePlugins: [] };
  return {
    remarkPlugins: normalizeSpecs(frontmatter.remarkPlugins, 'remarkPlugins'),
    rehypePlugins: normalizeSpecs(frontmatter.rehypePlugins, 'rehypePlugins'),
  };
}

/**
 * Resolve a plugin module specifier: local paths (`./`, `../`, absolute) are
 * resolved to an absolute path anchored at the consumer project root so the
 * import works from the generated `.facet/vite.config.ts`; bare package names
 * pass through and resolve from `.facet/node_modules`.
 */
function importTarget(name: string, projectRoot: string): string {
  if (name.startsWith('.') || isAbsolute(name)) return resolve(projectRoot, name);
  return name;
}

export interface PluginCodegen {
  /** `import` statements for the user-declared plugins. */
  imports: string[];
  /** vite-config array element expressions for remark plugins (after defaults). */
  remarkItems: string[];
  /** vite-config array element expressions for rehype plugins. */
  rehypeItems: string[];
}

/** Turn a RemarkConfig into import statements + array-element expressions. */
export function generatePluginCodegen(config: RemarkConfig, projectRoot: string): PluginCodegen {
  const imports: string[] = [];
  const build = (specs: PluginSpec[], prefix: string): string[] =>
    specs.map((spec, i) => {
      const [name, options] = Array.isArray(spec) ? spec : [spec, undefined];
      const id = `${prefix}${i}`;
      imports.push(`import ${id} from ${JSON.stringify(importTarget(name, projectRoot))};`);
      return options === undefined ? id : `[${id}, ${JSON.stringify(options)}]`;
    });
  const remarkItems = build(config.remarkPlugins, '_remarkPlugin');
  const rehypeItems = build(config.rehypePlugins, '_rehypePlugin');
  return { imports, remarkItems, rehypeItems };
}

/**
 * The mdx() `remarkPlugins` array source: always-on defaults plus user items.
 *
 * `facetRedact` runs after remarkFrontmatter — so the YAML block is already a
 * node rather than prose — and before the user's own plugins, so a
 * frontmatter-declared plugin cannot observe redacted content.
 */
export function remarkPluginsArray(userItems: string[], redact?: RedactPolicy): string {
  // Always installed, never conditional on a flag being passed. Omitting it
  // when no policy is given would mean a forgotten `--allow` publishes every
  // classified region instead of failing — the exact fail-open this exists to
  // prevent. With an empty policy a document carrying no regions is untouched
  // and one carrying a region errors.
  const defaults = [
    'remarkFrontmatter',
    'remarkGfm',
    `[remarkAlert, { tagName: 'blockquote' }]`,
    `[facetRedact, ${JSON.stringify(redact ?? { allow: {} })}]`,
  ];
  return `[${[...defaults, ...userItems].join(', ')}]`;
}

/** The mdx() `rehypePlugins` array source: always-on defaults plus user items. */
export function rehypePluginsArray(userItems: string[]): string {
  const mdxNodeTypes = [
    'mdxFlowExpression',
    'mdxJsxFlowElement',
    'mdxJsxTextElement',
    'mdxTextExpression',
    'mdxjsEsm',
  ];
  const passThrough = mdxNodeTypes.map((type) => `'${type}'`).join(', ');
  return `[[rehypeRaw, { passThrough: [${passThrough}] }]${userItems.length ? ', ' + userItems.join(', ') : ''}]`;
}
