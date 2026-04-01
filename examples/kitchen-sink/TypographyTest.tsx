import {
  DatasheetTemplate,
  Page,
  Section,
  CompactTable,
  SpecificationTable,
  StatCard,
  Badge,
  ProgressBar,
  Theme,
} from '@flanksource/facet';
import { IoServer, IoCloudDone, IoPulse, IoShieldCheckmark } from 'react-icons/io5';
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';

const specs = [
  { category: 'Kubernetes', value: '1.24+' },
  { category: 'PostgreSQL', value: '13+' },
  { category: 'Memory', value: '4GB minimum' },
  { category: 'Storage', value: '20GB SSD' },
  { category: 'Deployment', value: ['SaaS', 'Self-hosted', 'Hybrid'] },
];

const tableData = [
  ['search_catalog', 'Find config items by name, type, or health', 'Show all unhealthy pods'],
  ['get_config', 'Retrieve detailed config item info', 'Describe deployment nginx'],
  ['run_health_check', 'Execute a health check canary', 'Run http-check-api'],
  ['list_changes', 'View recent configuration changes', 'Changes in last 24h'],
  ['get_topology', 'View component relationships', 'Show dependencies of api-gw'],
];

const compactData = [
  { label: 'Cluster', value: 'prod-us-east-1' },
  { label: 'Nodes', value: '12' },
  { label: 'Namespaces', value: '34' },
  { label: 'Pods', value: '847' },
  { label: 'Services', value: '156' },
  { label: 'Ingresses', value: '23' },
];

function TypographyShowcase() {
  return (
    <div className="space-y-[4mm]">
      <h1>Heading 1 — Product Title</h1>
      <h2>Heading 2 — Section Title</h2>
      <h3>Heading 3 — Subsection</h3>
      <h4>Heading 4 — Minor Heading</h4>
      <p>Body paragraph text at default size. Mission Control provides unified visibility into infrastructure health, configuration drift, and security posture across Kubernetes clusters. This paragraph demonstrates the standard body text rendering with proper line-height and spacing for optimal readability in PDF output.</p>
      <p className="text-xs">text-xs: Fine print, footnotes, and metadata annotations</p>
      <p className="text-sm">text-sm: Secondary text, captions, and supporting details</p>
      <p className="text-md">text-md: Default body text equivalent</p>
      <p className="text-lg">text-lg: Emphasized text and callouts</p>
      <p className="text-xl">text-xl: Large display text</p>
      <p className="text-2xl">text-2xl: Hero display text</p>
    </div>
  );
}

function DenseContent() {
  return (
    <div className="space-y-[3mm]">
      <div className="grid grid-cols-4 gap-[2mm]">
        <StatCard variant="bordered" value="99.9%" label="Uptime" icon={IoCloudDone} color="green" size="sm" />
        <StatCard variant="bordered" value="847" label="Resources" icon={IoServer} color="blue" size="sm" />
        <StatCard variant="bordered" value="23" label="Checks" icon={IoPulse} color="green" size="sm" />
        <StatCard variant="bordered" value="3" label="Alerts" icon={IoShieldCheckmark} color="red" size="sm" />
      </div>

      <Section variant="hero" title="System Requirements" size="sm">
        <SpecificationTable specifications={specs} size="sm" />
      </Section>

      <Section variant="hero" title="API Reference" size="sm">
        <CompactTable variant="reference" columns={['Tool', 'Purpose', 'Example']} data={tableData} size="sm" />
      </Section>

      <div className="flex flex-wrap gap-[2mm]">
        <Badge variant="status" status="success" label="Healthy" size="xs" />
        <Badge variant="status" status="warning" label="Degraded" size="xs" />
        <Badge variant="status" status="error" label="Failed" size="xs" />
        <Badge variant="outlined" label="v2.4.1" borderColor={Theme.Purpose.Primary} textColor={Theme.Purpose.Primary} size="xs" />
      </div>

      <div className="space-y-[1.5mm]">
        <ProgressBar title="CPU" percentage={65} variant="primary" size="sm" />
        <ProgressBar title="Memory" percentage={82} variant="warning" size="sm" />
        <ProgressBar title="Disk" percentage={45} variant="success" size="sm" />
      </div>

      <CompactTable variant="compact" title="Cluster Info" data={compactData} size="xs" />
    </div>
  );
}

