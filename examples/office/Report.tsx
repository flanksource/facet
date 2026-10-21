import React from 'react';
import { Document, Footer, Header, Page, PageNo } from '@flanksource/facet';

interface ReportData { title: string; region: string; revenue: number }

export default function OfficeReport({ data }: { data: ReportData }) {
  return (
    <Document title={data.title} pageSize="a4" fontSize={10}>
      <Header type="default" variant="minimal" height={12} title="Acme operations" />
      <Footer type="default" height={10}>
        <div className="px-4"><PageNo format="Page ${page} of ${total}" /></div>
      </Footer>
      <Page margins={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <h1>{data.title}</h1>
        <p>Revenue in <strong>{data.region}</strong> reached <strong>{data.revenue}</strong>. Review the <a href="https://example.com/report">supporting report</a>.</p>
        <h2>Next actions</h2>
        <ol><li>Review regional performance.</li><li>Confirm the next reporting period.</li></ol>
        <table className="w-full border-collapse">
          <thead><tr><th className="border p-2 text-left">Region</th><th className="border p-2 text-right">Revenue</th></tr></thead>
          <tbody><tr><td className="border p-2">{data.region}</td><td className="border p-2 text-right">{data.revenue}</td></tr></tbody>
        </table>
      </Page>
      <Page margins={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <h1>Activity ledger</h1>
        <p>This table demonstrates automatic continuation slides with repeated column headers.</p>
        <table className="w-full border-collapse">
          <thead><tr><th className="border p-2 text-left">Activity</th><th className="border p-2 text-left">Status</th></tr></thead>
          <tbody>{Array.from({ length: 40 }, (_, index) => (
            <tr key={index}><td className="border p-2">Activity {index + 1}</td><td className="border p-2">Complete</td></tr>
          ))}</tbody>
        </table>
      </Page>
    </Document>
  );
}
