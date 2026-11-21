import React from 'react';
import { Document, Footer, Header, Page, PageNo, TableOfContents } from '@flanksource/facet';

export default function Contents() {
  return (
    <Document title="Operations review" margins={{ top: 8, right: 12, bottom: 8, left: 12 }}>
      <Header variant="solid" height={22} title="Operations review" subtitle="Editable Word layout"
        logo={<span className="text-xl font-bold text-white">ACME</span>} />
      <Footer height={12}>
        <div className="flex h-full items-center justify-between border-t border-slate-300 px-[12mm] text-xs text-slate-500">
          <span>Internal review</span>
          <PageNo format="Page ${page} of ${total}" />
        </div>
      </Footer>
      <Page id="contents">
        <TableOfContents items={[
          { title: 'Executive overview', target: 'overview' },
          { title: 'Table layout', target: 'table-layout', level: 2 },
          { title: 'Regional activity', target: 'activity' },
          { title: 'Appendix', page: 'A-1', level: 2 },
        ]} />
      </Page>
      <Page id="overview" title="Executive overview">
        <p>Headers and footers remain editable. The <span id="table-layout">native tables</span> below retain their columns and cell formatting.</p>
        <div className="grid grid-cols-2 gap-[5mm]">
          <div>
            <h2>Availability</h2>
            <table className="w-full"><thead><tr><th>Region</th><th>Availability</th></tr></thead>
              <tbody><tr><td>North</td><td>99.95%</td></tr><tr><td>South</td><td>99.97%</td></tr></tbody></table>
          </div>
          <div>
            <h2>Requirements</h2>
            <table className="w-full"><thead><tr><th>Component</th><th>Version</th></tr></thead>
              <tbody><tr><td>PostgreSQL</td><td>13+</td></tr><tr><td>Kubernetes</td><td>1.24+</td></tr></tbody></table>
          </div>
        </div>
      </Page>
      <Page id="activity" title="Regional activity">
        <p>A long native table continues across pages and repeats its header row.</p>
        <table className="w-full"><thead><tr><th>Activity</th><th>Region</th><th>Status</th></tr></thead>
          <tbody>{Array.from({ length: 70 }, (_, index) => (
            <tr key={index}><td>Activity {index + 1}</td><td>{index % 2 ? 'North' : 'South'}</td><td>Complete</td></tr>
          ))}</tbody></table>
      </Page>
      <Page title="Appendix">
        <p>The literal A-1 contents label remains unchanged when Word refreshes the automatic entries.</p>
      </Page>
    </Document>
  );
}
