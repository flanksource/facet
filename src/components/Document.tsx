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

// Strip sequences that could break out of an inline <style> block or its
// declarations when concatenated into `dangerouslySetInnerHTML`. Belt-and-
// braces for values that are typically developer-supplied but may flow in
// from template parameters or data.
function sanitizeCssValue(value: string): string {
  return value.replace(/<\/?\s*style/gi, '').replace(/[<>{}]/g, '');
}

function sanitizeCssBlock(value: string): string {
  return value.replace(/<\/?\s*style/gi, '');
}

function buildDocumentCss({
  fontSize,
  lineHeight,
  fontFamily,
}: Pick<DocumentDefaults, 'fontSize' | 'lineHeight' | 'fontFamily'>): string {
  const declarations = [
    fontSize != null ? `font-size:${sanitizeCssValue(toCssSize(fontSize)!)}` : '',
    lineHeight != null ? `line-height:${sanitizeCssValue(String(lineHeight))}` : '',
    fontFamily ? `font-family:${sanitizeCssValue(fontFamily)}` : '',
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
  const userCss = datasheetProps.css ? sanitizeCssBlock(datasheetProps.css) : '';
  const mergedCss = [inheritedCss, userCss].filter(Boolean).join('\n');
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
