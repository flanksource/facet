import { describe, it, expect } from 'vitest';
import { pageStructure } from './page-structure.js';
import type { LintContext } from '../types.js';

function ctx(content: string, filePath = 'Report.tsx'): LintContext {
  return { filePath, fileType: 'tsx', content, lines: content.split('\n') };
}

const SINGLE_LINE_IMPORT = `import { Document, Header, Footer, Page, PageNo } from '@flanksource/facet';`;
const MULTI_LINE_IMPORT = `import {
  Document,
  Header,
  Footer,
  Page,
} from '@flanksource/facet';`;

function documentTemplate(imports: string): string {
  return `${imports}

export default function Report() {
  return (
    <Document title="Report">
      <Header type="first" height={30} />
      <Footer type="default" height={8} />
      <Page type="first">
        <div>content</div>
      </Page>
      <Page>
        <div>more</div>
      </Page>
    </Document>
  );
}`;
}

describe('page-structure', () => {
  describe('Document as the root wrapper', () => {
    it('accepts a Document-rooted template whose pages sit inside Document', () => {
      expect(pageStructure.check(ctx(documentTemplate(SINGLE_LINE_IMPORT)))).toEqual([]);
    });

    it('accepts a Document-rooted template regardless of import formatting', () => {
      const single = pageStructure.check(ctx(documentTemplate(SINGLE_LINE_IMPORT)));
      const multi = pageStructure.check(ctx(documentTemplate(MULTI_LINE_IMPORT)));
      expect(multi).toEqual(single);
    });

    it('accepts custom Header/Footer wrapper components as Document children', () => {
      const content = `${SINGLE_LINE_IMPORT}
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';

export default function Report() {
  return (
    <Document>
      <FlanksourceHeader type="first" variant="solid" />
      <FlanksourceFooter type="default" />
      <Page type="first">
        <div>content</div>
      </Page>
    </Document>
  );
}`;
      expect(pageStructure.check(ctx(content))).toEqual([]);
    });

    it('reports content placed directly in Document outside any Page', () => {
      const content = `${SINGLE_LINE_IMPORT}

export default function Report() {
  return (
    <Document>
      <Header type="first" />
      <section>orphaned</section>
      <Page><div>ok</div></Page>
    </Document>
  );
}`;
      const issues = pageStructure.check(ctx(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toMatch(/outside <Page> wrapper/);
    });
  });

  describe('template detection is independent of import formatting', () => {
    it('reports a missing Page when the Page import spans multiple lines', () => {
      const content = `${MULTI_LINE_IMPORT}

export default function Report() {
  return (
    <Document>
      <section>no page anywhere</section>
    </Document>
  );
}`;
      const issues = pageStructure.check(ctx(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toBe('Template must wrap content in a <Page> component');
    });
  });

  describe('Page-rooted templates', () => {
    it('accepts a Page-rooted template with allowed siblings', () => {
      const content = `${SINGLE_LINE_IMPORT}

export default function Report() {
  return (
    <>
      <Header type="first" />
      <Page><div>content</div></Page>
      <PageBreak />
    </>
  );
}`;
      expect(pageStructure.check(ctx(content))).toEqual([]);
    });

    it('reports a Page nested inside another Page', () => {
      const content = `${SINGLE_LINE_IMPORT}

export default function Report() {
  return (
    <Document>
      <Page>
        <Page><div>nested</div></Page>
      </Page>
    </Document>
  );
}`;
      const issues = pageStructure.check(ctx(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toMatch(/Nested <Page> inside <Page>/);
    });
  });

  describe('fragments are transparent', () => {
    it('accepts chrome grouped in a React.Fragment inside Document', () => {
      const content = `${SINGLE_LINE_IMPORT}

export default function Report() {
  return (
    <Document>
      {['first', 'default'].map((type) => (
        <React.Fragment key={type}>
          <Header type={type} height={14} />
          <Footer type={type} height={9} />
        </React.Fragment>
      ))}
      <Page><div>content</div></Page>
    </Document>
  );
}`;
      expect(pageStructure.check(ctx(content))).toEqual([]);
    });

    it('sees a nested Page through a shorthand fragment', () => {
      const content = `${SINGLE_LINE_IMPORT}

export default function Report() {
  return (
    <Document>
      <Page>
        <>
          <Page><div>nested</div></Page>
        </>
      </Page>
    </Document>
  );
}`;
      const issues = pageStructure.check(ctx(content));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toMatch(/Nested <Page>/);
    });
  });

  describe('non-templates', () => {
    it('ignores a file that does not import Page', () => {
      const content = `import { Badge } from '@flanksource/facet';

export default function Chip() {
  return <Badge variant="status">ok</Badge>;
}`;
      expect(pageStructure.check(ctx(content))).toEqual([]);
    });

    it('ignores a component that only imports Page types', () => {
      const content = `import React from 'react';
import type { PageSize, PageMargins } from './Page';

export default function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="wrapper">{children}</div>;
}`;
      expect(pageStructure.check(ctx(content), )).toEqual([]);
    });
  });
});
