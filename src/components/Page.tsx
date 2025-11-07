import React from 'react';

interface PageMargins {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface PageProps {
  children: React.ReactNode;
  title?: string;
  product?: string;
  className?: string;
  pageSize?: 'a4';
  margins?: PageMargins;
  header?: React.ReactNode;
  headerHeight?: number;
  footer?: React.ReactNode;
  footerHeight?: number;
  debug?: boolean;
}

/**
 * Page Component
 *
 * Container for datasheet page content with optional header, footer, and title bar.
 * All styles now inline using Tailwind utilities and style props.
 *
 * Features:
 * - Configurable margins for PDF generation
 * - Fixed header/footer positioning
 * - Optional section title bar
 * - Debug mode for margin visualization
 *
 * Usage:
 * <Page
 *   title="Overview"
 *   product="Mission Control"
 *   margins={{ top: 10, bottom: 15 }}
 * >
 *   Page content here
 * </Page>
 */
export default function Page({
  children,
  title,
  product,
  className,
  pageSize = 'a4',
  margins = {},
  header,
  headerHeight = 0,
  footer,
  footerHeight = 15,
  debug = false
}: PageProps) {
  const {
    top: marginTop = 0,
    right: marginRight = 0,
    bottom: marginBottom = 0,
    left: marginLeft = 0
  } = margins;

  const mainStyle: React.CSSProperties = {
    overflow: 'hidden',
    paddingTop: `${marginTop + headerHeight}mm`,
    paddingRight: `${marginRight + 10}mm`,
    paddingBottom: `${marginBottom + footerHeight}mm`,
    paddingLeft: `${marginLeft + 10}mm`,
  };

  const headerStyle: React.CSSProperties = header ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: `${headerHeight}mm`,
    zIndex: 10,
  } : {};

  const footerStyle: React.CSSProperties = footer ? {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: `${footerHeight}mm`,
    zIndex: 10,
  } : {};

  const debugMarkerStyle: React.CSSProperties = {
    position: 'fixed',
    border: '1px dashed red',
    pointerEvents: 'none',
    zIndex: 9999,
  };

  return (
    <div data-page-size={pageSize}>

      {header && (
        <div style={headerStyle}>
          {header}
        </div>
      )}

      {title && (
        <div className="section-header-bar bg-[#3578e5] text-white">
          <h2 className="text-[18pt] font-semibold text-white m-0">{title}</h2>
          {product && <div className="text-[10pt] text-white font-normal">{product}</div>}
        </div>
      )}

      <main
        className={className}
        style={mainStyle}
      >
        <article>{children}</article>
      </main>

      {footer && (
        <div style={footerStyle}>
          {footer}
        </div>
      )}

      {debug && (
        <>
          {/* Debug markers for margins */}
          <div style={{ ...debugMarkerStyle, top: `${marginTop}mm`, left: 0, right: 0, height: '1px' }} />
          <div style={{ ...debugMarkerStyle, bottom: `${marginBottom}mm`, left: 0, right: 0, height: '1px' }} />
          <div style={{ ...debugMarkerStyle, top: 0, bottom: 0, left: `${marginLeft}mm`, width: '1px' }} />
          <div style={{ ...debugMarkerStyle, top: 0, bottom: 0, right: `${marginRight}mm`, width: '1px' }} />
        </>
      )}
    </div>
  );
}
