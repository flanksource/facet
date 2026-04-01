import {
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

          <Section variant="hero" title="ListTable Density" size="sm">
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
