import {
  DatasheetTemplate,
  Page,
  Header,
  Footer,
  PageBreak,
  CompactTable,
  SpecificationTable,
  StatCard,
} from '@flanksource/facet';
import { IoServer, IoCloudDone, IoCheckmarkCircle } from 'react-icons/io5';

const specs = [
  { category: 'Kubernetes', value: '1.24+' },
  { category: 'PostgreSQL', value: '13+' },
  { category: 'Memory', value: '4GB minimum' },
  { category: 'Deployment', value: ['SaaS', 'Self-hosted', 'Hybrid'] },
];

export default function HeaderDefault() {
  return (
    <DatasheetTemplate title="Header: Default" css="">
      <Page
        title="Default + Default Footer"
        product="Mission Control"
        header={<Header variant="default" title="Technical Datasheet" subtitle="Mission Control Platform" />}
        headerHeight={18}
        footer={<Footer variant="default" />}
        footerHeight={15}
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

      <PageBreak />

      <Page
        title="Default + Compact Footer"
        header={<Header variant="default" title="Technical Datasheet" subtitle="Compact Footer" />}
        headerHeight={18}
        footer={<Footer variant="compact" />}
        footerHeight={10}
        margins={{ top: 5, bottom: 5 }}
      >
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

      <PageBreak />

      <Page
        title="Default + Minimal Footer"
        header={<Header variant="default" title="Technical Datasheet" subtitle="Minimal Footer" />}
        headerHeight={18}
        footer={<Footer variant="minimal" />}
        footerHeight={8}
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-4">
          <SpecificationTable title="Technical Specs" specifications={specs} />
        </div>
      </Page>

      <PageBreak />

      <Page
        title="Default + No Footer"
        header={<Header variant="default" title="Technical Datasheet" subtitle="No Footer" />}
        headerHeight={18}
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-4">
          <CompactTable variant="compact" title="Summary" data={[
            { label: 'Pages', value: '4' },
            { label: 'Header', value: 'Default' },
            { label: 'Footer', value: 'None' },
          ]} />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
