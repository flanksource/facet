import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import CoverPage from './CoverPage';
import DocumentFields from './DocumentFields';
import Page from './Page';
import TableOfContents from './TableOfContents';

describe('CoverPage', () => {
  it('renders a traditional first page with composable document fields', () => {
    const markup = renderToStaticMarkup(
      <CoverPage title="Annual report" subtitle="Year ended 2026" logo={<span>Acme</span>} id="cover">
        <DocumentFields fields={[{ label: 'Prepared for', value: 'Board of Directors' }]} />
      </CoverPage>,
    );

    expect(markup).toContain('data-page-type="first"');
    expect(markup).toContain('data-facet-page-id="cover"');
    expect(markup).toContain('data-cover-page="true"');
    expect(markup).toContain('Annual report');
    expect(markup).toContain('Year ended 2026');
    expect(markup).toContain('Board of Directors');
  });
});

describe('DocumentFields', () => {
  it('keeps every label and value on one line without truncating either', () => {
    const markup = renderToStaticMarkup(
      <DocumentFields fields={[
        { label: 'Document number', value: 'ACME-2026-001' },
        { label: 'Prepared by', value: <strong>Finance team</strong> },
      ]} />,
    );

    expect(markup.match(/whitespace-nowrap/g)).toHaveLength(4);
    expect(markup).not.toContain('truncate');
    expect(markup.indexOf('Document number')).toBeLessThan(markup.indexOf('Prepared by'));
  });
});

describe('TableOfContents', () => {
  it('marks automatic targets and renders explicit labels without resolver markers', () => {
    const markup = renderToStaticMarkup(
      <TableOfContents items={[
        { title: 'Executive summary', target: 'summary' },
        { title: 'Appendix', page: 'A-1', level: 2 },
      ]} />,
    );

    expect(markup).toContain('Table of contents');
    expect(markup).toContain('data-facet-toc-target="summary"');
    expect(markup).toContain('data-toc-level="2"');
    expect(markup).toContain('>—<');
    expect(markup).toContain('>A-1<');
  });

  it('links automatic entries to their sections without linking explicit page labels', () => {
    const markup = renderToStaticMarkup(
      <TableOfContents items={[
        { title: '1.2 Systems legend', target: 'section-1-2', level: 2 },
        { title: 'Appendix', page: 'A-1', level: 2 },
      ]} />,
    );

    expect(markup).toContain('href="#section-1-2"');
    expect(markup).toContain('data-toc-level="2"');
    expect(markup).toContain('data-facet-toc-target="section-1-2"');
    expect(markup).not.toContain('href="#undefined"');
  });
});

describe('Page', () => {
  it('publishes its id as the automatic table-of-contents target', () => {
    const markup = renderToStaticMarkup(<Page id="summary">Summary</Page>);

    expect(markup).toContain('id="summary"');
    expect(markup).toContain('data-facet-page-id="summary"');
  });
});
