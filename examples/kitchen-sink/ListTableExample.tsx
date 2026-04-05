import { ListTable, Page, DatasheetTemplate } from '@facet';
import { Icon } from '@flanksource/icons/icon';
import { changeLog } from './data';

const rows = changeLog.slice(0, 5);

export default function ListTableExample() {
  return (
    <DatasheetTemplate title="ListTable Examples" css="">
      <Page title="Density — Minimal" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <h3>compact</h3>
            <ListTable rows={rows} subject="type" body="summary" primaryTags={['severity']} size="xs" density="compact" />
          </div>
          <div>
            <h3>normal</h3>
            <ListTable rows={rows} subject="type" body="summary" primaryTags={['severity']} size="xs" density="normal" />
          </div>
          <div>
            <h3>comfortable</h3>
            <ListTable rows={rows} subject="type" body="summary" primaryTags={['severity']} size="xs" density="comfortable" />
          </div>
        </div>
      </Page>

      <Page title="Density — Full Features" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-6">
          {(['compact', 'normal', 'comfortable'] as const).map((density) => (
            <div key={density}>
              <h3>{density}</h3>
              <ListTable
                rows={rows}
                subject="type"
                subtitle="source"
                body="summary"
                date="date"
                dateFormat="age"
                icon="type"
                iconMap={(type) => <Icon name={type} size={14} />}
                primaryTags={['severity']}
                secondaryTags={['createdBy']}
                count="count"
                size="xs"
                density={density}
              />
            </div>
          ))}
        </div>
      </Page>

      <Page title="Sizes — Normal Density" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="grid grid-cols-3 gap-6">
          {(['xs', 'sm', 'md'] as const).map((size) => (
            <div key={size}>
              <h3>{size}</h3>
              <ListTable
                rows={rows}
                subject="type"
                subtitle="source"
                body="summary"
                date="date"
                dateFormat="age"
                icon="type"
                iconMap={(type) => <Icon name={type} size={14} />}
                primaryTags={['severity']}
                secondaryTags={['createdBy']}
                count="count"
                size={size}
                density="normal"
              />
            </div>
          ))}
        </div>
      </Page>

      <Page title="Date Formats" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="grid grid-cols-3 gap-6">
          {(['age', 'short', 'long'] as const).map((fmt) => (
            <div key={fmt}>
              <h3>{fmt}</h3>
              <ListTable
                rows={rows.slice(0, 3)}
                subject="type"
                body="summary"
                date="date"
                dateFormat={fmt}
                size="sm"
              />
            </div>
          ))}
        </div>
      </Page>

      <Page title="With Title & Empty State" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-8">
          <ListTable
            title="Recent Changes"
            rows={rows}
            subject="type"
            subtitle="source"
            body="summary"
            date="date"
            dateFormat="age"
            icon="type"
            iconMap={(type) => <Icon name={type} size={14} />}
            primaryTags={['severity']}
            count="count"
            size="sm"
          />

          <div>
            <h3>Empty State</h3>
            <ListTable rows={[]} subject="type" size="sm" emptyMessage="No changes recorded." />
          </div>
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
