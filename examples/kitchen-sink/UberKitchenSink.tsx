import {
  AIModelCard,
  DatasheetTemplate,
  Page,
  Section,
  StatCard,
  SeverityStatCard,
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
  MatrixTable,
  Dot,
  Heatmap,
  DynamicTable,
  Format,
  BulletList,
  CalloutBox,
  ComparisonTable,
  SyntaxHighlighter,
  Steps,
  ListTable,
  AlertsTable,
  VulnerabilityBreakdown,
  Age,
  Avatar,
  AvatarGroup,
  CountBadge,
  KpiComparison,
  QueryResponseTerminal,
  TerminalOutput,
  Theme,
} from '@flanksource/facet';
import { Icon } from '@flanksource/icons/icon';
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
  IoSparkles,
} from 'react-icons/io5';
import { SiOpenai } from 'react-icons/si';
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';
import {
  compactData,
  referenceData,
  securityChecks,
  specifications,
  logos,
  releaseData,
  heatmapData,
  matrixColumns,
  matrixRows,
  dynamicColumns,
  dynamicRows,
  bulletItems,
  changeLog,
  vulnerabilityData,
  alertsData,
  codeExample,
} from './data';

const BADGE_STATUS_EXAMPLES = [
  { label: 'Healthy', value: 'ready', status: 'success' as const, icon: IoCheckmarkCircle },
  { label: 'Degraded', value: 'latency', status: 'warning' as const, icon: IoWarning },
  { label: 'Failed', value: 'blocked', status: 'error' as const, icon: IoCloseCircle },
  { label: 'Pending', value: 'queued', status: 'info' as const, icon: IoInformationCircle },
] as const;

const BADGE_FIELD_VALUE_EXAMPLES = [
  ['engine', 'postgresql'],
  ['env', 'production'],
  ['region', 'eu-west-1'],
  ['tier', 'critical'],
  ['owner', 'platform'],
  ['backup', 'nightly'],
  ['retention', '35d'],
  ['replicas', '3'],
] as const;

