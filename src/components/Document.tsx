import React, { createContext, useContext } from 'react';
import type { PageSize, PageMargins } from './Page';

export interface DocumentBaseProps {
  title?: string;
  css?: string;
  children?: React.ReactNode;
}

export interface DocumentDefaults {
  pageSize?: PageSize;
  margins?: PageMargins;
  fontSize?: number | string;
  lineHeight?: number | string;
  fontFamily?: string;
}

export interface DocumentProps extends DocumentBaseProps, DocumentDefaults {
  className?: string;
  style?: React.CSSProperties;
}

const DocumentDefaultsContext = createContext<DocumentDefaults | null>(null);

export function useDocumentDefaults(): DocumentDefaults | null {
  return useContext(DocumentDefaultsContext);
}

function toCssSize(value?: number | string): string | undefined {
  if (value == null) {
    return undefined;
  }

  return typeof value === 'number' ? `${value}pt` : value;
}

function buildDocumentCss({
  fontSize,
  lineHeight,
  fontFamily,
}: Pick<DocumentDefaults, 'fontSize' | 'lineHeight' | 'fontFamily'>): string {
  const declarations = [
    fontSize != null ? `font-size:${toCssSize(fontSize)}` : '',
    lineHeight != null ? `line-height:${String(lineHeight)}` : '',
    fontFamily ? `font-family:${fontFamily}` : '',
  ].filter(Boolean);

  return declarations.length > 0 ? `body{${declarations.join(';')}}` : '';
}

export default function Document({
  pageSize,
  margins,
  fontSize,
  lineHeight,
  fontFamily,
  className,
  style,
  children,
  ...datasheetProps
}: DocumentProps) {
  const defaults: DocumentDefaults = {
    pageSize,
    margins,
    fontSize,
    lineHeight,
    fontFamily,
  };

  const contentStyle: React.CSSProperties = {
    fontSize: toCssSize(fontSize),
    lineHeight,
    fontFamily,
    ...style,
  };
  const inheritedCss = buildDocumentCss({ fontSize, lineHeight, fontFamily });
  const mergedCss = [inheritedCss, datasheetProps.css].filter(Boolean).join('\n');
  const { title } = datasheetProps;

  return (
    <DocumentDefaultsContext.Provider value={defaults}>
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{title ?? ''}</title>
          {mergedCss && <style dangerouslySetInnerHTML={{ __html: mergedCss }} />}
        </head>
        <body>
          <div className={className} style={contentStyle}>
            {children}
          </div>
        </body>
      </html>
    </DocumentDefaultsContext.Provider>
  );
}
