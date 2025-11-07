import React from 'react';

/**
 * CompactTable Component
 *
 * A table component optimized for dense data display with three variants:
 * - compact: Smaller fonts (9-10pt), tighter spacing for fitting more data (2 columns: label/value)
 * - inline: Horizontal key-value layout for small tables (2-4 rows)
 * - reference: Multi-column table with headers for API/reference documentation
 *
 * Usage:
 * <CompactTable
 *   data={[
 *     { label: "Version", value: "1.24+" },
 *     { label: "Memory", value: "4GB min" }
 *   ]}
 *   variant="compact"
 * />
 *
 * Reference variant:
 * <CompactTable
 *   columns={["Tool Name", "Purpose", "Example"]}
 *   data={[
 *     ["search_catalog", "Find items", "Show all pods"],
 *     ["get_config", "Get details", "Describe deployment"]
 *   ]}
 *   variant="reference"
 * />
 */

interface CompactTableRow {
  label: string;
  value: string | string[];
}

interface CompactTableProps {
  data?: CompactTableRow[] | string[][];
  variant?: 'compact' | 'inline' | 'reference';
  title?: string;
  className?: string;
  columns?: string[];
}

export default function CompactTable({
  data = [],
  variant = 'compact',
  title,
  className = '',
  columns = []
}: CompactTableProps) {
  // Validation: warn if inline variant used with too many rows
  if (variant === 'inline' && data.length > 4) {
    console.warn(
      `CompactTable: Inline variant works best with 2-4 rows. You have ${data.length} rows. Consider using 'compact' variant instead.`
    );
  }

  // Render reference variant (multi-column table with headers)
  if (variant === 'reference') {
    const tableData = data as string[][];
    return (
      <div className={`compact-table-wrapper reference ${className}`}>
        {title && <h4 className="compact-table-title">{title}</h4>}
        <table className="compact-table reference-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Cast data to CompactTableRow[] for compact and inline variants
  const rowData = data as CompactTableRow[];

  // Render inline variant (horizontal key-value pairs)
  if (variant === 'inline') {
    return (
      <div className={`compact-table-wrapper inline ${className}`}>
        {title && <h4 className="compact-table-title">{title}</h4>}
        <div className="inline-table">
          {rowData.map((row, index) => (
            <div key={index} className="inline-table-item">
              <strong>{row.label}:</strong>{' '}
              {Array.isArray(row.value) ? row.value.join(', ') : row.value}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render compact variant (traditional table with tighter spacing)
  return (
    <div className={`compact-table-wrapper ${className}`}>
      {title && <h4 className="compact-table-title">{title}</h4>}
      <table className="compact-table">
        <tbody>
          {rowData.map((row, index) => (
            <tr key={index}>
              <td className="compact-table-label">
                <strong>{row.label}</strong>
              </td>
              <td className="compact-table-value">
                {Array.isArray(row.value) ? (
                  <ul className="compact-table-list">
                    {row.value.map((item, i) => (
                      <li key={i}>{item}</li>
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
