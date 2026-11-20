// @live
// Relational, junction, event, document, and analytical data-model recipes.
// Render: facet png entity-model.tsx -o dist
import React from 'react';
import { Page, Section, Diagram, BoxNode, Arrow, COLORS } from '@flanksource/facet';
import { ColumnTypeIcon, TypeCatalogPage, type FieldType } from './entity-model-types';
import {
  UiCheckConstraint,
  UiCollection,
  UiDataSchema,
  UiIndex,
  UiMaterializedLog,
  UiPartition,
  UiProjection,
  UiSqlTable,
  UiStream,
} from '@flanksource/clicky-ui/icons';

interface FieldDef {
  name: string;
  type: FieldType;
  pk?: boolean;
  fk?: boolean;
  required?: boolean;
}

interface StructureDef {
  label: string;
  icon: React.ReactNode;
}

interface EntityBoxProps {
  id: string;
  title: string;
  kind: string;
  icon: React.ReactNode;
  fields: FieldDef[];
  structure?: StructureDef[];
  accent?: string;
}

function FieldRow({ name, type, pk, fk, required }: FieldDef) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <ColumnTypeIcon type={type} />
      {pk && <span className="text-[6pt] font-bold px-1 rounded text-white" style={{ backgroundColor: COLORS.pk }}>PK</span>}
      {fk && <span className="text-[6pt] font-bold px-1 rounded text-white" style={{ backgroundColor: COLORS.fk }}>FK</span>}
      <span className="text-[8pt] font-semibold" style={{ color: COLORS.accent }}>
        {name}{(required || pk) && <span className="text-red-600" aria-label="required"> *</span>}
      </span>
      <span className="text-[7pt] ml-auto pl-2" style={{ color: COLORS.muted }}>{type}</span>
    </div>
  );
}

function EntityBox({ id, title, kind, icon, fields, structure = [], accent = COLORS.primary }: EntityBoxProps) {
  return (
    <BoxNode id={id} title={
      <span className="flex items-center justify-center gap-2">
        <span className="flex items-center justify-center rounded bg-white w-6 h-6">{icon}</span>
        {title}
      </span>
    } headerColor={accent} bodyColor={COLORS.background} borderColor={accent} compact minWidth="205px">
      <div className="text-[6pt] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.muted }}>{kind}</div>
      {fields.map((field) => <FieldRow key={field.name} {...field} />)}
      {structure.length > 0 && (
        <div className="border-t mt-2 pt-1" style={{ borderColor: COLORS.muted }}>
          {structure.map(({ label, icon: structureIcon }) => (
            <div key={label} className="flex items-center gap-1.5 py-0.5 text-[7pt]" style={{ color: COLORS.muted }}>
              <span className="w-4 h-4 shrink-0">{structureIcon}</span>
              {label}
            </div>
          ))}
        </div>
      )}
    </BoxNode>
  );
}

function RelLabel({ text }: { text: string }) {
  return (
    <div className="text-[6pt] font-semibold px-1 rounded whitespace-nowrap"
      style={{ backgroundColor: COLORS.background, color: COLORS.muted, border: `1px solid ${COLORS.muted}` }}>
      {text}
    </div>
  );
}

