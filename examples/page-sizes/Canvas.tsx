import { Document, Page, type PageSize } from '@flanksource/facet';

export default function Canvas({ data }: { data?: { pageSize?: PageSize } }) {
  return (
    <Document title="Build with clarity" pageSize={data?.pageSize ?? 'facebook-square'}>
      <Page id="creative" className="bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-sm uppercase tracking-widest text-indigo-300">Acme</p>
          <h1 className="text-4xl text-white">Build with clarity</h1>
          <p className="text-lg text-slate-200">One template. Every canvas.</p>
        </div>
      </Page>
    </Document>
  );
}
