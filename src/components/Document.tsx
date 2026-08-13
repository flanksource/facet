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
// declarations when concatenated into `dangerouslySetInnerHTML`. Removing all
// `<` and `>` characters eliminates any HTML-tag injection variant (including
// spaced forms like `< / style >`) since neither CSS values nor CSS rules
// require angle brackets.
function sanitizeCssValue(value: string): string {
  return value.replace(/[<>{}]/g, '');
}

function sanitizeCssBlock(value: string): string {
  return value.replace(/[<>]/g, '');
}

/**
 * The base the type scale is defined against, so `fontSize={10}` is a no-op.
 * Read from Theme rather than hardcoded — a test cross-checks that file against
 * the CLI's ELEMENT_SCALE, and src cannot import from cli/src.
 */
const BASE_FONT_SIZE_PT = 10;

/**
 * A document base size in points, or null if the value has no defined ratio to
 * it. `12`, `'12pt'` and `'12.5pt'` are sizes; `'1.2em'` and `'90%'` are
 * relative to something else and cannot be turned into a document-wide ratio.
 */
function toBasePoints(fontSize?: number | string): number | null {
  if (typeof fontSize === 'number') return fontSize;
  if (typeof fontSize !== 'string') return null;
  const match = fontSize.trim().match(/^(\d+(?:\.\d+)?)pt$/);
  return match ? Number(match[1]) : null;
}

function buildDocumentCss({
  fontSize,
  lineHeight,
  fontFamily,
}: Pick<DocumentDefaults, 'fontSize' | 'lineHeight' | 'fontFamily'>): string {
  // A base size becomes the document-wide scale, not a body override. As a
  // body rule it moved body text and left the nineteen other element rules and
  // every utility class where they were, so raising it distorted the hierarchy
  // instead of growing it — the same bug the --font-size flag used to have.
  const basePt = toBasePoints(fontSize);

  const declarations = [
    basePt == null && fontSize != null
      ? `font-size:${sanitizeCssValue(toCssSize(fontSize)!)}` : '',
    lineHeight != null ? `line-height:${sanitizeCssValue(String(lineHeight))}` : '',
    fontFamily ? `font-family:${sanitizeCssValue(fontFamily)}` : '',
  ].filter(Boolean);

  const body = declarations.length > 0 ? `body{${declarations.join(';')}}` : '';
  const root = basePt == null ? '' : `:root{--facet-font-scale:${basePt / BASE_FONT_SIZE_PT}}`;

  return [root, body].filter(Boolean).join('');
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

  // Typography goes out as the `body{}` rule below and not also as an inline
  // style here. Emitting both meant the inline copy won for every descendant,
  // so `--font-size` — which can only reach `body` — silently applied to part
  // of the document: paragraphs took the override while spans and cells kept
  // the Document size.
  const contentStyle: React.CSSProperties = { ...style };
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
