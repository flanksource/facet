import {
  DatasheetTemplate,
  Page,
  Badge,
  Status,
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
} from 'react-icons/io5';
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';

const STATUS_BADGES = [
  { label: 'Healthy', value: 'ready', status: 'success' as const, icon: IoCheckmarkCircle },
  { label: 'Degraded', value: 'latency', status: 'warning' as const, icon: IoWarning },
  { label: 'Failed', value: 'blocked', status: 'error' as const, icon: IoCloseCircle },
  { label: 'Pending', value: 'queued', status: 'info' as const, icon: IoInformationCircle },
] as const;

const FIELD_VALUE_BADGES = [
  ['engine', 'postgresql'],
  ['env', 'production'],
  ['region', 'eu-west-1'],
  ['tier', 'critical'],
  ['owner', 'platform'],
  ['cluster', 'mission-control'],
  ['backup', 'nightly'],
  ['retention', '35d'],
  ['replicas', '3'],
  ['cost-center', 'infra-ops'],
] as const;

const WRAPPING_BADGES = [
  ['container', 'flanksource/incident-commander'],
  ['image', 'flanksource/incident-commander:v1.4.200-build.12'],
  ['from', 'sha256:42e5e2378f81f1b8d0355ab5b12a47f3'],
  ['to', 'sha256:8cd15af2d1364a5cb4f8df25e7c6291e'],
] as const;

