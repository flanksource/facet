/**
 * Read remark/rehype plugin configuration from a markdown template's YAML
 * frontmatter. Non-markdown templates (.tsx, .jsx) carry no frontmatter and
 * yield an empty config.
 */

import { readFileSync } from 'fs';
import { extname } from 'path';
import { load } from 'js-yaml';
import {
  extractFrontmatter,
  remarkConfigFromFrontmatter,
  type RemarkConfig,
} from '../builders/remark-config.js';

const MARKDOWN_EXTS = new Set(['.md', '.mdx']);

function parseYaml(block: string): Record<string, unknown> | null {
  return load(block) as Record<string, unknown> | null;
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
