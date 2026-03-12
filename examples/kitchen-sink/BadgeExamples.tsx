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

export default function BadgeExamples() {
  return (
    <DatasheetTemplate title="Badge & Icon Examples" css="">
      <FlanksourceHeader variant="solid" title="Component Showcase" subtitle="Badges" />
      <FlanksourceFooter variant="compact" />

      <Page title="Badge Variants" margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">status</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="status" status="success" label="Healthy" icon={IoCheckmarkCircle} />
              <Badge variant="status" status="warning" label="Degraded" icon={IoWarning} />
              <Badge variant="status" status="error" label="Failed" icon={IoCloseCircle} />
              <Badge variant="status" status="info" label="Pending" icon={IoInformationCircle} />
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
