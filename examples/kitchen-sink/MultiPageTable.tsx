import {
  DatasheetTemplate,
  Page,
  Header,
  Footer,
  CompactTable,
  SecurityChecksTable,
} from '@flanksource/facet';
import type { PageSize } from '@flanksource/facet';
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';

const PAGE_SIZES: PageSize[] = ['a4', 'a3', 'letter', 'legal', 'fhd', 'qhd', 'wqhd', '4k', '5k', '16k'];

const manyChecks = Array.from({ length: 30 }, (_, i) => ({
  name: `Check-${i + 1}`,
  score: Math.round(Math.random() * 10),
  reason: `Reason for check ${i + 1}`,
  details: [`Detail: info about check ${i + 1}`],
}));

const manyRows = Array.from({ length: 40 }, (_, i) => ({
  label: `Config Item ${i + 1}`,
  value: `Value ${i + 1} — ${['Active', 'Pending', 'Degraded', 'Healthy'][i % 4]}`,
}));

export default function MultiPageTable() {
  return (
    <DatasheetTemplate title="Multi-Page Table Test" css="">
      <FlanksourceHeader variant="solid" title="Multi-Page Table" subtitle="Overflow Test" />
      <FlanksourceFooter variant="default" />
      {PAGE_SIZES.map(size => (
        <Page
          key={size}
          pageSize={size}
          title={`Large Table — ${size.toUpperCase()}`}
          margins={{ top: 5, bottom: 5 }}
        >
          <div className="space-y-6">
            <SecurityChecksTable checks={manyChecks} />
            <CompactTable variant="compact" title="Configuration Items" data={manyRows} />
          </div>
        </Page>
      ))}
    </DatasheetTemplate>
  );
}
