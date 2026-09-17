import React from 'react';
import {
  CoverPage,
  Document,
  DocumentFields,
  Footer,
  Header,
  Page,
  PageNo,
  Section,
  TableOfContents,
} from '@flanksource/facet';

const documentFields = [
  { label: 'Prepared for', value: 'Board of Directors' },
  { label: 'Prepared by', value: 'Finance and Governance' },
  { label: 'Document number', value: 'ACME-ANNUAL-REPORT-2026-001' },
  { label: 'Classification', value: 'Internal' },
];

export default function DocumentFrontMatter() {
  return (
    <Document title="Annual report" margins={{ top: 12, right: 18, bottom: 12, left: 18 }}>
      <Header type="default" variant="minimal" height={14} title="Annual report" />
      <Footer type="default" height={9}>
        <div className="flex h-full items-center justify-between border-t border-slate-300 px-[18mm] text-[7pt] text-slate-500">
          <span>Internal</span>
          <PageNo format="Page ${page} of ${total}" />
        </div>
      </Footer>

      <CoverPage
        id="cover"
        title="Annual report"
        subtitle="Governance, performance, and outlook for the year ended 31 December 2026"
        logo={<div className="text-[12pt] font-bold tracking-[3pt] text-slate-900">ACME</div>}
      >
        <DocumentFields fields={documentFields} />
      </CoverPage>

      <Page id="contents">
        <TableOfContents items={[
          { title: 'Executive overview', target: 'overview' },
          { title: 'Governance and controls', target: 'governance' },
          { title: 'Appendix', page: 'A-1', level: 2 },
        ]} />
      </Page>

      <Page id="overview" title="Executive overview">
        <Section title="Performance at a glance">
          <p>Revenue and operating performance remained resilient while the organisation continued investing in controls, reporting quality, and customer outcomes.</p>
        </Section>
        <Section title="Outlook">
          <p>The next reporting period prioritises measured growth, consistent governance, and clear ownership of material risks.</p>
          <p className='pt-20'>ABC</p>
          <p className='pt-20'>ABC</p>
                    <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>
        </Section>
      </Page>

      <Page id="governance" title="Governance and controls">
        <Section title="Oversight">
          <p className='pt-20'>ABC</p>
                    <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>          <p className='pt-20'>ABC</p>

          <p>The board receives quarterly assurance reporting covering financial controls, operational resilience, information security, and regulatory obligations.</p>
        </Section>
        <Section title="Accountability">
          <p>Every material control has a named owner, an evidence source, a review cadence, and a documented escalation path.</p>
        </Section>
      </Page>

      <Page title="Appendix">
        <Section title="Basis of preparation">
          <p>This illustrative report demonstrates Facet front-matter components and does not contain audited financial information.</p>
        </Section>
      </Page>
    </Document>
  );
}
