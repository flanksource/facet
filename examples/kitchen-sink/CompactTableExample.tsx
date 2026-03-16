import { CompactTable } from '@facet';
import { compactData as kvData, referenceData } from './data';

const arrayData = [
  { label: 'Cloud Providers', value: ['AWS', 'Azure', 'GCP'] },
  { label: 'Kubernetes', value: ['EKS', 'AKS', 'GKE', 'OpenShift'] },
];

export default function CompactTableExample() {
  return (
    <div className="space-y-10 p-6">
      <h1 className="text-2xl font-bold">CompactTable Examples</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Compact — Default (sm)</h2>
        <CompactTable variant="compact" title="System Requirements" data={kvData} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Compact — size=xs</h2>
        <CompactTable variant="compact" title="System Requirements" data={kvData} size="xs" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Compact — size=md</h2>
        <CompactTable variant="compact" title="System Requirements" data={kvData} size="md" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Inline — Default (sm)</h2>
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
        <h2 className="text-lg font-semibold mb-2">Inline — size=xs</h2>
        <CompactTable
          variant="inline"
          title="Quick Stats"
          data={[
            { label: 'Version', value: '2.0.0' },
            { label: 'Release', value: 'Jan 2025' },
            { label: 'License', value: 'Apache 2.0' },
          ]}
          size="xs"
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Reference — Default (sm)</h2>
        <CompactTable
          variant="reference"
          title="MCP Tools"
          columns={['Tool Name', 'Purpose', 'Example']}
          data={referenceData}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Reference — size=xs</h2>
        <CompactTable
          variant="reference"
          title="MCP Tools"
          columns={['Tool Name', 'Purpose', 'Example']}
          data={referenceData}
          size="xs"
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">With Array Values — size=xs</h2>
        <CompactTable variant="compact" title="Platforms" data={arrayData} size="xs" />
      </section>
    </div>
  );
}
