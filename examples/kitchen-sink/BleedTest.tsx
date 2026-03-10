import { DatasheetTemplate, Page } from '@flanksource/facet';

function RedHeader() {
  return (
    <div className="datasheet-header" style={{ background: '#FF0000', padding: '3mm 10mm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14pt' }}>RED HEADER</span>
      <span style={{ color: 'white', fontSize: '10pt' }}>Should touch top edge</span>
    </div>
  );
}

function GreenFooter() {
  return (
    <div className="datasheet-footer" style={{ background: '#00FF00', padding: '3mm 10mm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: 'black', fontWeight: 'bold', fontSize: '14pt' }}>GREEN FOOTER</span>
      <span style={{ color: 'black', fontSize: '10pt' }}>Should touch bottom edge</span>
    </div>
  );
}

const rows = Array.from({ length: 60 }, (_, i) => `Row ${i + 1}`);

export default function BleedTest() {
  return (
    <DatasheetTemplate title="Bleed Test" css="">
      <Page
        header={<RedHeader />}
        headerHeight={18}
        footer={<GreenFooter />}
        footerHeight={15}
        margins={{ top: 5, bottom: 5 }}
      >
        <div style={{ background: '#FFFF00', padding: '5mm' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ padding: '2mm 0', borderBottom: '1px solid #ccc', fontSize: '11pt' }}>{r}</div>
          ))}
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
