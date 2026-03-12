import React from 'react';
import type { PageType } from './Header';

export type PageSize = 'a4' | 'a3' | 'letter' | 'legal' | 'fhd' | 'qhd' | 'wqhd' | '4k' | '5k' | '16k';

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
  pageSize?: PageSize;
  margins?: PageMargins;
  watermark?: string;
  type?: PageType;
}

export default function Page({
  children,
  title,
  product,
  className,
  pageSize = 'a4',
  margins = {},
  watermark,
  type = 'default',
}: PageProps) {
  const {
    top: marginTop = 0,
    right: marginRight = 0,
    bottom: marginBottom = 0,
    left: marginLeft = 0
  } = margins;

  const mainStyle: React.CSSProperties = {
    overflow: 'hidden',
    paddingTop: `${marginTop}mm`,
    paddingRight: `${marginRight + 10}mm`,
    paddingBottom: `${marginBottom}mm`,
    paddingLeft: `${marginLeft + 10}mm`,
  };

  return (
    <div data-page-size={pageSize} data-page-type={type}
         data-margin-top={marginTop} data-margin-right={marginRight} data-margin-bottom={marginBottom} data-margin-left={marginLeft}
         style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>

      {watermark && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', zIndex: -1,
        }}>
          <span style={{
            transform: 'rotate(-45deg)', fontSize: '60pt', fontWeight: 700,
            color: 'rgba(200, 200, 200, 0.3)', letterSpacing: '10pt',
            userSelect: 'none', whiteSpace: 'nowrap',
          }}>{watermark}</span>
        </div>
      )}

      {title && (
        <div className="section-header-bar bg-[#3578e5] text-white">
          <h2 className="text-[18pt] font-semibold text-white m-0">{title}</h2>
          {product && <div className="text-[10pt] text-white font-normal">{product}</div>}
        </div>
      )}

      <main className={className} style={mainStyle}>
        <article>{children}</article>
      </main>
    </div>
  );
}
