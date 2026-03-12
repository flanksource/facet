import { DatasheetTemplate, Page, Header, Footer } from '@flanksource/facet';

const HEADER_HEIGHT = 18;
const FOOTER_HEIGHT = 15;
const CONTENT_MARGIN = 5;
const ROW_COUNT = 60;

const rows = Array.from({ length: ROW_COUNT }, (_, i) => {
  const num = i + 1;
  if (num === 1) return `Row 1 — first content row, should appear below header+margin (${HEADER_HEIGHT}+${CONTENT_MARGIN}=${HEADER_HEIGHT + CONTENT_MARGIN}mm from top)`;
  if (num === 2) return `Row 2 — yellow zone starts here, no yellow above ${HEADER_HEIGHT + CONTENT_MARGIN}mm`;
  return `Row ${num}`;
});

export default function BleedTest() {
  return (
    <DatasheetTemplate title="Bleed Test" >
      <Header type="default" height={HEADER_HEIGHT}>
        <div className="datasheet-header" style={{ background: '#FF0000', padding: '3mm 10mm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14pt' }}>RED HEADER ({HEADER_HEIGHT}mm)</span>
          <span style={{ color: 'white', fontSize: '10pt' }}>Must touch top edge — 0px gap</span>
        </div>
      </Header>
      <Footer type="default" height={FOOTER_HEIGHT}>
        <div className="datasheet-footer" style={{ background: '#00FF00', padding: '3mm 10mm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'black', fontWeight: 'bold', fontSize: '14pt' }}>GREEN FOOTER ({FOOTER_HEIGHT}mm)</span>
          <span style={{ color: 'black', fontSize: '10pt' }}>Must touch bottom edge — 0px gap</span>
        </div>
      </Footer>
      <Page margins={{ top: CONTENT_MARGIN, bottom: CONTENT_MARGIN }}>
        <div style={{ background: '#FFFF00', padding: '5mm' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ padding: '2mm 0', borderBottom: '1px solid #ccc', fontSize: '11pt' }}>{r}</div>
          ))}
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
