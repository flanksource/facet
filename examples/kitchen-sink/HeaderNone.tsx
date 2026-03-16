import {
  DatasheetTemplate,
  Page,
  CompactTable,
  SpecificationTable,
  StatCard,
} from '@flanksource/facet';
import { IoServer, IoCloudDone, IoCheckmarkCircle } from 'react-icons/io5';
import FlanksourceFooter from './FlanksourceFooter';
import { specifications as specs, infrastructureData } from './data';

export default function HeaderNone() {
  return (
    <DatasheetTemplate title="Header: None" css="">
      <FlanksourceFooter variant="default" />
      <Page
        title="No Header + Default Footer"
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
          <CompactTable variant="compact" title="Infrastructure" data={infrastructureData} />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
