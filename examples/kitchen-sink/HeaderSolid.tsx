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
import { specifications as specs, infrastructureData, releaseData } from './data';

export default function HeaderSolid() {
  return (
    <DatasheetTemplate>
      <FlanksourceHeader type="first" variant="solid" title="Solid" subtitle="First Header" />
      <FlanksourceHeader type="default" variant="solid" title="Solid" subtitle="Default Header" />
      <FlanksourceFooter type="default" variant="minimal" />
      <FlanksourceFooter type="first" variant="default" />
      <Page
        title="First Page"
        product="Mission Control"
        type="first"
        margins={{ top: 10, bottom: 5, left: 10, right: 10 }}
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

      <Page
        title="Solid + Compact Footer"
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-4">
          <CompactTable variant="compact" title="Infrastructure" data={infrastructureData} />
          <CompactTable variant="inline" title="Release" data={releaseData} />
        </div>
      </Page>

      <Page
        title="Solid + Minimal Footer"
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-4">
          <SpecificationTable title="Technical Specs" specifications={specs} />
        </div>
      </Page>

      <Page
        title="Last Page"
        type="last"
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-4">
          <CompactTable variant="compact" title="Summary" data={[
            { label: 'Pages', value: '4' },
            { label: 'Header', value: 'Solid' },
            { label: 'Footer', value: 'None' },
          ]} />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
