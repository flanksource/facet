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
      <div className={`my-4 ${className}`}>
        {title && <h4 className="text-[10pt] font-semibold text-slate-900 mb-2">{title}</h4>}
        <table className="w-full border-collapse text-[8pt] leading-[9pt]">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index} className="p-2 font-medium text-[10pt]">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-200 last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="py-1 px-1.5 align-top">{cell}</td>
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
      <div className={`my-3 ${className}`}>
        {title && <h4 className="text-[10pt] font-semibold text-slate-900 mb-2">{title}</h4>}
        <div className="flex flex-wrap gap-x-6 gap-y-4 text-[9pt] leading-3">
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

  // Render compact variant (traditional table with tighter spacing)
  return (
    <div className={`my-4 ${className}`}>
      {title && <h4 className="text-[10pt] font-semibold text-slate-900 mb-2">{title}</h4>}
      <table className="w-full border-collapse text-[8pt] leading-[9pt]">
        <tbody>
          {rowData.map((row, index) => (
            <tr key={index} className="border-b border-gray-200 last:border-b-0">
              <td className="font-semibold text-gray-600 w-[35%] py-1 px-1.5 align-top">
                <strong>{row.label}</strong>
              </td>
              <td className="text-gray-700 py-1 px-1.5 align-top">
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
