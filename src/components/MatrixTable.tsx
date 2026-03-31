import React from 'react';

interface MatrixTableProps {
  columns: React.ReactNode[];
  rows: { label: React.ReactNode; cells: React.ReactNode[] }[];
  columnWidth?: number;
  headerHeight?: number;
}

export function Dot({ color }: { color: string }) {
  return (
    <div style={{
      width: '2mm', height: '2mm',
      borderRadius: '50%', backgroundColor: color,
    }} />
  );
}

export default function MatrixTable({
  columns, rows, columnWidth = 6, headerHeight = 18,
}: MatrixTableProps) {
  const textWidth = headerHeight * 1.41;

  const thReset: React.CSSProperties = {
    background: 'transparent', backgroundColor: 'transparent',
    color: '#334155', border: 'none', padding: 0, fontWeight: 'normal',
  };

  return (
    <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <colgroup>
        <col />
        {columns.map((_, i) => (
          <col key={i} style={{ width: `${columnWidth}mm` }} />
        ))}
      </colgroup>
      <thead style={{ background: 'transparent', backgroundColor: 'transparent', color: 'inherit' }}>
        <tr style={{ background: 'transparent', backgroundColor: 'transparent' }}>
          <th style={thReset} />
          {columns.map((col, i) => (
            <th key={i} style={{
              ...thReset,
              width: `${columnWidth}mm`,
              height: `${headerHeight}mm`,
              position: 'relative',
              overflow: 'visible',
              borderBottom: '1px solid #E2E8F0',
            }}>
              <div style={{
                position: 'absolute', bottom: 0,
                left: `${columnWidth}mm`,
                transform: 'rotate(-45deg)', transformOrigin: '0 100%',
                width: `${textWidth}mm`,
                borderBottom: '1px solid #E2E8F0',
              }} />
              {i === 0 && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0,
                  transform: 'rotate(-45deg)', transformOrigin: '0 100%',
                  width: `${textWidth}mm`,
                  borderBottom: '1px solid #E2E8F0',
                }} />
              )}
              <div style={{
                position: 'absolute', bottom: '1mm',
                left: `${columnWidth / 2}mm`,
                transform: 'rotate(-45deg)', transformOrigin: '0 100%',
                width: `${textWidth}mm`, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
                fontSize: '7pt', fontWeight: 500, color: '#475569',
                lineHeight: 1, paddingLeft: '0.5mm',
              }}>
                {col}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F8FAFC' : '#FFFFFF' }}>
            <td style={{
              padding: '1mm 3mm 1mm 1mm',
              borderBottom: '1px solid #E2E8F0',
              borderTop: i === 0 ? '1px solid #E2E8F0' : undefined,
              whiteSpace: 'nowrap', verticalAlign: 'middle', height: '5mm',
            }}>
              {row.label}
            </td>
            {row.cells.map((cell, j) => (
              <td key={j} style={{
                borderBottom: '1px solid #E2E8F0',
                borderLeft: '1px solid #E2E8F0',
                borderTop: i === 0 ? '1px solid #E2E8F0' : undefined,
                padding: 0, verticalAlign: 'middle', height: '5mm',
                position: 'relative',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'center',
                  alignItems: 'center', height: '100%',
                }}>
                  {cell}
                </div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
