import { CompactTable } from '@facet';

const kvData = [
  { label: 'Kubernetes', value: '1.24+' },
  { label: 'Memory', value: '4GB minimum' },
  { label: 'CPU', value: '2 cores minimum' },
  { label: 'Storage', value: '20GB SSD' },
];

const arrayData = [
  { label: 'Cloud Providers', value: ['AWS', 'Azure', 'GCP'] },
  { label: 'Kubernetes', value: ['EKS', 'AKS', 'GKE', 'OpenShift'] },
];

const referenceData = [
  ['search_catalog', 'Find config items', 'Show all unhealthy pods'],
  ['get_config', 'Get item details', 'Describe deployment nginx'],
  ['run_health_check', 'Execute check', 'Run http-check-api'],
];

export default function CompactTableExample() {
  return (
    <div className="space-y-10 p-6">
      <h1 className="text-2xl font-bold">CompactTable Examples</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Compact — Default Sizes</h2>
        <CompactTable variant="compact" title="System Requirements" data={kvData} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Compact — fontSize=6pt, headerFontSize=8pt</h2>
        <CompactTable variant="compact" title="System Requirements" data={kvData} fontSize="6pt" headerFontSize="8pt" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Compact — fontSize=12pt, headerFontSize=14pt</h2>
        <CompactTable variant="compact" title="System Requirements" data={kvData} fontSize="12pt" headerFontSize="14pt" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Inline — Default Sizes</h2>
        <CompactTable
          variant="inline"
          title="Quick Stats"
          data={[
            { label: 'Version', value: '2.0.0' },
            { label: 'Release', value: 'Jan 2025' },
            { label: 'License', value: 'Apache 2.0' },
          ]}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Inline — fontSize=7pt, headerFontSize=9pt</h2>
        <CompactTable
          variant="inline"
          title="Quick Stats"
          data={[
            { label: 'Version', value: '2.0.0' },
            { label: 'Release', value: 'Jan 2025' },
            { label: 'License', value: 'Apache 2.0' },
          ]}
          fontSize="7pt"
          headerFontSize="9pt"
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Reference — Default Sizes</h2>
        <CompactTable
          variant="reference"
          title="MCP Tools"
          columns={['Tool Name', 'Purpose', 'Example']}
          data={referenceData}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Reference — fontSize=6pt, headerFontSize=8pt</h2>
        <CompactTable
          variant="reference"
          title="MCP Tools"
          columns={['Tool Name', 'Purpose', 'Example']}
          data={referenceData}
          fontSize="6pt"
          headerFontSize="8pt"
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">With Array Values — fontSize=7pt</h2>
        <CompactTable variant="compact" title="Platforms" data={arrayData} fontSize="7pt" />
      </section>
    </div>
  );
}
