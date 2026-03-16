import {
  DatasheetTemplate,
  Page,
  StatCard,
  MetricGrid,
  Badge,
  Status,
  Gauge,
  ScoreGauge,
  ProgressBar,
  MetricHeader,
  CompactTable,
  SecurityChecksTable,
  SpecificationTable,
  LogoGrid,
} from '@flanksource/facet';
import {
  IoCheckmarkCircle,
  IoWarning,
  IoCloseCircle,
  IoInformationCircle,
  IoShieldCheckmark,
  IoGitBranch,
  IoRocket,
  IoServer,
  IoCloudDone,
  IoPulse,
  IoLockClosed,
  IoTime,
  IoFlash,
  IoCube,
  IoSpeedometer,
} from 'react-icons/io5';
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';
import {
  compactData,
  referenceData,
  securityChecks,
  specifications,
  logos,
  releaseData,
} from './data';

export default function UberKitchenSink() {
  return (
    <DatasheetTemplate title="Facet Kitchen Sink" css="">
      <FlanksourceHeader variant="solid" title="Kitchen Sink" subtitle="Component Showcase" />
      <FlanksourceFooter variant="default" />

      <Page title="Overview" product="Mission Control" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-3">
            <StatCard variant="bordered" value="99.9%" label="Uptime" icon={IoCloudDone} color="green" size="sm" />
            <StatCard variant="bordered" value="156" label="Config Items" icon={IoServer} color="blue" size="sm" />
            <StatCard variant="bordered" value="23" label="Health Checks" icon={IoPulse} color="green" size="sm" />
            <StatCard variant="bordered" value="3" label="Alerts" icon={IoShieldCheckmark} color="red" size="sm" />
          </div>
          <SpecificationTable title="System Requirements" specifications={specifications} />
          <CompactTable variant="inline" title="Release Info" data={releaseData} />
        </div>
      </Page>

      <Page title="Stats & Metrics" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">StatCard variants</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <StatCard variant="badge" value="42" label="Issues" icon={IoShieldCheckmark} color="red" />
              <StatCard variant="badge" value="98%" label="Coverage" icon={IoSpeedometer} color="green" />
              <StatCard variant="badge" value="45s" label="Response" icon={IoTime} color="blue" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <StatCard variant="hero" value="99.99%" label="SLA" color="green" size="sm" />
              <StatCard variant="hero" value="2,847" label="Deployments" color="blue" size="sm" />
              <StatCard variant="hero" value="4.8" label="DORA Score" color="purple" size="sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard variant="metric" value="847" label="Resources" icon={IoServer} color="blue" />
              <StatCard variant="metric" value="99.2%" label="Availability" icon={IoCloudDone} color="green" />
              <StatCard variant="metric" value="12ms" label="Latency" icon={IoSpeedometer} color="gray" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">MetricGrid</h3>
            <MetricGrid columns={4} metrics={[
              { value: '99.9%', label: 'Uptime', icon: IoCloudDone, valueColor: 'green' },
              { value: '45ms', label: 'P95 Latency', icon: IoSpeedometer, valueColor: 'blue' },
              { value: '2.1K', label: 'Requests/s', icon: IoPulse },
              { value: 0, label: 'Errors', icon: IoShieldCheckmark, valueColor: 'green' },
            ]} />
          </div>
        </div>
      </Page>

      <Page title="Badges & Icons" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="status" status="success" label="Healthy" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="warning" label="Degraded" icon={IoWarning} />
            <Badge variant="status" status="error" label="Failed" icon={IoCloseCircle} />
            <Badge variant="status" status="info" label="Pending" icon={IoInformationCircle} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="metric" label="CPU" value="42%" icon={IoPulse} />
            <Badge variant="metric" label="Memory" value="8.2 GB" icon={IoServer} />
            <Badge variant="metric" label="Uptime" value="99.9%" icon={IoCloudDone} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="custom" color="#eef2ff" textColor="#4338ca" label="v2.4.1" icon={IoGitBranch} />
            <Badge variant="custom" color="#fdf2f8" textColor="#be185d" label="Production" icon={IoRocket} />
            <Badge variant="custom" color="#ecfdf5" textColor="#065f46" label="Secured" icon={IoLockClosed} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outlined" label="Kubernetes" icon={IoCube} borderColor="#326ce5" textColor="#326ce5" />
            <Badge variant="outlined" label="Helm" borderColor="#0f1689" textColor="#0f1689" />
            <Badge variant="outlined" label="Flux" borderColor="#5468ff" textColor="#5468ff" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="status" status="success" label="xs" size="xs" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="success" label="sm" size="sm" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="success" label="md" size="md" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="success" label="lg" size="lg" icon={IoCheckmarkCircle} />
          </div>
          <div className="flex flex-wrap gap-4">
            <Status status="healthy" />
            <Status status="unhealthy" />
            <Status status="warning" />
            <Status status="unknown" />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {[
              { Icon: IoShieldCheckmark, name: 'Shield' },
              { Icon: IoServer, name: 'Server' },
              { Icon: IoCloudDone, name: 'Cloud' },
              { Icon: IoPulse, name: 'Pulse' },
              { Icon: IoRocket, name: 'Rocket' },
              { Icon: IoLockClosed, name: 'Lock' },
              { Icon: IoGitBranch, name: 'Git' },
              { Icon: IoFlash, name: 'Flash' },
            ].map(({ Icon, name }) => (
              <div key={name} className="flex flex-col items-center gap-1">
                <div className="flex items-end gap-1">
                  <Icon className="w-3 h-3 text-blue-600" />
                  <Icon className="w-4 h-4 text-blue-600" />
                  <Icon className="w-5 h-5 text-blue-600" />
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-[7pt] text-gray-500">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </Page>

      <Page title="Gauges & Progress" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-end">
            <Gauge value={85} minValue={0} maxValue={100} units="%" arcColor="#16a34a" width="8em" />
            <Gauge value={62} minValue={0} maxValue={100} units="%" arcColor="#eab308" width="8em" />
            <Gauge value={23} minValue={0} maxValue={100} units="%" arcColor="#dc2626" width="8em" />
          </div>
          <div className="flex flex-wrap gap-6 items-end">
            <ScoreGauge score={8.5} label="Security" size="sm" />
            <ScoreGauge score={5.2} label="Maintenance" size="sm" />
            <ScoreGauge score={2.1} label="Vulnerabilities" size="sm" />
            <ScoreGauge score={9.1} label="Overall" size="md" />
          </div>
          <MetricHeader variant="gauge" title="Security Score" subtitle="OpenSSF Scorecard" score={8.5} />
          <MetricHeader variant="comparison" title="Service Health Time" subtitle="Before vs After" before={{ value: 330, unit: 'seconds' }} after={{ value: 45, unit: 'seconds' }} />
          <div className="space-y-3">
            <ProgressBar title="CPU Usage" percentage={65} variant="primary" />
            <ProgressBar title="Memory" percentage={82} variant="warning" />
            <ProgressBar title="Disk" percentage={45} variant="success" />
            <ProgressBar title="Errors" percentage={12} variant="danger" />
            <ProgressBar title="SLA" percentage={99.9} displayValue="99.9% (target: 99.5%)" variant="success" />
          </div>
        </div>
      </Page>

      <Page title="Tables — Default & Small" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <CompactTable variant="compact" title="System Requirements" data={compactData} />
          <CompactTable variant="reference" title="MCP Tools" columns={['Tool Name', 'Purpose', 'Example']} data={referenceData} />
          <SecurityChecksTable checks={securityChecks} />
          <LogoGrid variant="table" title="Integrations" logos={logos} />
          <CompactTable variant="compact" title="Small (xs)" data={compactData} size="xs" />
          <SecurityChecksTable checks={securityChecks} size="xs" />
        </div>
      </Page>

      <Page title="Summary" product="Mission Control" watermark="DRAFT" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-4">
          <CompactTable variant="inline" title="Document Info" data={releaseData} />
          <CompactTable variant="compact" title="Large (md)" data={compactData} size="md" />
          <SpecificationTable title="Technical Specs (base)" specifications={specifications} size="base" />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
