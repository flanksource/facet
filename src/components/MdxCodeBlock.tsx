import { isValidElement, type ReactNode } from 'react';
import CsvTable from './CsvTable';
import SyntaxHighlighter from './SyntaxHighlighter';

const DELIMITERS: Record<string, string> = { csv: ',', tsv: '\t' };

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children);
  return '';
}

/**
 * A fenced code block in MDX/Markdown: ```csv and ```tsv render as a table,
 * every other language through SyntaxHighlighter. MDX hands `pre` its `code`
 * child, whose `language-*` class names the fence's language.
 */
export function MdxCodeBlock({ children }: { children?: ReactNode }) {
  const code = isValidElement(children) ? (children.props as { className?: string; children?: ReactNode }) : undefined;
  const language = /language-([\w-]+)/.exec(code?.className ?? '')?.[1]?.toLowerCase() ?? 'text';
  const source = nodeText(code?.children ?? children).replace(/\n$/, '');
  const delimiter = DELIMITERS[language];
  if (delimiter) return <CsvTable source={source} delimiter={delimiter} />;
  return <SyntaxHighlighter code={source} language={language} />;
}

/** The MDX components every Facet Markdown/MDX page renders with. */
export const mdxComponents = { pre: MdxCodeBlock };
