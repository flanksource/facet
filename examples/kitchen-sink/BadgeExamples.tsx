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

export default function BadgeExamples() {
  return (
    <DatasheetTemplate title="Badge & Icon Examples" css="">
      <FlanksourceHeader variant="solid" title="Component Showcase" subtitle="Badges" />
      <FlanksourceFooter variant="compact" />

      <Page title="Badge Variants" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">status icons</h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_BADGES.map(({ label, value, status, icon }) => (
                <Badge key={label} variant="status" status={status} label={label} value={value} icon={icon} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">metric (label + value)</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="metric" label="CPU" value="42%" icon={IoPulse} />
              <Badge variant="metric" label="Memory" value="8.2 GB" icon={IoServer} />
              <Badge variant="metric" label="Uptime" value="99.9%" icon={IoCloudDone} />
              <Badge variant="metric" label="Latency" value="12ms" icon={IoTime} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">custom colors</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="custom" color="#eef2ff" textColor="#4338ca" label="v2.4.1" icon={IoGitBranch} />
              <Badge variant="custom" color="#fdf2f8" textColor="#be185d" label="Production" icon={IoRocket} />
              <Badge variant="custom" color="#ecfdf5" textColor="#065f46" label="Secured" icon={IoLockClosed} />
              <Badge variant="custom" color="#fffbeb" textColor="#92400e" label="Beta" icon={IoFlash} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">outlined</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outlined" label="Kubernetes" icon={IoCube} borderColor="#326ce5" textColor="#326ce5" />
              <Badge variant="outlined" label="Helm" borderColor="#0f1689" textColor="#0f1689" />
              <Badge variant="outlined" label="Flux" borderColor="#5468ff" textColor="#5468ff" />
              <Badge variant="outlined" label="ArgoCD" borderColor="#ef7b4d" textColor="#ef7b4d" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">label variant (white background)</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="label" label="engine" value="postgresql" color="#dbeafe" textColor="#1d4ed8" className="bg-white" />
              <Badge variant="label" label="env" value="production" color="#dcfce7" textColor="#15803d" className="bg-white" />
              <Badge variant="label" label="region" value="eu-west-1" color="#ede9fe" textColor="#6d28d9" className="bg-white" />
              <Badge variant="label" label="owner" value="platform" color="#fef3c7" textColor="#b45309" className="bg-white" />
            </div>
          </div>
        </div>
      </Page>

      <Page title="Sizes, Shapes & Icons" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">sizes (xs / sm / md / lg)</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="status" status="success" label="xs" size="xs" icon={IoCheckmarkCircle} />
              <Badge variant="status" status="success" label="sm" size="sm" icon={IoCheckmarkCircle} />
              <Badge variant="status" status="success" label="md" size="md" icon={IoCheckmarkCircle} />
              <Badge variant="status" status="success" label="lg" size="lg" icon={IoCheckmarkCircle} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">inline flow / line height</h3>
            <div className="space-y-2 text-sm leading-6 text-gray-700">
              <p>
                Healthy service
                {' '}
                <Badge variant="status" status="success" label="Healthy" size="xs" icon={IoCheckmarkCircle} />
                {' '}
                deployed with
                {' '}
                <Badge variant="outlined" label="Flux" size="xs" borderColor="#5468ff" textColor="#5468ff" />
                {' '}
                and
                {' '}
                <Badge variant="custom" label="v2.4.1" size="xs" color="#eef2ff" textColor="#4338ca" borderColor="#c7d2fe" />
                .
              </p>
              <p>This row keeps the text baseline stable while the badges respect their own size and padding.</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">forced row height / table cells</h3>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-[30mm_1fr_30mm] bg-gray-50 border-b border-gray-200 text-[8pt] font-semibold text-gray-600">
                <div className="px-3 py-2">service</div>
                <div className="px-3 py-2">status badge</div>
                <div className="px-3 py-2">version</div>
              </div>
              <div className="grid grid-cols-[30mm_1fr_30mm] items-center min-h-[11mm] border-b border-gray-100 text-[8pt] text-gray-700">
                <div className="px-3">api-gateway</div>
                <div className="px-3">
                  <Badge variant="status" status="success" label="Healthy" value="ready" size="sm" icon={IoCheckmarkCircle} />
                </div>
                <div className="px-3">
                  <Badge variant="custom" label="v2.4.1" size="xs" color="#eef2ff" textColor="#4338ca" borderColor="#c7d2fe" />
                </div>
              </div>
              <div className="grid grid-cols-[30mm_1fr_30mm] items-center min-h-[14mm] text-[8pt] text-gray-700">
                <div className="px-3">worker-pool</div>
                <div className="px-3">
                  <Badge variant="status" status="warning" label="Degraded" value="backpressure" size="sm" icon={IoWarning} />
                </div>
                <div className="px-3">
                  <Badge variant="outlined" label="canary" size="xs" borderColor="#f59e0b" textColor="#b45309" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">multiline field:value sets</h3>
            <div className="rounded-lg border border-gray-200 bg-slate-50 p-3">
              <div className="max-w-[92mm] flex flex-wrap gap-2">
                {FIELD_VALUE_BADGES.map(([label, value]) => (
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
                Use this pattern when metadata needs to wrap across multiple lines but should still stay scan-friendly.
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">best practices</h3>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <ul className="list-disc pl-4 space-y-1 text-[8.5pt] leading-5 text-slate-700">
                <li>Use badges for scan-friendly metadata and state, not for sentences or explanations.</li>
                <li>Reserve color for meaning. Status and risk deserve color; routine field/value metadata usually does not.</li>
                <li>Keep label terms stable and short so repeated badges form a recognizable pattern across pages.</li>
                <li>Prefer badges for 4 to 8 key facts. When metadata becomes dense, allow wrapping or move to a table.</li>
                <li>Use tables when comparison across rows matters more than quick scanning of individual facts.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">shapes (pill / rounded / square)</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="status" status="info" label="pill" shape="pill" icon={IoShieldCheckmark} />
              <Badge variant="status" status="info" label="rounded" shape="rounded" icon={IoShieldCheckmark} />
              <Badge variant="status" status="info" label="square" shape="square" icon={IoShieldCheckmark} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Status indicators</h3>
            <div className="flex flex-wrap gap-4">
              <Status status="healthy" />
              <Status status="unhealthy" />
              <Status status="warning" />
              <Status status="unknown" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Icons at different sizes</h3>
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
        </div>
      </Page>
    </DatasheetTemplate>
  );
}
