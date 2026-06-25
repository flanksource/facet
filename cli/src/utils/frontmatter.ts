/**
 * Read remark/rehype plugin configuration from a markdown template's YAML
 * frontmatter. Non-markdown templates (.tsx, .jsx) carry no frontmatter and
 * yield an empty config. YAML is parsed with Bun's built-in parser, so no
 * dependency is added to the CLI.
 */

import { readFileSync } from 'fs';
import { extname } from 'path';
import {
  extractFrontmatter,
  remarkConfigFromFrontmatter,
  type RemarkConfig,
} from '../builders/remark-config.js';

const MARKDOWN_EXTS = new Set(['.md', '.mdx']);

function parseYaml(block: string): Record<string, unknown> | null {
  const yaml = (Bun as unknown as { YAML?: { parse(input: string): unknown } }).YAML;
  if (!yaml) {
    throw new Error('Bun.YAML is unavailable; facet requires Bun >= 1.2 to read template frontmatter');
  }
  return yaml.parse(block) as Record<string, unknown> | null;
}

export function readRemarkFrontmatter(templatePath: string): RemarkConfig {
  if (!MARKDOWN_EXTS.has(extname(templatePath).toLowerCase())) {
    return { remarkPlugins: [], rehypePlugins: [] };
  }
  const source = readFileSync(templatePath, 'utf-8');
  const block = extractFrontmatter(source);
  if (block == null) return { remarkPlugins: [], rehypePlugins: [] };
  return remarkConfigFromFrontmatter(parseYaml(block));
}
