import React from 'react';
import { DatasheetTemplate, Footer, Header, Page } from '@flanksource/facet';

interface BenchmarkData {
  title: string;
  sections: Array<{ title: string; content: string }>;
}

const definitions = [
  { type: 'first' as const, size: 'a4', color: '#1d4ed8' },
  { type: 'default' as const, size: 'a4-landscape', color: '#047857' },
  { type: 'last' as const, size: 'letter', color: '#7c3aed' },
];

export default function BenchmarkMixedReport({ data }: { data: BenchmarkData }) {
  const buckets = definitions.map((_, bucket) =>
    data.sections.filter((__, index) => index % definitions.length === bucket),
  );
  return (
    <DatasheetTemplate title={data.title} css="">
      {definitions.map(({ type, color }) => (
        <React.Fragment key={type}>
          <Header type={type} height={14} style={{ background: color, color: 'white', padding: '3mm 8mm' }}>
            <strong>{data.title} — {type}</strong>
          </Header>
          <Footer type={type} height={9} style={{ background: '#f1f5f9', padding: '2mm 8mm' }}>
            <span>Facet mixed-page benchmark — {type}</span>
          </Footer>
        </React.Fragment>
      ))}
      {definitions.map(({ type, size, color }, bucket) => (
        <Page key={type} type={type} pageSize={size} margins={{ top: 5, right: 6, bottom: 5, left: 6 }}>
          <h1 style={{ color, fontSize: '18pt', marginBottom: '4mm' }}>{type.toUpperCase()} / {size}</h1>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
            <thead><tr><th>Section</th><th>Content</th></tr></thead>
            <tbody>
              {buckets[bucket].map((section, index) => (
                <tr key={`${bucket}-${index}`}>
                  <td style={{ width: '25%', padding: '1.5mm', border: '1px solid #cbd5e1' }}>{section.title}</td>
                  <td style={{ padding: '1.5mm', border: '1px solid #cbd5e1' }}>{section.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Page>
      ))}
    </DatasheetTemplate>
  );
}