export default function EntityModelDiagram() {
  return (
    <>
    <Page>
      <Section title="Relational and junction models">
        <div className="text-[7pt]" style={{ color: COLORS.muted }}><span className="text-red-600">*</span> required field</div>
        <Diagram className="relative py-6">
          {(id) => (
            <>
              <div className="flex justify-center items-start gap-24 mb-16">
                <EntityBox id={id('application')} title="Application" kind="Relational table" icon={<UiSqlTable className="w-5 h-5" />} accent={COLORS.accent} fields={[
                  { name: 'id', type: 'uuid', pk: true },
                  { name: 'name', type: 'varchar', required: true },
                  { name: 'namespace', type: 'varchar', required: true },
                  { name: 'spec', type: 'jsonb' },
                ]} structure={[
                  { icon: <UiIndex className="w-4 h-4" />, label: 'UNIQUE namespace, name' },
                ]} />
                <EntityBox id={id('config-item')} title="ConfigItem" kind="Relational table" icon={<UiSqlTable className="w-5 h-5" />} accent={COLORS.accent} fields={[
                  { name: 'id', type: 'uuid', pk: true },
                  { name: 'name', type: 'varchar', required: true },
                  { name: 'status', type: 'varchar', required: true },
                  { name: 'health', type: 'varchar' },
                  { name: 'spec', type: 'jsonb' },
                ]} structure={[
                  { icon: <UiIndex className="w-4 h-4" />, label: 'GIN spec' },
                  { icon: <UiCheckConstraint className="w-4 h-4" />, label: 'CHECK health in allowed states' },
                ]} />
              </div>

              <div className="flex justify-center items-start gap-12">
                <EntityBox id={id('user')} title="User" kind="Relational table" icon={<UiSqlTable className="w-5 h-5" />} fields={[
                  { name: 'id', type: 'uuid', pk: true },
                  { name: 'name', type: 'varchar', required: true },
                  { name: 'email', type: 'varchar', required: true },
                  { name: 'active', type: 'boolean', required: true },
                ]} structure={[
                  { icon: <UiIndex className="w-4 h-4" />, label: 'UNIQUE email' },
                ]} />
                <EntityBox id={id('config-access')} title="ConfigAccess" kind="Junction table" icon={<UiDataSchema className="w-5 h-5" />} accent={COLORS.fk} fields={[
                  { name: 'config_id', type: 'uuid', pk: true, fk: true },
                  { name: 'user_id', type: 'uuid', pk: true, fk: true },
                  { name: 'role_id', type: 'uuid', fk: true, required: true },
                  { name: 'application_id', type: 'uuid', fk: true, required: true },
                  { name: 'last_reviewed_at', type: 'timestamptz' },
                ]} structure={[
                  { icon: <UiIndex className="w-4 h-4" />, label: 'BTREE role_id, application_id' },
                ]} />
                <EntityBox id={id('role')} title="Role" kind="Relational table" icon={<UiSqlTable className="w-5 h-5" />} fields={[
                  { name: 'id', type: 'uuid', pk: true },
                  { name: 'name', type: 'varchar', required: true },
                  { name: 'role_type', type: 'varchar', required: true },
                  { name: 'application_id', type: 'uuid', fk: true, required: true },
                ]} structure={[
                  { icon: <UiIndex className="w-4 h-4" />, label: 'INDEX application_id' },
                ]} />
              </div>

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
              <Arrow variant="er" from={id('config-access')} to={id('user')} path="straight"
                startAnchor="left" endAnchor="right"
                labels={{ middle: <RelLabel text="N:1" /> }}
              />
              <Arrow variant="er" from={id('config-access')} to={id('role')} path="straight"
                startAnchor="right" endAnchor="left"
              />
              <Arrow variant="er" from={id('role')} to={id('application')}
                startAnchor="top" endAnchor={{ position: 'bottom', offset: { x: 25 } }}
                labels={{ start: <RelLabel text="N:1" /> }}
              />
            </>
          )}
        </Diagram>
      </Section>

      <Section title="Event, document, and analytical models">
        <Diagram className="relative py-6">
          {(id) => (
            <>
              <div className="flex justify-center items-start gap-24">
                <EntityBox id={id('changes')} title="AccessChanges" kind="Event stream" icon={<UiStream className="w-5 h-5" />} fields={[
                  { name: 'event_id', type: 'uuid', pk: true },
                  { name: 'subject_id', type: 'uuid', required: true },
                  { name: 'occurred_at', type: 'timestamptz', required: true },
                  { name: 'payload', type: 'jsonb', required: true },
                ]} structure={[
                  { icon: <UiPartition className="w-4 h-4" />, label: 'Partition by subject_id' },
                ]} />
                <EntityBox id={id('documents')} title="ChangeDocuments" kind="Document collection" icon={<UiCollection className="w-5 h-5" />} fields={[
                  { name: '_id', type: 'uuid', pk: true },
                  { name: 'subject_id', type: 'uuid', required: true },
                  { name: 'changes', type: 'jsonb', required: true },
                  { name: 'tags', type: 'text[]' },
                ]} structure={[
                  { icon: <UiIndex className="w-4 h-4" />, label: 'GIN tags' },
                ]} />
                <EntityBox id={id('summary')} title="AccessSummary" kind="Materialized view" icon={<UiProjection className="w-5 h-5" />} accent={COLORS.outputBorder} fields={[
                  { name: 'subject_id', type: 'uuid', pk: true },
                  { name: 'change_count', type: 'bigint', required: true },
                  { name: 'last_change_at', type: 'timestamptz' },
                ]} structure={[
                  { icon: <UiMaterializedLog className="w-4 h-4" />, label: 'Refresh from changes' },
                  { icon: <UiIndex className="w-4 h-4" />, label: 'UNIQUE subject_id' },
                ]} />
              </div>
              <Arrow variant="er" from={id('changes')} to={id('documents')} path="straight"
                startAnchor="right" endAnchor="left" labels={{ middle: <RelLabel text="persist" /> }} />
              <Arrow variant="er" from={id('documents')} to={id('summary')} path="straight"
                startAnchor="right" endAnchor="left" labels={{ middle: <RelLabel text="aggregate" /> }} />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
    <TypeCatalogPage />
    </>
  );
}
