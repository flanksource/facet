// @live
// Entity Model style: ER tables with PK/FK badges connected by solid `er` arrows,
// cardinality labels, and offset anchors spreading crowded FK bundles. The junction
// entity (ConfigAccess) is centered so its arrows fan outward to each side.
// Ported (trimmed 8 → 5 entities) from
// website-migration/common/src/components/EntityModelDiagram.tsx.
// Render: facet html entity-model.tsx -o dist
import React from 'react';
import { Page, Section, Diagram, BoxNode, Arrow, COLORS } from '@flanksource/facet';

interface FieldDef {
  name: string;
  type: string;
  pk?: boolean;
  fk?: boolean;
}

// Recipe: entity field row — PK badge amber, FK badge green (the sanctioned
// entity-model aliases), field name in accent, type right-aligned in muted.
function FieldRow({ name, type, pk, fk }: FieldDef) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {pk && <span className="text-[8px] font-bold px-1 rounded text-white" style={{ backgroundColor: COLORS.pk }}>PK</span>}
      {fk && <span className="text-[8px] font-bold px-1 rounded text-white" style={{ backgroundColor: COLORS.fk }}>FK</span>}
      {!pk && !fk && <span className="w-[18px]" />}
      <span className="text-[10px] font-semibold" style={{ color: COLORS.accent }}>{name}</span>
      <span className="text-[9px] ml-auto" style={{ color: COLORS.muted }}>{type}</span>
    </div>
  );
}

function EntityBox({ id, title, fields, accent = COLORS.primary }: {
  id: string; title: string; fields: FieldDef[]; accent?: string;
}) {
  return (
    <BoxNode id={id} title={title} headerColor={accent} bodyColor={COLORS.background}
      borderColor={accent} compact minWidth="170px">
      <div className="flex flex-col">
        {fields.map((f) => <FieldRow key={f.name} {...f} />)}
      </div>
    </BoxNode>
  );
}

// Cardinality goes in text labels (N:1, 1:N), never custom arrow shapes.
function RelLabel({ text }: { text: string }) {
  return (
    <div className="text-[8px] font-semibold px-1 rounded whitespace-nowrap"
      style={{ backgroundColor: COLORS.background, color: COLORS.muted, border: `1px solid ${COLORS.muted}` }}>
      {text}
    </div>
  );
}

export default function EntityModelDiagram() {
  return (
    <Page>
      <Section title="Access Entity Model">
        <Diagram className="relative py-6">
          {(id) => (
            <>
              {/* Row 1: referenced entities. items-start stops flex-stretch from
                  padding the shorter box with an empty band */}
              <div className="flex justify-center items-start gap-24 mb-12">
                <EntityBox id={id('application')} title="Application" accent={COLORS.accent} fields={[
                  { name: 'id', type: 'uuid', pk: true },
                  { name: 'name', type: 'string' },
                  { name: 'namespace', type: 'string' },
                  { name: 'spec', type: 'json' },
                ]} />
                <EntityBox id={id('config-item')} title="ConfigItem" accent={COLORS.accent} fields={[
                  { name: 'id', type: 'uuid', pk: true },
                  { name: 'name', type: 'string' },
                  { name: 'type', type: 'string' },
                  { name: 'status', type: 'string' },
                  { name: 'health', type: 'string' },
                ]} />
              </div>

              {/* Row 2: User — ConfigAccess (junction, FK-highlighted) — Role */}
              <div className="flex justify-center items-start gap-12">
                <EntityBox id={id('user')} title="User" fields={[
                  { name: 'id', type: 'uuid', pk: true },
                  { name: 'name', type: 'string' },
                  { name: 'account_id', type: 'string' },
                  { name: 'email', type: 'string' },
                ]} />
                <EntityBox id={id('config-access')} title="ConfigAccess" accent={COLORS.fk} fields={[
                  { name: 'id', type: 'string', pk: true },
                  { name: 'config_id', type: 'uuid', fk: true },
                  { name: 'external_user_id', type: 'uuid', fk: true },
                  { name: 'external_role_id', type: 'uuid', fk: true },
                  { name: 'application_id', type: 'uuid', fk: true },
                  { name: 'last_reviewed_at', type: 'timestamp' },
                ]} />
                <EntityBox id={id('role')} title="Role" fields={[
                  { name: 'id', type: 'uuid', pk: true },
                  { name: 'name', type: 'string' },
                  { name: 'role_type', type: 'string' },
                  { name: 'application_id', type: 'uuid', fk: true },
                ]} />
              </div>

              {/* FK bundle leaving ConfigAccess spreads with x-offset anchors; the short
                  unobstructed diagonals go straight so they can't cross or bunch labels */}
              <Arrow variant="er" from={id('config-access')} to={id('config-item')} color={COLORS.fk}
                path="straight"
                startAnchor={{ position: 'top', offset: { x: 20 } }} endAnchor="bottom"
                labels={{ middle: <RelLabel text="N:1" /> }}
              />
              <Arrow variant="er" from={id('config-access')} to={id('application')}
                path="straight"
                startAnchor={{ position: 'top', offset: { x: -20 } }}
                endAnchor={{ position: 'bottom', offset: { x: -25 } }}
              />
              {/* Same-row relationships go straight */}
              <Arrow variant="er" from={id('config-access')} to={id('user')} path="straight"
                startAnchor="left" endAnchor="right"
                labels={{ middle: <RelLabel text="N:1" /> }}
              />
              <Arrow variant="er" from={id('config-access')} to={id('role')} path="straight"
                startAnchor="right" endAnchor="left"
              />
              {/* Long sweep: label at the start (near Role) keeps the crowded
                  top-center clear; the end offset separates its head from the
                  ConfigAccess→Application arrow landing on the same edge */}
              <Arrow variant="er" from={id('role')} to={id('application')}
                startAnchor="top" endAnchor={{ position: 'bottom', offset: { x: 25 } }}
                labels={{ start: <RelLabel text="N:1" /> }}
              />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
