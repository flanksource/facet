// @live
// Pipeline style: horizontal sequential chain — source → processor → destination.
// Two sections demonstrate the "split complex diagrams" rule: one story per diagram.
// Ported from website-migration/common/src/components/AuditLogDiagrams.tsx.
// Render: facet html pipeline.tsx -o dist
import React from 'react';
import { Page, Section, Diagram, BoxNode, Arrow, NodeSection, COLORS } from '@flanksource/facet';
import { AzureAd, AzureServiceBus, Http, MissionControl } from '@flanksource/icons/mi';
import { HiShieldCheck } from 'react-icons/hi2';

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

// Bordered icon+label: a standalone pipeline stage representing a single concept.
function DiagramNode({ id, icon: Icon, label }: { id: string; icon: IconComponent; label: string }) {
  return (
    <div id={id} className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 shadow-lg"
      style={{ borderColor: COLORS.primary, backgroundColor: COLORS.background }}>
      <Icon className="w-8 h-8" style={{ color: COLORS.accent }} />
      <span className="text-xs font-bold" style={{ color: COLORS.muted }}>{label}</span>
    </div>
  );
}

// Compact Mission Control pill for horizontal pipelines (accent border marks the
// anchor). Colored MissionControl icon — *White variants are for colored headers
// only and vanish on a light body.
function MissionControlPill({ id }: { id: string }) {
  return (
    <div id={id} className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 shadow-lg"
      style={{ borderColor: COLORS.accent, backgroundColor: COLORS.background }}>
      <MissionControl className="w-8 h-8" />
      <span className="text-xs font-bold" style={{ color: COLORS.muted }}>Mission Control</span>
    </div>
  );
}

function EntraSourceBox({ id }: { id: string }) {
  return (
    <BoxNode
      id={id}
      title={
        <span className="flex items-center justify-center gap-2">
          <AzureAd className="w-5 h-5" />
          Entra ID
        </span>
      }
      headerColor={COLORS.primary}
      bodyColor={COLORS.background}
      borderColor={COLORS.primary}
      compact
      minWidth="150px"
    >
      <div className="flex flex-col gap-2">
        <NodeSection title="Identity" items={['Users & Groups', 'App Registrations']} />
        <NodeSection title="Sign-in Logs" items={['Interactive', 'Non-interactive']} />
      </div>
    </BoxNode>
  );
}

function ArrowLabel({ text }: { text: string }) {
  return (
    <div className="rounded px-1.5 py-0.5 text-[9px] font-semibold mt-1"
      style={{ backgroundColor: COLORS.background, color: COLORS.accent, border: `1px solid ${COLORS.primary}` }}>
      {text}
    </div>
  );
}

export default function PipelineDiagrams() {
  return (
    <Page>
      <Section title="HTTP Scraper">
        <Diagram className="relative">
          {(id) => (
            <>
              <div className="flex items-center justify-center gap-16 py-6">
                <EntraSourceBox id={id('entra')} />
                {/* Spacer: the MS Graph label needs a line longer than the pill */}
                <div style={{ minWidth: '20px' }} />
                <DiagramNode id={id('scraper')} icon={Http} label="HTTP Scraper" />
                <MissionControlPill id={id('mc')} />
              </div>
              <Arrow variant="primary" from={id('entra')} to={id('scraper')} path="straight"
                startAnchor="right" endAnchor="left"
                labels={{ middle: <ArrowLabel text="MS Graph" /> }}
              />
              <Arrow variant="primary" from={id('scraper')} to={id('mc')}
                startAnchor="right" endAnchor="left"
              />
            </>
          )}
        </Diagram>
      </Section>

      <Section title="Event Hub Streaming">
        <Diagram className="relative">
          {(id) => (
            <>
              <div className="flex items-center justify-center gap-16 py-6">
                <EntraSourceBox id={id('entra')} />
                <DiagramNode id={id('hub')} icon={AzureServiceBus} label="Event Hub" />
                {/* Spacer: the Stream label needs a line longer than the pill */}
                <div style={{ minWidth: '20px' }} />
                <DiagramNode id={id('consumer')} icon={HiShieldCheck} label="Bridge Consumer" />
                <MissionControlPill id={id('mc')} />
              </div>
              <Arrow variant="primary" from={id('entra')} to={id('hub')} path="straight"
                startAnchor="right" endAnchor="left"
              />
              <Arrow variant="primary" from={id('hub')} to={id('consumer')}
                startAnchor="right" endAnchor="left"
                labels={{ middle: <ArrowLabel text="Stream" /> }}
              />
              <Arrow variant="primary" from={id('consumer')} to={id('mc')}
                startAnchor="right" endAnchor="left"
              />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
