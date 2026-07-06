// Renders the SimpleReport data through @flanksource/facet components so
// smoke tests exercise component-library resolution end to end.
import React from 'react';
import { Page, Badge } from '@flanksource/facet';

interface ReportData {
  name: string;
  title: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

export default function FacetReport({ data }: { data: ReportData }) {
  return (
    <Page pageSize="a4" margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
      <h1>{data.title}</h1>
      <Badge label="report" value={data.name} />
      {data.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.content}</p>
        </section>
      ))}
    </Page>
  );
}
