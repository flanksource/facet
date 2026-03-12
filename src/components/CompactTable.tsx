import React from 'react';

export type TableSize = 'xs' | 'sm' | 'base' | 'md';

interface CompactTableRow {
  label: string;
  value: string | string[];
}

interface CompactTableProps {
  data?: CompactTableRow[] | (string | React.ReactNode)[][];
  variant?: 'compact' | 'inline' | 'reference';
  title?: string;
  className?: string;
  columns?: string[];
  size?: TableSize;
}

const sizeClass: Record<TableSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  md: 'text-md',
};

export default function CompactTable({
  data = [],
  variant = 'compact',
  title,
  className = '',
  columns = [],
  size = 'sm',
}: CompactTableProps) {
  if (variant === 'inline' && data.length > 4) {
    console.warn(
      `CompactTable: Inline variant works best with 2-4 rows. You have ${data.length} rows. Consider using 'compact' variant instead.`
    );
  }

  const textClass = sizeClass[size];

  if (variant === 'reference') {
    const tableData = data as (string | React.ReactNode)[][];
    return (
      <div className={`my-4 ${className}`}>
        {title && <h4 className="font-semibold text-slate-900 mb-2">{title}</h4>}
        <table className={`w-full border-collapse ${textClass}`}>
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index} className="font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-200 last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="align-top">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rowData = data as CompactTableRow[];

  if (variant === 'inline') {
    return (
      <div className={`my-3 ${className}`}>
        {title && <h4 className="font-semibold text-slate-900 mb-2">{title}</h4>}
        <div className={`flex flex-wrap gap-x-6 gap-y-4 ${textClass}`}>
          {rowData.map((row, index) => (
            <div key={index} className="text-gray-700">
              <strong className="text-slate-900 font-semibold">{row.label}:</strong>{' '}
              {Array.isArray(row.value) ? row.value.join(', ') : row.value}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`my-4 ${className}`}>
      {title && <h4 className="font-semibold text-slate-900 mb-2">{title}</h4>}
      <table className={`w-full border-collapse ${textClass}`}>
        <tbody>
          {rowData.map((row, index) => (
            <tr key={index} className="border-b border-gray-200 last:border-b-0">
              <td className="font-semibold text-gray-600 w-[35%] align-top">
                <strong>{row.label}</strong>
              </td>
              <td className="text-gray-700 align-top">
                {Array.isArray(row.value) ? (
                  <ul className="m-0 pl-3 list-disc">
                    {row.value.map((item, i) => (
                      <li key={i} className="mb-1">{item}</li>
                    ))}
                  </ul>
                ) : (
                  row.value
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
