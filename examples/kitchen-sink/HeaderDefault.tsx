import {
  DatasheetTemplate,
  Page,
  CompactTable,
  SpecificationTable,
  StatCard,
} from '@flanksource/facet';
import { IoServer, IoCloudDone, IoCheckmarkCircle } from 'react-icons/io5';
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';

const specs = [
  { category: 'Kubernetes', value: '1.24+' },
  { category: 'PostgreSQL', value: '13+' },
  { category: 'Memory', value: '4GB minimum' },
  { category: 'Deployment', value: ['SaaS', 'Self-hosted', 'Hybrid'] },
];

export default function HeaderDefault() {
  return (
    <DatasheetTemplate title="Header: Default" css="">
      <FlanksourceHeader variant="default" />
      <FlanksourceFooter variant="default" />
      <Page
        title="Default Header + Default Footer"
        product="Mission Control"
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard variant="bordered" value="99.9%" label="Uptime" icon={IoCloudDone} color="green" size="sm" />
            <StatCard variant="bordered" value="156" label="Config Items" icon={IoServer} color="blue" size="sm" />
            <StatCard variant="bordered" value="42" label="Health Checks" icon={IoCheckmarkCircle} color="green" size="sm" />
          </div>
          <SpecificationTable title="System Requirements" specifications={specs} />
        </div>
      </Page>

      <Page title="Infrastructure Details" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-4">
          <CompactTable variant="compact" title="Infrastructure" data={[
            { label: 'Kubernetes', value: '1.24+' },
            { label: 'Memory', value: '4GB minimum' },
            { label: 'CPU', value: '2 cores' },
            { label: 'Storage', value: '20GB SSD' },
          ]} />
          <CompactTable variant="inline" title="Release" data={[
            { label: 'Version', value: '2.0.0' },
            { label: 'Date', value: 'March 2026' },
            { label: 'License', value: 'Apache 2.0' },
          ]} />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
