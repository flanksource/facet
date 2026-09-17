// @live
// Fan-in/Fan-out style: stacked source boxes → central Mission Control anchor box →
// stacked outputs. Converging arrows spread along the hub edge with offset anchors.
// Ported from website-migration/common/src/components/AuditDiagram.tsx.
// Render: facet html fan-in-fan-out.tsx -o dist
import React from 'react';
import { Page, Section, Diagram, BoxNode, Arrow, NodePill, COLORS } from '@flanksource/facet';
import {
  Aws, Azure, K8S, GoogleCloud, Postgres, AzureAd, AwsCloudtrail, SqlServer, MissionControlWhite,
} from '@flanksource/icons/mi';
import { HiUserGroup, HiShieldCheck, HiKey } from 'react-icons/hi2';
import { FaHistory } from 'react-icons/fa';

type IconComponent = React.ComponentType<{ className?: string }>;

// Recipe (not a facet primitive): platform icon grid inside a box body.
function IconGrid({ items, cols = 3, iconSize = 'w-6 h-6' }: {
  items: Array<{ Icon: IconComponent; label?: string }>;
  cols?: number;
  iconSize?: string;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map(({ Icon, label }, idx) => (
        <div key={label || idx} className="flex flex-col items-center">
          <Icon className={iconSize} />
          {label && <span className="text-[9px] mt-0.5" style={{ color: COLORS.muted }}>{label}</span>}
        </div>
      ))}
    </div>
  );
}

function SourceBox({ id, title, headerColor = COLORS.primary, children }: {
  id: string; title: string; headerColor?: string; children: React.ReactNode;
}) {
  return (
    <BoxNode id={id} title={title} headerColor={headerColor} bodyColor={COLORS.background} borderColor={headerColor}>
      {children}
    </BoxNode>
  );
}

// Recipe: the visually heavier Mission Control anchor box (rounded-2xl, shadow-2xl,
// large title, catalog-pill grid body).
function MissionControlCatalogBox({ id }: { id: string }) {
  return (
    <div id={id} className="rounded-2xl overflow-hidden border-2 shadow-2xl"
      style={{ borderColor: COLORS.primary, backgroundColor: COLORS.background }}>
      <div className="px-6 py-3 text-center" style={{ backgroundColor: COLORS.primary }}>
        <div className="flex items-center justify-center gap-2">
          <MissionControlWhite className="w-6 h-6 text-white" />
          <span className="text-white text-lg font-bold tracking-wide">Mission Control</span>
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {[
          { Icon: HiUserGroup, label: 'Users & Groups' },
          { Icon: HiShieldCheck, label: 'Roles & Policies' },
          { Icon: FaHistory, label: 'Changes & Events' },
          { Icon: HiKey, label: 'Access Records' },
        ].map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-2 rounded-lg px-3 py-2 border"
            style={{ backgroundColor: COLORS.background, borderColor: COLORS.primary }}>
            <Icon className="w-4 h-4" style={{ color: COLORS.accent }} />
            <span className="text-xs font-medium" style={{ color: COLORS.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputBox({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <BoxNode id={id} title={title} headerColor={COLORS.primary} bodyColor={COLORS.background}
      borderColor={COLORS.primary} compact>
      <div className="flex flex-col gap-1">
        {items.map((item) => <NodePill key={item}>{item}</NodePill>)}
      </div>
    </BoxNode>
  );
}

export default function FanInFanOutDiagram() {
  return (
    <Page>
      <Section title="Audit Sources and Outputs">
        <Diagram className="relative">
          {(id) => (
            <>
              <div className="flex items-start justify-center gap-16 py-8">
                {/* Left: sources stacked (max 3-4 per column) */}
                <div className="flex flex-col items-center gap-6">
                  <SourceBox id={id('identity')} title="Identity Providers">
                    <IconGrid iconSize="w-7 h-7" items={[
                      { Icon: AzureAd, label: 'Entra ID' },
                      { Icon: Aws, label: 'AWS IAM' },
                      { Icon: K8S, label: 'K8s RBAC' },
                    ]} />
                  </SourceBox>
                  <SourceBox id={id('logins')} title="User Logins">
                    <IconGrid items={[
                      { Icon: AzureAd, label: 'Entra ID' },
                      { Icon: AwsCloudtrail, label: 'CloudTrail' },
                      { Icon: Postgres, label: 'DB Logs' },
                    ]} />
                  </SourceBox>
                  {/* Muted header marks a lower-priority source */}
                  <SourceBox id={id('infra')} title="Infrastructure" headerColor={COLORS.muted}>
                    <IconGrid cols={4} items={[
                      { Icon: Aws, label: 'AWS' },
                      { Icon: Azure, label: 'Azure' },
                      { Icon: GoogleCloud, label: 'GCP' },
                      { Icon: K8S, label: 'K8s' },
                    ]} />
                  </SourceBox>
                  <SourceBox id={id('data')} title="Data Sources">
                    <IconGrid items={[
                      { Icon: Postgres, label: 'Postgres' },
                      { Icon: SqlServer, label: 'SQL Server' },
                      { Icon: AwsCloudtrail, label: 'CloudTrail' },
                    ]} />
                  </SourceBox>
                </div>

                {/* Center: the hub, vertically centered against the taller columns */}
                <div className="flex items-center" style={{ minHeight: '420px' }}>
                  <MissionControlCatalogBox id={id('catalog')} />
                </div>

                {/* Right: outputs stacked */}
                <div className="flex items-center" style={{ minHeight: '420px' }}>
                  <div className="flex flex-col items-center gap-4">
                    <OutputBox id={id('app')} title="Application CRD" items={['Access Control', 'Backups', 'Environments']} />
                    <OutputBox id={id('views')} title="Audit Views" items={['Inventory', 'Change Trail', 'Access Summary']} />
                    <OutputBox id={id('alerts')} title="Notifications" items={['Config Changes', 'Access Anomalies', 'Backup Failures']} />
                  </div>
                </div>
              </div>

              {/* Fan-in: spread endpoints along the hub's left edge so arrows don't pile up */}
              <Arrow variant="primary" from={id('identity')} to={id('catalog')} path="straight"
                startAnchor="right" endAnchor={{ position: 'left', offset: { y: -40 } }} />
              <Arrow variant="primary" from={id('logins')} to={id('catalog')} path="straight"
                startAnchor="right" endAnchor={{ position: 'left', offset: { y: -15 } }} />
              <Arrow variant="secondary" from={id('infra')} to={id('catalog')} path="straight"
                startAnchor="right" endAnchor={{ position: 'left', offset: { y: 15 } }} />
              <Arrow variant="primary" from={id('data')} to={id('catalog')} path="straight"
                startAnchor="right" endAnchor={{ position: 'left', offset: { y: 40 } }} />

              {/* Fan-out: spread start points along the hub's right edge, mirroring the fan-in side */}
              <Arrow variant="primary" from={id('catalog')} to={id('app')} path="straight"
                startAnchor={{ position: 'right', offset: { y: -40 } }} endAnchor="left" />
              <Arrow variant="primary" from={id('catalog')} to={id('views')} path="straight"
                startAnchor="right" endAnchor="left" />
              <Arrow variant="primary" from={id('catalog')} to={id('alerts')} path="straight"
                startAnchor={{ position: 'right', offset: { y: 40 } }} endAnchor="left" />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