export default function TypographyTest() {
  return (
    <DatasheetTemplate title="Typography & Compactness Test" css="">
      <FlanksourceHeader variant="solid" title="Typography Test" subtitle="Font Sizing Reference" />
      <FlanksourceFooter variant="compact" />

      <Page title="Typography Scale" product="Font Reference" margins={{ top: 5, bottom: 5 }}>
        <TypographyShowcase />
      </Page>

      <Page title="Dense Layout — sm" product="Compact Sizing" margins={{ top: 5, bottom: 5 }}>
        <DenseContent />
      </Page>

      <Page title="Table Size Comparison" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-[4mm]">
          <h3>Size: xs</h3>
          <CompactTable variant="reference" columns={['Tool', 'Purpose', 'Example']} data={tableData} size="xs" />

          <h3>Size: sm</h3>
          <CompactTable variant="reference" columns={['Tool', 'Purpose', 'Example']} data={tableData} size="sm" />

          <h3>Size: base (default)</h3>
          <CompactTable variant="reference" columns={['Tool', 'Purpose', 'Example']} data={tableData} size="base" />

          <h3>Size: md</h3>
          <CompactTable variant="reference" columns={['Tool', 'Purpose', 'Example']} data={tableData} size="md" />
        </div>
      </Page>

      <Page title="Spec Table Sizes" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-[4mm]">
          <h3>SpecificationTable — xs</h3>
          <SpecificationTable specifications={specs} size="xs" />

          <h3>SpecificationTable — sm</h3>
          <SpecificationTable specifications={specs} size="sm" />

          <h3>SpecificationTable — base</h3>
          <SpecificationTable specifications={specs} size="base" />

          <h3>SpecificationTable — md</h3>
          <SpecificationTable specifications={specs} size="md" />
        </div>
      </Page>

      <Page title="Compact Layout Stress Test" margins={{ top: 3, bottom: 3 }}>
        <div className="space-y-[2mm]">
          <p className="text-xs text-gray-500">This page tests maximum content density with minimal margins (3mm top/bottom).</p>

          <div className="grid grid-cols-2 gap-[2mm]">
            <CompactTable variant="compact" title="Cluster A" data={compactData} size="xs" />
            <CompactTable variant="compact" title="Cluster B" data={compactData} size="xs" />
          </div>

          <CompactTable variant="reference" columns={['Tool', 'Purpose', 'Example']} data={tableData} size="xs" />

          <div className="grid grid-cols-4 gap-[1.5mm]">
            <StatCard variant="card" value="12" label="Nodes" color="blue" size="sm" />
            <StatCard variant="card" value="847" label="Pods" color="green" size="sm" />
            <StatCard variant="card" value="156" label="Services" color="gray" size="sm" />
            <StatCard variant="card" value="3" label="Incidents" color="red" size="sm" />
          </div>

          <SpecificationTable specifications={specs} size="xs" />

          <div className="grid grid-cols-2 gap-[2mm]">
            <div className="space-y-[1mm]">
              <ProgressBar title="CPU" percentage={72} variant="primary" size="sm" />
              <ProgressBar title="Memory" percentage={88} variant="warning" size="sm" />
              <ProgressBar title="Disk" percentage={34} variant="success" size="sm" />
              <ProgressBar title="Network" percentage={56} variant="info" size="sm" />
            </div>
            <div className="space-y-[1mm]">
              <ProgressBar title="SLA" percentage={99.9} variant="success" size="sm" />
              <ProgressBar title="Error Rate" percentage={2.1} variant="danger" size="sm" />
              <ProgressBar title="Latency" percentage={45} variant="primary" size="sm" />
              <ProgressBar title="Throughput" percentage={78} variant="info" size="sm" />
            </div>
          </div>

          <CompactTable variant="reference" columns={['Tool', 'Purpose', 'Example']} data={tableData} size="xs" />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
