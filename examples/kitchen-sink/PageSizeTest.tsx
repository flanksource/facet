import { DatasheetTemplate, Page, Header, Footer, type PageSize } from '@flanksource/facet';

const HEADER_HEIGHT = 15;
const FOOTER_HEIGHT = 10;

const pages: { size: PageSize; label: string; dims: string; bg: string }[] = [
  { size: 'a4', label: 'A4', dims: '210 x 297mm', bg: '#FFFF00' },
  { size: 'a3', label: 'A3', dims: '297 x 420mm', bg: '#FF99FF' },
  { size: 'letter', label: 'Letter', dims: '215.9 x 279.4mm', bg: '#99FFCC' },
  { size: 'legal', label: 'Legal', dims: '215.9 x 355.6mm', bg: '#FF9999' },
  { size: 'fhd', label: 'FHD', dims: '508 x 285.75mm', bg: '#99CCFF' },
  { size: 'qhd', label: 'QHD', dims: '677.33 x 381mm', bg: '#FFCC99' },
  { size: 'wqhd', label: 'WQHD', dims: '846.67 x 381mm', bg: '#CC99FF' },
  { size: '4k', label: '4K', dims: '1016 x 571.5mm', bg: '#99FF99' },
  { size: '5k', label: '5K', dims: '1354.67 x 762mm', bg: '#FF6666' },
  { size: '16k', label: '16K', dims: '406.4 x 304.8mm', bg: '#66CCCC' },
];

export default function PageSizeTest() {
  return (
    <DatasheetTemplate title="Page Size Test" css="">
      <Header type="default" height={HEADER_HEIGHT}>
        <div className="datasheet-header" style={{ background: '#0066CC', padding: '3mm 10mm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12pt' }}>BLUE HEADER ({HEADER_HEIGHT}mm)</span>
          <span style={{ color: 'white', fontSize: '9pt' }}>Shared across all page sizes</span>
        </div>
      </Header>
      <Footer type="default" height={FOOTER_HEIGHT}>
        <div className="datasheet-footer" style={{ background: '#CC6600', padding: '2mm 10mm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '10pt' }}>ORANGE FOOTER ({FOOTER_HEIGHT}mm)</span>
          <span style={{ color: 'white', fontSize: '8pt' }}>Shared across all page sizes</span>
        </div>
      </Footer>
      {pages.map(({ size, label, dims, bg }) => (
        <Page key={size} pageSize={size} margins={{ top: 5, bottom: 5 }}>
          <div style={{ background: bg, padding: '5mm' }}>
            <h1 style={{ fontSize: '16pt', marginBottom: '3mm' }}>{label} Page ({dims})</h1>
            <p>This page uses {label} format.</p>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} style={{ padding: '2mm 0', borderBottom: '1px solid #ccc', fontSize: '10pt' }}>
                {label} content row {i + 1}
              </div>
            ))}
          </div>
        </Page>
      ))}
    </DatasheetTemplate>
  );
}
