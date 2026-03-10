import {
  DatasheetTemplate,
  Page,
  Header,
  Footer,
  PageBreak,
  CompactTable,
  SecurityChecksTable,
  SpecificationTable,
  LogoGrid,
} from '@flanksource/facet';

const compactData = [
  { label: 'Kubernetes', value: '1.24+' },
  { label: 'Memory', value: '4GB minimum' },
  { label: 'CPU', value: '2 cores minimum' },
  { label: 'Storage', value: '20GB SSD' },
];

const referenceData = [
  ['search_catalog', 'Find config items', 'Show all unhealthy pods'],
  ['get_config', 'Get item details', 'Describe deployment nginx'],
  ['run_health_check', 'Execute check', 'Run http-check-api'],
];

const securityChecks = [
  { name: 'Code-Review', score: 10, reason: 'All commits require review', details: ['Info: Branch protection enabled'], documentation: { url: 'https://github.com/ossf/scorecard/blob/main/docs/checks.md#code-review' } },
  { name: 'Vulnerabilities', score: 8, reason: '2 vulnerabilities found', details: ['Warn: 1 medium severity'] },
  { name: 'Dependency-Update-Tool', score: 0, reason: 'No tool detected', details: ['Warn: Consider Dependabot'] },
];

const specifications = [
  { category: 'Kubernetes', value: '1.24+' },
  { category: 'PostgreSQL', value: '13+' },
  { category: 'Memory', value: '4GB minimum' },
  { category: 'Deployment Models', value: ['SaaS', 'Self-hosted', 'Hybrid'] },
];

const logos = [
  { name: 'Prometheus', health: true, configuration: false, change: false, playbooks: true },
  { name: 'Kubernetes', health: true, configuration: true, change: true, playbooks: true },
  { name: 'Datadog', health: true, configuration: true, change: true, playbooks: true },
  { name: 'Flux', health: false, configuration: true, change: true, playbooks: true },
];

function TableSection({ title, fontSize, headerFontSize }: {
  title: string;
  fontSize?: string;
  headerFontSize?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 pb-1">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-xs text-gray-500">
          fontSize={fontSize ?? 'default'}, headerFontSize={headerFontSize ?? 'default'}
        </p>
      </div>
      <CompactTable variant="compact" title="System Requirements" data={compactData} fontSize={fontSize} headerFontSize={headerFontSize} />
      <CompactTable
        variant="inline"
        title="Quick Stats"
        data={[
          { label: 'Version', value: '2.0.0' },
          { label: 'Release', value: 'Jan 2025' },
          { label: 'License', value: 'Apache 2.0' },
        ]}
        fontSize={fontSize}
        headerFontSize={headerFontSize}
      />
      <CompactTable variant="reference" title="MCP Tools" columns={['Tool Name', 'Purpose', 'Example']} data={referenceData} fontSize={fontSize} headerFontSize={headerFontSize} />
      <SecurityChecksTable checks={securityChecks} fontSize={fontSize} headerFontSize={headerFontSize} />
      <SpecificationTable title="Technical Specs" specifications={specifications} fontSize={fontSize} headerFontSize={headerFontSize} />
      <LogoGrid variant="table" title="Integrations" logos={logos} fontSize={fontSize} headerFontSize={headerFontSize} />
    </div>
  );
}

export default function TableExamples() {
  return (
    <DatasheetTemplate title="Table Font Size Examples" css="">
      {/* Page 1: Default + Small */}
      <Page
        title="Tables — Default & Small"
        header={<Header variant="solid" title="Component Showcase" subtitle="Tables" />}
        headerHeight={18}
        footer={<Footer variant="compact" />}
        footerHeight={10}
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-8">
          <TableSection title="Default Sizes" />
          <TableSection title="Small (6pt / 8pt)" fontSize="6pt" headerFontSize="8pt" />
        </div>
      </Page>

      <PageBreak />

      {/* Page 2: Medium — multi-page table content */}
      <Page
        title="Tables — Medium"
        header={<Header variant="default" title="Component Showcase" subtitle="Tables" />}
        headerHeight={18}
        footer={<Footer variant="compact" />}
        footerHeight={10}
        margins={{ top: 5, bottom: 5 }}
      >
        <TableSection title="Medium (8pt / 10pt)" fontSize="8pt" headerFontSize="10pt" />
      </Page>

      <PageBreak />

      {/* Page 3: Large */}
      <Page
        title="Tables — Large"
        header={<Header variant="minimal" />}
        headerHeight={18}
        footer={<Footer variant="default" />}
        footerHeight={15}
        margins={{ top: 5, bottom: 5 }}
      >
        <TableSection title="Large (12pt / 14pt)" fontSize="12pt" headerFontSize="14pt" />
      </Page>
    </DatasheetTemplate>
  );
}