export default function BadgeExamples() {
  return (
    <DatasheetTemplate title="Badge & Icon Examples" css="">
      <FlanksourceHeader variant="solid" title="Component Showcase" subtitle="Badges" />
      <FlanksourceFooter variant="compact" />

      <Page title="Report-Scale Badge Patterns" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">semantic status</h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_BADGES.map(({ label, value, status, icon }) => (
                <Badge
                  key={label}
                  variant="status"
                  status={status}
                  label={label}
                  value={value}
                  icon={icon}
                  size="xs"
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">custom outlined colors without semantic status</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outlined" label="Kubernetes" icon={IoCube} borderColor="#326ce5" textColor="#326ce5" size="xs" />
              <Badge variant="outlined" label="Helm" borderColor="#0f1689" textColor="#0f1689" size="xs" />
              <Badge variant="outlined" label="Flux" borderColor="#5468ff" textColor="#5468ff" size="xs" />
              <Badge variant="outlined" label="ArgoCD" borderColor="#ef7b4d" textColor="#ef7b4d" size="xs" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">split label and value styling hooks</h3>
            <div className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-lg">
              <Badge
                variant="label"
                label="container"
                value="incident-commander"
                color="#dbeafe"
                textColor="#1d4ed8"
                size="xs"
                className="bg-white"
                labelClassName="uppercase tracking-[0.03em]"
                valueClassName="font-mono text-slate-800"
              />
              <Badge
                variant="label"
                label="namespace"
                value="mc"
                color="#dcfce7"
                textColor="#15803d"
                size="xs"
                className="bg-white"
                labelClassName="uppercase tracking-[0.03em]"
                valueClassName="font-semibold text-slate-800"
              />
              <Badge
                variant="label"
                label="strategy"
                value="rolling"
                color="#ede9fe"
                textColor="#6d28d9"
                size="xs"
                className="bg-white"
                labelClassName="uppercase tracking-[0.03em]"
                valueClassName="font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">sizes (xxs / xs / sm / md / lg)</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="status" status="success" label="xxs" size="xxs" icon={IoCheckmarkCircle} />
              <Badge variant="status" status="success" label="xs" size="xs" icon={IoCheckmarkCircle} />
              <Badge variant="status" status="success" label="sm" size="sm" icon={IoCheckmarkCircle} />
              <Badge variant="status" status="success" label="md" size="md" icon={IoCheckmarkCircle} />
              <Badge variant="status" status="success" label="lg" size="lg" icon={IoCheckmarkCircle} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">shapes</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="status" status="info" label="pill" shape="pill" size="xs" icon={IoShieldCheckmark} />
              <Badge variant="status" status="info" label="rounded" shape="rounded" size="xs" icon={IoShieldCheckmark} />
              <Badge variant="status" status="info" label="square" shape="square" size="xs" icon={IoShieldCheckmark} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">status indicators</h3>
            <div className="flex flex-wrap gap-4">
              <Status status="healthy" />
              <Status status="unhealthy" />
              <Status status="warning" />
              <Status status="unknown" />
            </div>
          </div>
        </div>
      </Page>

      <Page title="Dense Metadata & Wrapping" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">inline narrative flow</h3>
            <div className="space-y-2 text-sm leading-6 text-gray-700">
              <p>
                Deployment
                {' '}
                <Badge variant="custom" label="incident-commander" size="xxs" color="#eff6ff" textColor="#1d4ed8" borderColor="#bfdbfe" />
                {' '}
                rolled from
                {' '}
                <Badge variant="custom" label="v1.4.190" size="xxs" color="#fef2f2" textColor="#b91c1c" borderColor="#fecaca" />
                {' '}
                to
                {' '}
                <Badge variant="custom" label="v1.4.200" size="xxs" color="#ecfdf5" textColor="#15803d" borderColor="#bbf7d0" />
                {' '}
                via
                {' '}
                <Badge variant="outlined" label="ArgoCD" size="xxs" borderColor="#ef7b4d" textColor="#ef7b4d" />
                {' '}
                in
                {' '}
                <Badge
                  variant="label"
                  label="namespace"
                  value="mc"
                  size="xxs"
                  color="#dbeafe"
                  textColor="#1d4ed8"
                  className="bg-white"
                />
                .
              </p>
              <p>This is the target pattern for report rows that mix prose and many small metadata chips.</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">wrapped xxs badges for long values</h3>
            <div className="rounded-lg border border-gray-200 bg-slate-50 p-3">
              <div className="max-w-[95mm] flex flex-wrap gap-2">
                {WRAPPING_BADGES.map(([label, value], index) => (
                  <Badge
                    key={`${label}-${index}`}
                    variant="label"
                    label={label}
                    value={value}
                    color={label === 'to' ? '#dcfce7' : '#dbeafe'}
                    textColor={label === 'to' ? '#15803d' : '#1d4ed8'}
                    size="xxs"
                    wrap
                    className="bg-white max-w-[42mm]"
                    labelClassName="uppercase tracking-[0.03em]"
                    valueClassName="font-mono"
                  />
                ))}
              </div>
              <div className="text-[8pt] text-gray-500 mt-2">
                Use <code>wrap</code> when dense metadata must stay badge-shaped but long values cannot remain single-line.
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">dense field:value bands</h3>
            <div className="rounded-lg border border-gray-200 bg-slate-50 p-3">
              <div className="max-w-[95mm] flex flex-wrap gap-2">
                {FIELD_VALUE_BADGES.map(([label, value]) => (
                  <Badge
                    key={label}
                    variant="label"
                    label={label}
                    value={value}
                    color="#dbeafe"
                    textColor="#1d4ed8"
                    size="xxs"
                    className="bg-white"
                    labelClassName="uppercase tracking-[0.03em]"
                    valueClassName="font-medium text-slate-800"
                  />
                ))}
              </div>
              <div className="text-[8pt] text-gray-500 mt-2">
                Let compact metadata wrap across lines before switching to a table.
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">table cell density</h3>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-[30mm_1fr_32mm] bg-gray-50 border-b border-gray-200 text-[8pt] font-semibold text-gray-600">
                <div className="px-3 py-2">service</div>
                <div className="px-3 py-2">status</div>
                <div className="px-3 py-2">version</div>
              </div>
              <div className="grid grid-cols-[30mm_1fr_32mm] items-center min-h-[11mm] border-b border-gray-100 text-[8pt] text-gray-700">
                <div className="px-3">api-gateway</div>
                <div className="px-3">
                  <Badge variant="status" status="success" label="Healthy" value="ready" size="xs" icon={IoCheckmarkCircle} />
                </div>
                <div className="px-3">
                  <Badge variant="custom" label="v2.4.1" size="xs" color="#eef2ff" textColor="#4338ca" borderColor="#c7d2fe" />
                </div>
              </div>
              <div className="grid grid-cols-[30mm_1fr_32mm] items-center min-h-[11mm] text-[8pt] text-gray-700">
                <div className="px-3">worker-pool</div>
                <div className="px-3">
                  <Badge variant="status" status="warning" label="Degraded" value="backpressure" size="xs" icon={IoWarning} />
                </div>
                <div className="px-3">
                  <Badge variant="outlined" label="canary" size="xs" borderColor="#f59e0b" textColor="#b45309" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">clickable badges</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outlined" label="Docs" size="xs" href="https://flanksource.com" target="_blank" borderColor="#326ce5" textColor="#326ce5" />
              <Badge variant="custom" label="release notes" size="xs" href="#release-notes" color="#f5f3ff" textColor="#6d28d9" borderColor="#ddd6fe" />
              <Badge variant="label" label="run" value="3482" size="xs" href="#run-3482" className="bg-white" color="#dbeafe" textColor="#1d4ed8" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">best practices</h3>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <ul className="list-disc pl-4 space-y-1 text-[8.5pt] leading-5 text-slate-700">
                <li>Use badges for scan-friendly metadata and state, not for long explanations.</li>
                <li>Reserve stronger color for semantics like risk, state, or workflow stage.</li>
                <li>Prefer `size=&quot;xs&quot;` for report rows that mix prose with many metadata tokens.</li>
                <li>Use split `label | value` badges when the field name should stay stable across repeated rows.</li>
                <li>Turn on <code>wrap</code> before introducing custom CSS hacks for long metadata values.</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">icons in custom and metric variants</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="metric" label="CPU" value="42%" icon={IoPulse} size="xs" />
              <Badge variant="metric" label="Memory" value="8.2 GB" icon={IoServer} size="xs" />
              <Badge variant="metric" label="Uptime" value="99.9%" icon={IoCloudDone} size="xs" />
              <Badge variant="metric" label="Latency" value="12ms" icon={IoTime} size="xs" />
              <Badge variant="custom" color="#fdf2f8" textColor="#be185d" label="Production" icon={IoRocket} size="xs" />
              <Badge variant="custom" color="#ecfdf5" textColor="#065f46" label="Secured" icon={IoLockClosed} size="xs" />
              <Badge variant="custom" color="#fffbeb" textColor="#92400e" label="Beta" icon={IoFlash} size="xs" />
              <Badge variant="custom" color="#eef2ff" textColor="#4338ca" label="v2.4.1" icon={IoGitBranch} size="xs" />
            </div>
          </div>
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
