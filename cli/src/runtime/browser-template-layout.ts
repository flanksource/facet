import type { RedactPolicy } from '../builders/remark-config.js';
import { applyBrowserLayout, type BrowserLayout } from '../utils/render-layout.js';

export const DEFAULT_MARKDOWN_PAGE = '<Page pageSize="a4" margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>';

const UNSAFE_EMBED_CHARS = new RegExp('[<>&\\u2028\\u2029]', 'g');

/** JSON for embedding in generated source: escapes characters that could end a script/string context. */
function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(UNSAFE_EMBED_CHARS, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function browserTemplateLayout(options: {
  page: string; themeModule: string; redact?: RedactPolicy;
  header?: boolean; footer?: boolean; stylesheet?: string; dynamicStyles?: boolean; prose?: boolean; pageLayout?: BrowserLayout;
}): string {
  const markdown = /\.mdx?$/i.test(options.page);
  const mdx = '{React.cloneElement(children, { ...props, components: mdxComponents })}';
  const page = options.pageLayout && options.themeModule === '@flanksource/facet/Theme' ? DEFAULT_MARKDOWN_PAGE : '<Page>';
  const content = markdown
    ? `<Document title={data?.title}>${page}${options.prose ? `<article className="prose">${mdx}</article>` : mdx}</Page></Document>`
    : '{children}';
  return `import React from 'react';
import { ThemeProvider } from '@flanksource/facet/Theme';
import { RedactPolicyProvider } from '@flanksource/facet/Classified';
${markdown ? "import Document from '@flanksource/facet/Document';\nimport Page from '@flanksource/facet/Page';\nimport { mdxComponents } from '@flanksource/facet/MdxCodeBlock';" : ''}
import * as theme from ${JSON.stringify(options.themeModule)};
${options.header ? "import Header from './.facet-render-header.tsx';" : ''}
${options.footer ? "import Footer from './.facet-render-footer.tsx';" : ''}
${options.stylesheet ? `import ${JSON.stringify(options.stylesheet)};` : ''}
${options.dynamicStyles ? 'export const meta = { tailwind: "dynamic" };' : ''}
export default function Layout({ children, data }) {
  ${options.pageLayout ? `React.useLayoutEffect(() => (${applyBrowserLayout.toString()})(${embedJson(options.pageLayout)}), []);` : ''}
  const props = { ...data, data };
  return <RedactPolicyProvider policy={${JSON.stringify(options.redact ?? { allow: {} })}}><ThemeProvider theme={theme.theme ?? theme.facetTheme} options={data?.theme} overrides={${JSON.stringify({ header: !!options.header, footer: !!options.footer })}}>
    ${options.header ? '<Header {...props} />' : ''}${content}${options.footer ? '<Footer {...props} />' : ''}
  </ThemeProvider></RedactPolicyProvider>;
}
`;
}
