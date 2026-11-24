/**
 * Parses RFC 4180 delimited text into rows: quoted fields may hold the
 * delimiter, newlines and `""` escapes. A trailing newline does not add an
 * empty row. An unterminated quote throws, rather than rendering a table that
 * silently swallowed the rest of the document.
 */
export function parseDelimited(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (quoted) throw new Error('CSV: unterminated quoted field');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export interface CsvTableProps {
  /** Delimited text; the first row is the header. */
  source: string;
  /** Field delimiter, `,` for CSV and a tab for TSV. */
  delimiter?: string;
  className?: string;
}

const NUMERIC = /^[-+]?[\d,]*\.?\d+%?$/;

/** A CSV/TSV block rendered as a table, header first, numeric columns right-aligned. */
export default function CsvTable({ source, delimiter = ',', className = '' }: CsvTableProps) {
  let end = source.length;
  while (end > 0 && source[end - 1] === '\n') end--;
  const [header = [], ...body] = parseDelimited(source.slice(0, end), delimiter);
  const width = Math.max(header.length, ...body.map((row) => row.length));
  const columns = Array.from({ length: width }, (_, index) => index);
  const numeric = columns.map((index) => body.length > 0 && body.every((row) => !row[index] || NUMERIC.test(row[index]!.trim())));
  return (
    <table className={`csv-table ${className}`.trim()} data-csv-table="">
      <thead>
        <tr>
          {columns.map((index) => (
            <th key={index} style={numeric[index] ? { textAlign: 'right' } : undefined}>{header[index] ?? ''}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((index) => (
              <td key={index} style={numeric[index] ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } : undefined}>{row[index] ?? ''}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
