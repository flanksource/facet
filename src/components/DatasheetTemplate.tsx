import React from 'react';
import PageBreak from './PageBreak';

/**
 * PageConfig Interface
 * Configuration for a single page in the datasheet
 */
export interface PageConfig {
  /** Content to render on this page */
  content: React.ReactNode;
  /** Optional page-specific title */
  title?: string;
  /** Optional page-specific product name */
  product?: string;
  /** Optional header component */
  header?: React.ReactNode;
  /** Optional footer component */
  footer?: React.ReactNode;
  /** Optional page margins */
  margins?: boolean;
}

/**
 * DatasheetTemplate Props
 */
export interface DatasheetTemplateProps {
  /** Array of page configurations */
  pages: PageConfig[];
  /** Document title */
  title: string;
  /** Inlined CSS string */
  css: string;
  /** Optional subtitle for document */
  subtitle?: string;
  /** Page component to wrap content */
  PageComponent: React.ComponentType<any>;
}

/**
 * DatasheetTemplate Component
 *
 * Template wrapper for all datasheet apps. Consolidates the HTML structure
 * and multi-page layout pattern used across all datasheet variants.
 *
 * @example
 * ```tsx
 * <DatasheetTemplate
 *   title="Mission Control - IDP"
 *   subtitle="Internal Developer Platform"
 *   css={inlinedCSS}
 *   PageComponent={Page}
 *   pages={[
 *     { content: <Page1Content /> },
 *     { content: <Page2Content />, title: "Details" }
 *   ]}
 * />
 * ```
 */
export default function DatasheetTemplate({
  pages,
  title,
  subtitle,
  css,
  PageComponent,
}: DatasheetTemplateProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          {title}
          {subtitle && ` - ${subtitle}`}
        </title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        {pages.map((page, index) => (
          <React.Fragment key={index}>
            <PageComponent
              title={page.title}
              product={page.product}
              header={page.header}
              footer={page.footer}
              margins={page.margins}
            >
              {page.content}
            </PageComponent>
            {index < pages.length - 1 && <PageBreak />}
          </React.Fragment>
        ))}
      </body>
    </html>
  );
}