export default function UberKitchenSink() {
  return (
    <DatasheetTemplate title="Facet Kitchen Sink" css="">
      <FlanksourceHeader variant="solid" title="Kitchen Sink" subtitle="Component Showcase" />
      <FlanksourceFooter variant="default" />

      {/* Page 1: Overview */}
      <Page title="Overview" product="Mission Control" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-3">
            <StatCard variant="bordered" value="99.9%" label="Uptime" icon={IoCloudDone} color="green" size="sm" />
            <StatCard variant="bordered" value="156" label="Config Items" icon={IoServer} color="blue" size="sm" />
            <StatCard variant="bordered" value="23" label="Health Checks" icon={IoPulse} color="green" size="sm" />
            <StatCard variant="bordered" value="3" label="Alerts" icon={IoShieldCheckmark} color="red" size="sm" />
          </div>
          <SpecificationTable title="System Requirements" specifications={specifications} />
          <CompactTable variant="inline" title="Release Info" data={releaseData} />

          <Section variant="two-column" title="Platform Summary" layout="8-4"
            metric={<ScoreGauge score={8.5} label="Health" size="sm" />}>
            <p>Mission Control provides a unified view of infrastructure health, configuration drift, and security posture across multi-cloud environments.</p>
          </Section>

          <CalloutBox variant="info" title="New in v2.0">
            This release includes <Format type="number" value={47} /> new components, improved PDF rendering, and the facet lint command for template validation.
          </CalloutBox>
        </div>
      </Page>

      {/* Page 2: Stats & Metrics */}
      <Page title="Stats & Metrics" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3>Badge — xs / sm / md / lg</h3>
            <div className="flex flex-wrap items-end gap-2">
              <StatCard variant="badge" value="42" label="Issues" icon={IoShieldCheckmark} color="red" size="xs" />
              <StatCard variant="badge" value="42" label="Issues" icon={IoShieldCheckmark} color="red" size="sm" />
              <StatCard variant="badge" value="42" label="Issues" icon={IoShieldCheckmark} color="red" size="md" />
              <StatCard variant="badge" value="42" label="Issues" icon={IoShieldCheckmark} color="red" size="lg" />
            </div>

            <h3>Hero — xs / sm / md / lg</h3>
            <div className="grid grid-cols-4 gap-3">
              <StatCard variant="hero" value="99.99%" label="SLA" color="green" size="xs" />
              <StatCard variant="hero" value="99.99%" label="SLA" color="green" size="sm" />
              <StatCard variant="hero" value="99.99%" label="SLA" color="green" size="md" />
              <StatCard variant="hero" value="99.99%" label="SLA" color="green" size="lg" />
            </div>

            <h3>Bordered — xs / sm / md / lg</h3>
            <div className="grid grid-cols-4 gap-3">
              <StatCard variant="bordered" value="156" label="Config Items" icon={IoServer} color="blue" size="xs" />
              <StatCard variant="bordered" value="156" label="Config Items" icon={IoServer} color="blue" size="sm" />
              <StatCard variant="bordered" value="156" label="Config Items" icon={IoServer} color="blue" size="md" />
              <StatCard variant="bordered" value="156" label="Config Items" icon={IoServer} color="blue" size="lg" />
            </div>

            <h3>Metric — xs / sm / md / lg</h3>
            <div className="grid grid-cols-4 gap-3">
              <StatCard variant="metric" value="847" label="Resources" icon={IoServer} color="blue" size="xs" />
              <StatCard variant="metric" value="847" label="Resources" icon={IoServer} color="blue" size="sm" />
              <StatCard variant="metric" value="847" label="Resources" icon={IoServer} color="blue" size="md" />
              <StatCard variant="metric" value="847" label="Resources" icon={IoServer} color="blue" size="lg" />
            </div>

            <h3>Card — xs / sm / md / lg</h3>
            <div className="grid grid-cols-4 gap-3">
              <StatCard variant="card" value="23" label="Health Checks" icon={IoPulse} color="green" size="xs" />
              <StatCard variant="card" value="23" label="Health Checks" icon={IoPulse} color="green" size="sm" />
              <StatCard variant="card" value="23" label="Health Checks" icon={IoPulse} color="green" size="md" />
              <StatCard variant="card" value="23" label="Health Checks" icon={IoPulse} color="green" size="lg" />
            </div>

            <h3>Left-aligned — xs / sm / md / lg</h3>
            <div className="grid grid-cols-4 gap-3">
              <StatCard variant="left-aligned" value="99.2%" label="Availability" icon={IoCloudDone} color="green" size="xs" />
              <StatCard variant="left-aligned" value="99.2%" label="Availability" icon={IoCloudDone} color="green" size="sm" />
              <StatCard variant="left-aligned" value="99.2%" label="Availability" icon={IoCloudDone} color="green" size="md" />
              <StatCard variant="left-aligned" value="99.2%" label="Availability" icon={IoCloudDone} color="green" size="lg" />
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-2">SeverityStatCard</h3>
          <div className="grid grid-cols-4 gap-3">
            <SeverityStatCard color="red" value={3} label="Critical" />
            <SeverityStatCard color="orange" value={12} label="High" />
            <SeverityStatCard color="yellow" value={45} label="Medium" />
            <SeverityStatCard color="blue" value={89} label="Low" />
          </div>

          <MetricGrid columns={4} metrics={[
            { value: '99.9%', label: 'Uptime', icon: IoCloudDone, valueColor: 'green' },
            { value: '45ms', label: 'P95 Latency', icon: IoSpeedometer, valueColor: 'blue' },
            { value: '2.1K', label: 'Requests/s', icon: IoPulse },
            { value: 0, label: 'Errors', icon: IoShieldCheckmark, valueColor: 'green' },
          ]} />
        </div>
      </Page>

      {/* Page 3: Badges & Status */}
      <Page title="Badges & Icons" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {BADGE_STATUS_EXAMPLES.map(({ label, value, status, icon }) => (
              <Badge key={label} variant="status" status={status} label={label} value={value} icon={icon} />
            ))}
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
          <div className="flex flex-wrap gap-2">
            <Badge variant="label" label="engine" value="postgresql" color="#dbeafe" textColor="#1d4ed8" className="bg-white" />
            <Badge variant="label" label="env" value="production" color="#dcfce7" textColor="#15803d" className="bg-white" />
            <Badge variant="label" label="region" value="eu-west-1" color="#ede9fe" textColor="#6d28d9" className="bg-white" />
            <Badge variant="label" label="owner" value="platform" color="#fef3c7" textColor="#b45309" className="bg-white" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="status" status="success" label="xs" size="xs" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="success" label="sm" size="sm" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="success" label="md" size="md" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="success" label="lg" size="lg" icon={IoCheckmarkCircle} />
          </div>
          <div className="text-sm leading-6 text-gray-700">
            Healthy
            {' '}
            <Badge variant="status" status="success" label="Ready" size="xs" icon={IoCheckmarkCircle} />
            {' '}
            running on
            {' '}
            <Badge variant="outlined" label="Kubernetes" size="xs" icon={IoCube} borderColor="#326ce5" textColor="#326ce5" />
            {' '}
            with
            {' '}
            <Badge variant="custom" label="v2.4.1" size="xs" color="#eef2ff" textColor="#4338ca" borderColor="#c7d2fe" />
            .
          </div>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[28mm_1fr_28mm] bg-gray-50 border-b border-gray-200 text-[8pt] font-semibold text-gray-600">
              <div className="px-3 py-2">service</div>
              <div className="px-3 py-2">status badge</div>
              <div className="px-3 py-2">track</div>
            </div>
            <div className="grid grid-cols-[28mm_1fr_28mm] items-center min-h-[11mm] border-b border-gray-100 text-[8pt] text-gray-700">
              <div className="px-3">gateway</div>
              <div className="px-3">
                <Badge variant="status" status="success" label="Healthy" value="ready" size="sm" icon={IoCheckmarkCircle} />
              </div>
              <div className="px-3">
                <Badge variant="outlined" label="stable" size="xs" borderColor="#16a34a" textColor="#166534" />
              </div>
            </div>
            <div className="grid grid-cols-[28mm_1fr_28mm] items-center min-h-[14mm] text-[8pt] text-gray-700">
              <div className="px-3">workers</div>
              <div className="px-3">
                <Badge variant="status" status="warning" label="Degraded" value="backpressure" size="sm" icon={IoWarning} />
              </div>
              <div className="px-3">
                <Badge variant="custom" label="canary" size="xs" color="#fef3c7" textColor="#92400e" borderColor="#fcd34d" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-slate-50 p-3">
            <div className="max-w-[95mm] flex flex-wrap gap-2">
              {BADGE_FIELD_VALUE_EXAMPLES.map(([label, value]) => (
                <Badge
                  key={label}
                  variant="label"
                  label={label}
                  value={value}
                  color="#dbeafe"
                  textColor="#1d4ed8"
                  size="sm"
                  className="bg-white"
                />
              ))}
            </div>
            <div className="text-[8pt] text-gray-500 mt-2">
              Field/value badges wrap cleanly for dense metadata summaries before you need a full table.
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h4 className="text-[9pt] font-semibold text-slate-800 mb-2">Information architecture guidance</h4>
            <ul className="list-disc pl-4 space-y-1 text-[8.5pt] leading-5 text-slate-700">
              <li>Use badges for scan-first metadata and state.</li>
              <li>Keep badge labels stable so users learn the pattern quickly.</li>
              <li>Spend color on meaning, not decoration.</li>
              <li>Allow wrapping for dense summaries; switch to tables when row comparison matters.</li>
            </ul>
          </div>

          <h3 className="text-sm font-semibold text-gray-700">Shape Variants</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="status" status="success" label="Pill" shape="pill" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="warning" label="Rounded" shape="rounded" icon={IoWarning} />
            <Badge variant="status" status="error" label="Square" shape="square" icon={IoCloseCircle} />
          </div>

          <h3 className="text-sm font-semibold text-gray-700">Label + Value (Two-part)</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="metric" label="Build" value="passing" icon={IoCheckmarkCircle} />
            <Badge variant="metric" label="Coverage" value="94%" icon={IoShieldCheckmark} />
            <Badge variant="metric" label="Version" value="v2.4.1" icon={IoGitBranch} />
            <Badge variant="metric" label="Latency" value="45ms" icon={IoSpeedometer} size="sm" />
          </div>

          <h3 className="text-sm font-semibold text-gray-700">Outlined — Shapes</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outlined" label="Pill" shape="pill" borderColor="#326ce5" textColor="#326ce5" icon={IoCube} />
            <Badge variant="outlined" label="Rounded" shape="rounded" borderColor="#5468ff" textColor="#5468ff" icon={IoFlash} />
            <Badge variant="outlined" label="Square" shape="square" borderColor="#065f46" textColor="#065f46" icon={IoLockClosed} />
          </div>

          <h3 className="text-sm font-semibold text-gray-700">Label (value without bg)</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="label" label="Build" value="passing" icon={IoCheckmarkCircle} className="bg-white" />
            <Badge variant="label" label="Coverage" value="94%" icon={IoShieldCheckmark} color="#16a34a" className="bg-white" />
            <Badge variant="label" label="Version" value="v2.4.1" icon={IoGitBranch} color="#4338ca" textColor="#fff" className="bg-white" />
            <Badge variant="label" label="Latency" value="45ms" icon={IoSpeedometer} color="#0369a1" size="sm" className="bg-white" />
            <Badge variant="label" label="Status" value="Deployed" icon={IoRocket} color="#be185d" size="lg" shape="rounded" className="bg-white" />
          </div>

          <h3 className="text-sm font-semibold text-gray-700">Custom Color Matrix</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="custom" color="#dbeafe" textColor="#1e40af" label="Info" icon={IoInformationCircle} shape="pill" />
            <Badge variant="custom" color="#fef3c7" textColor="#92400e" label="Caution" icon={IoWarning} shape="rounded" />
            <Badge variant="custom" color="#fce7f3" textColor="#9d174d" label="Hotfix" icon={IoFlash} shape="pill" size="sm" />
            <Badge variant="custom" color="#d1fae5" textColor="#065f46" label="Deployed" icon={IoRocket} shape="rounded" size="lg" />
            <Badge variant="custom" color="#ede9fe" textColor="#5b21b6" label="Preview" icon={IoSparkles} shape="square" />
            <Badge variant="custom" color="#fee2e2" textColor="#991b1b" borderColor="#fca5a5" label="Expired" icon={IoTime} />
          </div>

          <div className="flex flex-wrap gap-4">
            <Status status="healthy" />
            <Status status="unhealthy" />
            <Status status="warning" />
            <Status status="unknown" />
          </div>
        </div>
      </Page>

      {/* Page 4: Gauges & Progress */}
      <Page title="Gauges & Progress" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
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

      {/* Page 5: New Components — MatrixTable, Heatmap, DynamicTable */}
      <Page title="Matrix, Heatmap & Dynamic Table" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-6">
          <Section variant="hero" title="Access Matrix" size="sm">
            <MatrixTable
              columnWidth={7}
              headerHeight={16}
              cornerContent="Resource / Role"
              columns={matrixColumns.map((c) => c)}
              rows={matrixRows.map((r) => ({
                label: <span className="text-[7pt] font-medium">{r.label}</span>,
                cells: r.cells.map((c) => c ? <Dot color={c === 'direct' ? Theme.Health.Healthy : Theme.Purpose.Primary} outline={c === 'group'} /> : null),
              }))}
            />
          </Section>

          <Section variant="hero" title="Backup Heatmap — Calendar" size="sm">
            <Heatmap values={heatmapData} variant="calendar" />
          </Section>

          <Section variant="hero" title="Backup Heatmap — Compact" size="sm">
            <Heatmap values={heatmapData} variant="compact" />
          </Section>

          <Section variant="hero" title="Service Status (DynamicTable)" size="sm">
            <DynamicTable columns={dynamicColumns} rows={dynamicRows} size="sm" />
          </Section>
        </div>
      </Page>

      {/* Page 6: Section Variants, Format, BulletList, Steps */}
      <Page title="Sections, Format & Content" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-6">
          <Section variant="dashboard" title="Dashboard Section" subtitle="With metric sidebar"
            metric={<span className="text-[18pt] font-bold" style={{ color: Theme.Health.Healthy }}>99.9%</span>}
            description="Section variant='dashboard' shows title + metric header, with description and children below.">
            <div className="grid grid-cols-3 gap-3">
              <StatCard variant="bordered" value="156" label="Items" color="blue" size="sm" />
              <StatCard variant="bordered" value="23" label="Checks" color="green" size="sm" />
              <StatCard variant="bordered" value="3" label="Alerts" color="red" size="sm" />
            </div>
          </Section>

          <Section variant="card-grid" title="Card Grid" columns={3}>
            <div className="bg-blue-50 p-[3mm] rounded">
              <h4 className="font-semibold">Scraping</h4>
              <p className="text-[8pt] text-gray-600">Config discovery</p>
            </div>
            <div className="bg-green-50 p-[3mm] rounded">
              <h4 className="font-semibold">Health Checks</h4>
              <p className="text-[8pt] text-gray-600">Canary monitoring</p>
            </div>
            <div className="bg-purple-50 p-[3mm] rounded">
              <h4 className="font-semibold">Playbooks</h4>
              <p className="text-[8pt] text-gray-600">Automated remediation</p>
            </div>
          </Section>

          <h3>Format Component</h3>
          <div className="flex flex-wrap gap-4 text-[9pt]">
            <span>Bytes: <Format type="bytes" value={1073741824} /></span>
            <span>Duration: <Format type="duration" value={86400000} /></span>
            <span>Millicores: <Format type="millicores" value={2500} /></span>
            <span>Percent: <Format type="percent" value={99.95} precision={1} /></span>
            <span>Date: <Format type="date" value="2026-03-15T10:30:00Z" /></span>
          </div>

          <BulletList variant="definition" items={bulletItems} size="sm" />

          <Steps steps={[
            { title: 'Install', description: 'helm install mission-control flanksource/mission-control' },
            { title: 'Configure', description: 'Apply scraper and canary CRDs' },
            { title: 'Monitor', description: 'View dashboards and set up notifications' },
          ]} />
        </div>
      </Page>

      {/* Page 7: Code, Comparison, Tables */}
      <Page title="Code, Comparison & Tables" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-6">
          <Section variant="hero" title="Configuration Example" size="sm">
            <SyntaxHighlighter code={codeExample} language="yaml" />
          </Section>

          <Section variant="hero" title="Change Log (ListTable)" size="sm">
            <ListTable
              rows={changeLog}
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
              size="sm"
            />
          </Section>

          <ComparisonTable
            pros={['Unified platform view', 'GitOps native', 'Self-hosted option', 'Open source core']}
            cons={['Kubernetes only', 'Requires PostgreSQL', 'Learning curve for CRDs']}
            prosTitle="Strengths"
            consTitle="Limitations"
          />

          <CompactTable variant="compact" title="System Requirements" data={compactData} />
          <CompactTable variant="reference" title="MCP Tools" columns={['Tool Name', 'Purpose', 'Example']} data={referenceData} />
          <SecurityChecksTable checks={securityChecks} />
          <LogoGrid variant="table" title="Integrations" logos={logos} />
        </div>
      </Page>

      {/* Page 8: Alerts, Vulnerabilities & More */}
      <Page title="Alerts & Security" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-6">
          <Section variant="hero" title="Active Alerts" size="sm">
            <AlertsTable alerts={alertsData} />
          </Section>

          <VulnerabilityBreakdown data={vulnerabilityData} projectName="mission-control" githubUrl="https://github.com/flanksource/mission-control" />

          <Section variant="hero" title="ListTable — Density (minimal)" size="sm">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <h4>compact</h4>
                <ListTable rows={changeLog.slice(0, 4)} subject="type" body="summary" primaryTags={['severity']} size="xs" density="compact" />
              </div>
              <div>
                <h4>normal</h4>
                <ListTable rows={changeLog.slice(0, 4)} subject="type" body="summary" primaryTags={['severity']} size="xs" density="normal" />
              </div>
              <div>
                <h4>comfortable</h4>
                <ListTable rows={changeLog.slice(0, 4)} subject="type" body="summary" primaryTags={['severity']} size="xs" density="comfortable" />
              </div>
            </div>
          </Section>

          <Section variant="hero" title="ListTable — Density (full features)" size="sm">
            <div className="space-y-4">
              <div>
                <h4>compact</h4>
                <ListTable
                  rows={changeLog.slice(0, 4)}
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
                  density="compact"
                />
              </div>
              <div>
                <h4>normal</h4>
                <ListTable
                  rows={changeLog.slice(0, 4)}
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
                  density="normal"
                />
              </div>
              <div>
                <h4>comfortable</h4>
                <ListTable
                  rows={changeLog.slice(0, 4)}
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
                  density="comfortable"
                />
              </div>
            </div>
          </Section>
        </div>
      </Page>

      {/* Page 9: Avatars, KPI, Terminal */}
      <Page title="Additional Components" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-6">
          <Section variant="hero" title="Avatars & Badges" size="sm">
            <div className="flex items-center gap-4">
              <Avatar name="Alice Johnson" size="sm" />
              <Avatar name="Bob Smith" size="md" />
              <Avatar name="Charlie Brown" size="lg" />
              <AvatarGroup users={[
                { name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' },
                { name: 'Diana' }, { name: 'Eve' },
              ]} max={3} />
              <CountBadge value={42} />
              <CountBadge value={7} colorClass="bg-yellow-100 text-yellow-800" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Age from="2026-03-28T10:30:00Z" />
              <span className="text-gray-400">|</span>
              <Age from="2026-03-01T00:00:00Z" />
            </div>
          </Section>

          <Section variant="hero" title="AI Model Cards" size="sm">
            <div className="grid grid-cols-3 gap-3">
              <AIModelCard name="GPT-4o" model="gpt-4o-2024-08-06" tokensUsed={1_254_300} cost={3.42} icon={SiOpenai} variant="bordered" />
              <AIModelCard name="Claude 3.5 Sonnet" model="claude-3-5-sonnet-20241022" tokensUsed={842_000} cost={1.87} icon={IoSparkles} variant="bordered" />
              <AIModelCard name="GPT-4o Mini" model="gpt-4o-mini" tokensUsed={5_230_000} cost={0.52} icon={SiOpenai} variant="bordered" />
            </div>
          </Section>

          <KpiComparison
            label="Deployment Frequency"
            before={{ value: 2, displayValue: '2/week' }}
            after={{ value: 12, displayValue: '12/week' }}
            improvement={500}
          />

          <Section variant="hero" title="Terminal Output" size="sm">
            <TerminalOutput>
              {'$ kubectl get pods -n mission-control\nNAME                              READY   STATUS    RESTARTS   AGE\nmission-control-7d4f8b6c9-x2k4m   1/1     Running   0          2d\ncanary-checker-5c9d7b8f6-n8j2p     1/1     Running   0          2d\nconfig-db-6b8f9c7d4-m3k5n          1/1     Running   0          5d'}
            </TerminalOutput>
          </Section>

          <Section variant="hero" title="Query Response" size="sm">
            <QueryResponseTerminal
              userQuery="Show all unhealthy pods in production"
              aiResponse="Found 2 unhealthy pods:\n  - api-gateway-7d4f8 (CrashLoopBackOff)\n  - worker-pool-5c9d7 (OOMKilled)"
              mcpTools={[{ tool: 'search_catalog', args: 'type=Pod health=unhealthy' }]}
            />
          </Section>
        </div>
      </Page>

      {/* Page 10: Summary */}
      <Page title="Summary" product="Mission Control" watermark="DRAFT" margins={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        <div className="space-y-4">
          <CompactTable variant="inline" title="Document Info" data={releaseData} />
          <CompactTable variant="compact" title="Large (md)" data={compactData} size="md" />
          <SpecificationTable title="Technical Specs (base)" specifications={specifications} size="base" />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
