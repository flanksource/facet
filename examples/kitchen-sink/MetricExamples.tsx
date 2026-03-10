import {
  DatasheetTemplate,
  Page,
  Header,
  Footer,
  PageBreak,
  Gauge,
  ScoreGauge,
  ProgressBar,
  MetricHeader,
} from '@flanksource/facet';

export default function MetricExamples() {
  return (
    <DatasheetTemplate title="Metric Examples" css="">
      {/* Page 1: Gauges */}
      <Page
        title="Gauges"
        header={<Header variant="solid" title="Component Showcase" subtitle="Gauges & Scores" />}
        headerHeight={18}
        footer={<Footer variant="compact" />}
        footerHeight={10}
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Gauge</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <Gauge value={85} minValue={0} maxValue={100} units="%" arcColor="#16a34a" width="8em" />
              <Gauge value={62} minValue={0} maxValue={100} units="%" arcColor="#eab308" width="8em" />
              <Gauge value={23} minValue={0} maxValue={100} units="%" arcColor="#dc2626" width="8em" />
              <Gauge value={7.8} minValue={0} maxValue={10} arcColor="#16a34a" width="8em" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">ScoreGauge (sm / md / lg)</h3>
            <div className="flex flex-wrap gap-6 items-end">
              <ScoreGauge score={8.5} label="Security" size="sm" />
              <ScoreGauge score={5.2} label="Maintenance" size="sm" />
              <ScoreGauge score={2.1} label="Vulnerabilities" size="sm" />
              <ScoreGauge score={9.1} label="Overall" size="md" />
              <ScoreGauge score={7.4} label="Code Review" size="lg" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">MetricHeader — gauge</h3>
            <MetricHeader variant="gauge" title="Security Score" subtitle="OpenSSF Scorecard" score={8.5} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">MetricHeader — comparison</h3>
            <MetricHeader
              variant="comparison"
              title="Time to Ascertain Service Health"
              subtitle="Average time to gather complete service health picture"
              before={{ value: 330, unit: 'seconds' }}
              after={{ value: 45, unit: 'seconds' }}
            />
          </div>
        </div>
      </Page>

      <PageBreak />

      {/* Page 2: ProgressBars */}
      <Page
        title="Progress Bars"
        header={<Header variant="default" title="Component Showcase" subtitle="Progress Bars" />}
        headerHeight={18}
        footer={<Footer variant="minimal" />}
        footerHeight={8}
        margins={{ top: 5, bottom: 5 }}
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">variants</h3>
            <div className="space-y-3">
              <ProgressBar title="CPU Usage" percentage={65} variant="primary" />
              <ProgressBar title="Memory" percentage={82} variant="warning" />
              <ProgressBar title="Disk" percentage={45} variant="success" />
              <ProgressBar title="Network Errors" percentage={12} variant="danger" />
              <ProgressBar title="Cache Hit Rate" percentage={94} variant="info" />
              <ProgressBar title="Queue Depth" percentage={30} variant="gray" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">sizes (sm / md / lg)</h3>
            <div className="space-y-3">
              <ProgressBar title="Small" percentage={70} variant="primary" size="sm" />
              <ProgressBar title="Medium" percentage={70} variant="primary" size="md" />
              <ProgressBar title="Large" percentage={70} variant="primary" size="lg" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">custom display values</h3>
            <div className="space-y-3">
              <ProgressBar title="SLA" percentage={99.9} displayValue="99.9% (target: 99.5%)" variant="success" />
              <ProgressBar title="Budget Used" percentage={73} displayValue="$73K / $100K" variant="warning" />
              <ProgressBar title="Sprint Progress" percentage={60} displayValue="6 of 10 stories" variant="info" />
            </div>
          </div>
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
