import React from 'react';

export const PAGE_PLACEHOLDER = '_PG_';
export const TOTAL_PLACEHOLDER = '_TL_';

export interface PageNoProps {
  format?: string;
  className?: string;
}

export default function PageNo({
  format = '${page} / ${total}',
  className,
}: PageNoProps) {
  const text = format
    .replace('${page}', PAGE_PLACEHOLDER)
    .replace('${total}', TOTAL_PLACEHOLDER);

  return <span className={className}>{text}</span>;
}
