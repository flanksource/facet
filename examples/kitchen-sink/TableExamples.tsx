import { DatasheetTemplate, Page, CompactTable } from '@flanksource/facet';
import type { PageSize } from '@flanksource/facet';
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';

const PAGE_SIZES: PageSize[] = ['a4', 'a3', 'letter', 'legal', 'fhd', 'qhd', 'wqhd', '4k', '5k', '16k'];

const gridData = [
  ['search_catalog', 'Find config items by name, type, or label', 'search_catalog("unhealthy pods")'],
  ['get_config', 'Retrieve full details for a config item', 'get_config("deployment/nginx")'],
  ['run_health_check', 'Execute a health check by name or ID', 'run_health_check("http-api")'],
  ['list_changes', 'Show recent changes for a config item', 'list_changes("node/worker-1")'],
  ['get_topology', 'Retrieve topology tree for a component', 'get_topology("cluster/prod")'],
  ['create_playbook', 'Create and run an automated playbook', 'create_playbook("restart-pod")'],
  ['list_incidents', 'List open incidents with severity filter', 'list_incidents(severity="high")'],
  ['get_metrics', 'Fetch metric timeseries for a resource', 'get_metrics("cpu", "pod/api")'],
];

const pricingTiers = [
  { label: 'Tier', value: 'Starter' },
  { label: 'Price', value: '$0/month' },
  { label: 'Users', value: 'Up to 5' },
  { label: 'Checks', value: '100' },
  { label: 'Retention', value: '7 days' },
  { label: 'Support', value: 'Community' },
];

const pricingPro = [
  { label: 'Tier', value: 'Professional' },
  { label: 'Price', value: '$499/month' },
  { label: 'Users', value: 'Up to 25' },
  { label: 'Checks', value: '1,000' },
  { label: 'Retention', value: '90 days' },
  { label: 'Support', value: 'Email + Slack' },
];

const pricingEnterprise = [
  { label: 'Tier', value: 'Enterprise' },
  { label: 'Price', value: 'Custom' },
  { label: 'Users', value: 'Unlimited' },
  { label: 'Checks', value: 'Unlimited' },
  { label: 'Retention', value: '1 year' },
  { label: 'Support', value: '24/7 dedicated' },
];

export default function TableExamples() {
  return (
    <DatasheetTemplate title="Table Examples" css="">
      <FlanksourceHeader variant="solid" title="Component Showcase" subtitle="Tables" />
      <FlanksourceFooter variant="compact" />
      {PAGE_SIZES.map(size => (
        <Page key={size} pageSize={size} title={`Tables — ${size.toUpperCase()}`} margins={{ top: 5, bottom: 5 }}>
          <div className="space-y-6">
            <CompactTable
              variant="reference"
              title="API Reference"
              columns={['Command', 'Description', 'Example']}
              data={gridData}
            />
            <div className="grid grid-cols-3 gap-4">
              <CompactTable variant="compact" title="Starter" data={pricingTiers} />
              <CompactTable variant="compact" title="Professional" data={pricingPro} />
              <CompactTable variant="compact" title="Enterprise" data={pricingEnterprise} />
            </div>
          </div>
        </Page>
      ))}
    </DatasheetTemplate>
  );
}
