import React from 'react';

export type PageType = 'first' | 'default' | 'last';

interface HeaderProps {
  variant?: 'default' | 'solid' | 'minimal';
  logo?: React.ReactNode;
  title?: string;
  subtitle?: string;
  type?: PageType;
  height?: number;
  children?: React.ReactNode;
}

export default function Header({
  variant = 'default',
  logo,
  title = '',
  subtitle = '',
  type = 'default',
  height = 18,
  children,
}: HeaderProps) {
  const dataAttrs: Record<string, string | number> = { 'data-header-type': type };
  if (height != null) dataAttrs['data-header-height'] = height;

  if (children) {
    return <div {...dataAttrs}>{children}</div>;
  }

  const headerClass = `datasheet-header datasheet-header--${variant}`;
  const headerStyle: React.CSSProperties = height != null ? { height: `${height}mm`, overflow: 'hidden' } : {};
  return (
    <div className={headerClass} style={headerStyle} {...dataAttrs}>
      {logo && <div className="h-[15mm] w-[70mm]">{logo}</div>}
      <div className="header-meta">
        {title && <p className="text-md font-bold">{title}</p>}
        {subtitle && <p className="text-sm">{subtitle}</p>}
      </div>
    </div>
  );
}
