import React from 'react';

export type PageType = 'first' | 'default' | 'last';

interface HeaderProps {
  variant?: 'default' | 'solid' | 'minimal';
  className?: string;
  style?: React.CSSProperties;
  logo?: React.ReactNode;
  title?: string;
  subtitle?: string;
  type?: PageType;
  height?: number;
  children?: React.ReactNode;
}

const DEFAULT_CLASSES = 'py-[1mm] px-[5mm]';

function merged(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export default function Header({
  variant = 'default',
  className,
  style,
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
    return <div className={merged(DEFAULT_CLASSES, className)} style={style} {...dataAttrs}>{children}</div>;
  }

  const headerClass = merged(`datasheet-header datasheet-header--${variant}`, DEFAULT_CLASSES, className);
  const headerStyle: React.CSSProperties = {
    ...(height != null ? { height: `${height}mm`, overflow: 'hidden' } : {}),
    ...style,
  };
  return (
    <div className={headerClass} style={headerStyle} {...dataAttrs}>
      {logo}
      <div className="header-meta">
        {title && <p className="text-md font-bold">{title}</p>}
        {subtitle && <p className="text-sm">{subtitle}</p>}
      </div>
    </div>
  );
}
