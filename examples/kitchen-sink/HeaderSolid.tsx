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
      {/* Tall hero header for the cover page: 30mm band, 20mm logo */}
      <FlanksourceHeader
        type="first"
        variant="solid"
        title="Solid"
        subtitle="First Header — 30mm band, 20mm logo"
        height={30}
        logoClass="h-[20mm] w-auto"
      />
      {/* Compact per-page chrome: 14mm band, 10mm logo, slate-800 background */}
      <FlanksourceHeader
        type="default"
        variant="solid"
        title=""
        subtitle="Default Header — 14mm band, 10mm logo, bg-slate-800"
        height={14}
        logoClass="h-[10mm] w-auto"
        className="bg-slate-800"
      />
      <FlanksourceFooter type="default" variant="minimal" />
      <FlanksourceFooter type="first" variant="default" />
      <Page
        title="First Page (30mm hero header)"
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
        title="Page 2 — 10mm compact chrome"
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-4">
          <CompactTable variant="compact" title="Infrastructure" data={infrastructureData} />
          <CompactTable variant="inline" title="Release" data={releaseData} />
        </div>
      </Page>

      <Page
        title="Page 3 — 10mm compact chrome"
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-4">
          <SpecificationTable title="Technical Specs" specifications={specs} />
        </div>
      </Page>

      <Page
        title="Last Page — 10mm compact chrome"
        type="last"
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-4">
          <CompactTable variant="compact" title="Summary" data={[
            { label: 'Pages', value: '4' },
            { label: 'Header (first)', value: '30mm hero, 20mm logo' },
            { label: 'Header (default)', value: '14mm chrome, 10mm logo, bg-slate-800' },
          ]} />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
