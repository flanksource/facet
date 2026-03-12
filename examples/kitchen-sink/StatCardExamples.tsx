import {
  DatasheetTemplate,
  Page,
  StatCard,
  MetricGrid,
} from '@flanksource/facet';
import {
  IoShieldCheckmark,
  IoSpeedometer,
  IoTime,
  IoServer,
  IoCloudDone,
  IoPulse,
} from 'react-icons/io5';
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';

export default function StatCardExamples() {
  return (
    <DatasheetTemplate title="StatCard Examples" css="">
      <FlanksourceHeader variant="solid" title="Component Showcase" subtitle="StatCard" />
      <FlanksourceFooter variant="compact" />

      <Page title="StatCard Variants" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">card (sm / md / lg)</h3>
            <div className="flex flex-wrap gap-2">
              <StatCard value="99.9%" label="Uptime" icon={IoCloudDone} size="sm" />
              <StatCard value="99.9%" label="Uptime" icon={IoCloudDone} size="md" />
              <StatCard value="99.9%" label="Uptime" icon={IoCloudDone} size="lg" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">badge</h3>
            <div className="flex flex-wrap gap-2">
              <StatCard variant="badge" value="42" label="Issues" icon={IoShieldCheckmark} color="red" />
              <StatCard variant="badge" value="98%" label="Coverage" icon={IoSpeedometer} color="green" />
              <StatCard variant="badge" value="45s" label="Response" icon={IoTime} color="blue" />
              <StatCard variant="badge" value="12" label="Nodes" icon={IoServer} color="purple" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">hero</h3>
            <div className="grid grid-cols-3 gap-4">
              <StatCard variant="hero" value="99.99%" label="SLA Compliance" color="green" size="sm" />
              <StatCard variant="hero" value="2,847" label="Deployments" color="blue" size="sm" />
              <StatCard variant="hero" value="4.8" label="DORA Score" color="purple" size="sm" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">bordered</h3>
            <div className="grid grid-cols-4 gap-3">
              <StatCard variant="bordered" value="156" label="Config Items" icon={IoServer} color="blue" size="sm" />
              <StatCard variant="bordered" value="23" label="Health Checks" icon={IoPulse} color="green" size="sm" />
              <StatCard variant="bordered" value="8" label="Playbooks" icon={IoSpeedometer} color="purple" size="sm" />
              <StatCard variant="bordered" value="3" label="Alerts" icon={IoShieldCheckmark} color="red" size="sm" />
            </div>
          </div>
        </div>
      </Page>

      <Page title="StatCard Layouts & Comparisons" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">left-aligned</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard variant="left-aligned" value="5m 30s" label="Mean Time to Detect" icon={IoTime} />
              <StatCard variant="left-aligned" value="45s" label="Mean Time to Resolve" icon={IoTime} color="green" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">metric</h3>
            <div className="grid grid-cols-3 gap-3">
              <StatCard variant="metric" value="847" label="Total Resources" icon={IoServer} color="blue" />
              <StatCard variant="metric" value="99.2%" label="Availability" icon={IoCloudDone} color="green" />
              <StatCard variant="metric" value="12ms" label="Avg Latency" icon={IoSpeedometer} color="gray" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">with comparison</h3>
            <div className="grid grid-cols-3 gap-3">
              <StatCard variant="bordered" value={45} compareFrom={330} label="Response Time (s)" compareVariant="before-after" icon={IoTime} size="sm" color="green" />
              <StatCard variant="bordered" value={98} compareFrom={85} label="Test Coverage %" compareVariant="trendline" icon={IoShieldCheckmark} size="sm" color="blue" />
              <StatCard variant="bordered" value={3} compareFrom={12} label="Open Incidents" compareVariant="up-down" icon={IoPulse} size="sm" color="red" conditionalStyles={['green-red']} />
            </div>
          </div>
        </div>
      </Page>

      <Page title="MetricGrid" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">4 columns</h3>
            <MetricGrid columns={4} metrics={[
              { value: '99.9%', label: 'Uptime', icon: IoCloudDone, valueColor: 'green' },
              { value: '45ms', label: 'P95 Latency', icon: IoSpeedometer, valueColor: 'blue' },
              { value: '2.1K', label: 'Requests/s', icon: IoPulse },
              { value: 0, label: 'Errors', icon: IoShieldCheckmark, valueColor: 'green' },
            ]} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">3 columns</h3>
            <MetricGrid columns={3} metrics={[
              { value: 156, label: 'Kubernetes Resources', valueColor: 'blue' },
              { value: 42, label: 'Health Checks Passing', valueColor: 'green' },
              { value: 3, label: 'Critical Alerts', valueColor: 'red' },
            ]} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">2 columns</h3>
            <MetricGrid columns={2} metrics={[
              { value: '24/7', label: 'Support Coverage', valueColor: 'blue' },
              { value: '< 1h', label: 'Response Time SLA', valueColor: 'green' },
            ]} />
          </div>
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
