import React from 'react';
import PageBreak from './PageBreak';

export interface PageConfig {
  content: React.ReactNode;
  title?: string;
  product?: string;
  margins?: boolean;
}

export interface DatasheetTemplateProps {
  pages?: PageConfig[];
  title?: string;
  css?: string;
  subtitle?: string;
  PageComponent?: React.ComponentType<any>;
  children?: React.ReactNode;
}

export default function DatasheetTemplate({
  pages,
  title,
  subtitle,
  css,
  PageComponent,
  children,
}: DatasheetTemplateProps) {
  if (children) {
    return <>{children}</>;
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          {title + (subtitle ? ` - ${subtitle}` : '')}
        </title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        {(pages || []).map((page, index) => (
          <React.Fragment key={index}>
            {PageComponent && <PageComponent
              title={page.title}
              product={page.product}
              margins={page.margins}
            >
              {page.content}
            </PageComponent>}
            {index < (pages || []).length - 1 && <PageBreak />}
          </React.Fragment>
        ))}
      </body>
    </html>
  );
}
