// @live
// Data Flow style: horizontal 4-column flow with borderless intermediary services
// between source and target, a spacer div controlling arrow length, and a green
// output node holding a real table. Also demonstrates parallel offset arrows.
// Ported from website-migration/common/src/components/EntraDataFlowDiagram.tsx.
// Render: facet html data-flow.tsx -o dist
import React from 'react';
import { Page, Section, Diagram, BoxNode, Arrow, NodeSection, SectionDivider, COLORS } from '@flanksource/facet';
import { AzureAd, AzureLogAnalytics, AzureServiceBus, MissionControlWhite } from '@flanksource/icons/mi';

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

// Borderless intermediary: services that sit between major nodes get no border,
// no shadow, minimal padding — the border weight is reserved for major nodes.
function IconNode({ id, icon: Icon, label }: { id: string; icon: IconComponent; label: string }) {
  return (
    <div id={id} className="flex flex-col items-center gap-1 px-2 py-1">
      <Icon className="w-7 h-7" style={{ color: COLORS.accent }} />
      <span className="text-[10px] font-bold" style={{ color: COLORS.muted }}>{label}</span>
    </div>
  );
}

const auditRows = [
  { name: 'J. Smith', role: 'Admin', lastAccess: '2h ago', reviewed: '30d ago' },
  { name: 'A. Chen', role: 'User', lastAccess: '1d ago', reviewed: '7d ago' },
  { name: 'svc-deploy', role: 'User', lastAccess: '5m ago', reviewed: 'Never' },
];

// Output boxes may hold a real table: 9px cells, header underlined in the box's
// border color. The inline styles deliberately opt out of facet's datasheet
// table skin (blue thead, bordered cells, zebra rows) at every level — bare
// <table> markup inherits that skin otherwise.
function AuditTable() {
  const unskinned: React.CSSProperties = { backgroundColor: 'transparent', border: 'none' };
  const cellStyle: React.CSSProperties = {
    ...unskinned, color: COLORS.muted, fontSize: '9px', padding: '2px 6px', whiteSpace: 'nowrap',
  };
  const headerStyle: React.CSSProperties = {
    ...cellStyle, fontWeight: 700, borderBottom: `1px solid ${COLORS.outputBorder}`,
  };
  return (
    <table className="w-full" style={{ borderCollapse: 'collapse', margin: 0 }}>
      <thead style={unskinned}>
        <tr style={unskinned}>
          {['User', 'Role', 'Last Access', 'Reviewed'].map((h) => (
            <th key={h} style={headerStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {auditRows.map((r) => (
          <tr key={r.name} style={unskinned}>
            <td style={cellStyle}>{r.name}</td>
            <td style={cellStyle}>{r.role}</td>
            <td style={cellStyle}>{r.lastAccess}</td>
            <td style={cellStyle}>{r.reviewed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DataFlowDiagram() {
  return (
    <Page>
      <Section title="Entra ID Data Flow">
        <Diagram className="relative py-8">
          {(id) => (
            <>
              <div className="flex items-start justify-center gap-6" style={{ minWidth: '950px' }}>
                {/* Col 1: Source */}
                <div className="self-center">
                  <BoxNode
                    id={id('entra')}
                    title={
                      <span className="flex items-center justify-center gap-2">
                        <AzureAd className="w-5 h-5" />
                        Entra ID
                      </span>
                    }
                    headerColor={COLORS.primary}
                    bodyColor={COLORS.background}
                    borderColor={COLORS.primary}
                    minWidth="180px"
                  >
                    <div className="flex flex-col gap-3">
                      <NodeSection title="Identity" items={['Users & Groups', 'App Registrations', 'Enterprise Apps', 'Role Assignments']} />
                      <NodeSection title="Sign-in Logs" items={['Interactive', 'Non-interactive']} />
                    </div>
                  </BoxNode>
                </div>

                {/* Col 2: borderless intermediaries, aligned below the sign-in arrow line */}
                <div className="flex flex-col items-center self-end mb-2" style={{ minWidth: '180px' }}>
                  <div className="flex gap-3">
                    <IconNode id={id('loganalytics')} icon={AzureLogAnalytics} label="Log Analytics" />
                    <IconNode id={id('eventhub')} icon={AzureServiceBus} label="Event Hub" />
                  </div>
                </div>

                {/* Col 3: Target */}
                <div className="self-center">
                  <BoxNode
                    id={id('mc')}
                    title={
                      <span className="flex items-center justify-center gap-2">
                        <MissionControlWhite className="w-5 h-5" />
                        Mission Control
                      </span>
                    }
                    headerColor={COLORS.primary}
                    bodyColor={COLORS.background}
                    borderColor={COLORS.primary}
                    minWidth="240px"
                  >
                    <div className="flex flex-col gap-3">
                      <NodeSection title="Catalog" items={['Users & Groups', 'Roles & Policies', 'Access Records', 'Sign-in Logs']} />
                      <SectionDivider />
                      <NodeSection title="Scrapers" items={['HTTP Scraper', 'Logs Scraper', 'PubSub Scraper']} />
                    </div>
                  </BoxNode>
                </div>

                {/* Spacer — lengthens the arrow to the output; never use node margins for this */}
                <div style={{ minWidth: '60px' }} />

                {/* Col 4: Output (green) */}
                <div className="self-center">
                  <BoxNode
                    id={id('report')}
                    title="Audit Report"
                    headerColor={COLORS.outputBorder}
                    bodyColor={COLORS.background}
                    borderColor={COLORS.outputBorder}
                    compact
                    minWidth="220px"
                  >
                    <AuditTable />
                  </BoxNode>
                </div>
              </div>

              {/* Main flow: box border to box border */}
              <Arrow variant="primary" from={id('entra')} to={id('mc')} startAnchor="right" endAnchor="left" />

              {/* Supplementary flow: same node pair, offset below and forced straight */}
              <Arrow variant="secondary" from={id('entra')} to={id('mc')}
                startAnchor={{ position: 'right', offset: { y: 110 } }}
                endAnchor={{ position: 'left', offset: { y: 110 } }}
                path="straight"
              />

              <Arrow variant="primary" from={id('mc')} to={id('report')} startAnchor="right" endAnchor="left" />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
