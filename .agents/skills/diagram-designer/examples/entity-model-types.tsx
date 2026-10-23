import React from 'react';
import { Page, Section, COLORS } from '@flanksource/facet';
import {
  UiArray,
  UiBinary,
  UiBoolean,
  UiCalendarBlank,
  UiCalendarCheck,
  UiCheckConstraint,
  UiClock,
  UiCollection,
  UiColumn,
  UiCompass,
  UiCurrencyDollar,
  UiDataSchema,
  UiEnum,
  UiFileCode,
  UiId,
  UiIdentificationCard,
  UiIndex,
  UiJson,
  UiListDashes,
  UiListFlat,
  UiMaterializedLog,
  UiNetwork,
  UiNull,
  UiNumeric,
  UiObject,
  UiPartition,
  UiProjection,
  UiRows,
  UiIndex5,
  UiSqlForeignKey,
  UiSqlPrimaryKey,
  UiSqlSequence,
  UiSqlTable,
  UiStream,
  UiString,
} from '@flanksource/clicky-ui/icons';

const TYPE_ICONS = {
  any: { component: UiColumn, name: 'UiColumn', meaning: 'Unrestricted or untyped column' },
  array: { component: UiArray, name: 'UiArray', meaning: 'Array or bit string' },
  binary: { component: UiBinary, name: 'UiBinary', meaning: 'Binary value or blob' },
  boolean: { component: UiBoolean, name: 'UiBoolean', meaning: 'Boolean intent or value' },
  date: { component: UiCalendarBlank, name: 'UiCalendarBlank', meaning: 'Calendar date' },
  enum: { component: UiEnum, name: 'UiEnum', meaning: 'Enumerated labels' },
  geometry: { component: UiCompass, name: 'UiCompass', meaning: 'Geometric shape or path' },
  identifier: { component: UiId, name: 'UiId', meaning: 'System or transaction identifier' },
  json: { component: UiJson, name: 'UiJson', meaning: 'JSON value or path' },
  money: { component: UiCurrencyDollar, name: 'UiCurrencyDollar', meaning: 'Currency amount' },
  network: { component: UiNetwork, name: 'UiNetwork', meaning: 'Network address' },
  null: { component: UiNull, name: 'UiNull', meaning: 'NULL storage class' },
  number: { component: UiNumeric, name: 'UiNumeric', meaning: 'Integer, real, or decimal number' },
  object: { component: UiObject, name: 'UiObject', meaning: 'Composite or snapshot value' },
  options: { component: UiListFlat, name: 'UiListFlat', meaning: 'Enum or constrained domain' },
  range: { component: UiListDashes, name: 'UiListDashes', meaning: 'Range or multirange' },
  sequence: { component: UiSqlSequence, name: 'UiSqlSequence', meaning: 'Sequence or log position' },
  text: { component: UiString, name: 'UiString', meaning: 'Text or text-search value' },
  time: { component: UiClock, name: 'UiClock', meaning: 'Time or duration' },
  timestamp: { component: UiCalendarCheck, name: 'UiCalendarCheck', meaning: 'Date and time' },
  uuid: { component: UiIdentificationCard, name: 'UiIdentificationCard', meaning: 'UUID value' },
  xml: { component: UiFileCode, name: 'UiFileCode', meaning: 'XML markup' },
} as const;

type IconKind = keyof typeof TYPE_ICONS;
export type FieldType = 'uuid' | 'varchar' | 'jsonb' | 'boolean' | 'timestamptz' | 'bigint' | 'text[]';

const FIELD_ICON_KIND: Record<FieldType, IconKind> = {
  uuid: 'uuid',
  varchar: 'text',
  jsonb: 'json',
  boolean: 'boolean',
  timestamptz: 'timestamp',
  bigint: 'number',
  'text[]': 'array',
};

interface CatalogRow {
  name: string;
  detail: string;
  icon: IconKind;
}

const POSTGRES_SCALAR: CatalogRow[] = [
  { name: 'bigint', detail: 'int8', icon: 'number' },
  { name: 'bigserial', detail: 'serial8', icon: 'number' },
  { name: 'boolean', detail: 'bool', icon: 'boolean' },
  { name: 'bytea', detail: 'binary', icon: 'binary' },
  { name: 'character', detail: 'char', icon: 'text' },
  { name: 'character varying', detail: 'varchar', icon: 'text' },
  { name: 'date', detail: 'calendar date', icon: 'date' },
  { name: 'double precision', detail: 'float, float8', icon: 'number' },
  { name: 'integer', detail: 'int, int4', icon: 'number' },
  { name: 'interval', detail: 'duration', icon: 'time' },
  { name: 'money', detail: 'currency', icon: 'money' },
  { name: 'numeric', detail: 'decimal', icon: 'number' },
  { name: 'real', detail: 'float4', icon: 'number' },
  { name: 'smallint', detail: 'int2', icon: 'number' },
  { name: 'smallserial', detail: 'serial2', icon: 'number' },
  { name: 'serial', detail: 'serial4', icon: 'number' },
  { name: 'text', detail: 'variable length', icon: 'text' },
  { name: 'time', detail: 'without time zone', icon: 'time' },
  { name: 'time with time zone', detail: 'timetz', icon: 'time' },
  { name: 'timestamp', detail: 'without time zone', icon: 'timestamp' },
  { name: 'timestamp with time zone', detail: 'timestamptz', icon: 'timestamp' },
  { name: 'uuid', detail: 'identifier', icon: 'uuid' },
];

const POSTGRES_SPECIALIZED: CatalogRow[] = [
  { name: 'bit', detail: 'fixed bit string', icon: 'array' },
  { name: 'bit varying', detail: 'varbit', icon: 'array' },
  { name: 'box', detail: 'geometry', icon: 'geometry' },
  { name: 'cidr', detail: 'network', icon: 'network' },
  { name: 'circle', detail: 'geometry', icon: 'geometry' },
  { name: 'inet', detail: 'network', icon: 'network' },
  { name: 'json', detail: 'textual JSON', icon: 'json' },
  { name: 'jsonb', detail: 'binary JSON', icon: 'json' },
  { name: 'line', detail: 'geometry', icon: 'geometry' },
  { name: 'lseg', detail: 'geometry', icon: 'geometry' },
  { name: 'macaddr', detail: 'network', icon: 'network' },
  { name: 'macaddr8', detail: 'network', icon: 'network' },
  { name: 'path', detail: 'geometry', icon: 'geometry' },
  { name: 'pg_lsn', detail: 'log sequence number', icon: 'sequence' },
  { name: 'pg_snapshot', detail: 'transaction snapshot', icon: 'object' },
  { name: 'point', detail: 'geometry', icon: 'geometry' },
  { name: 'polygon', detail: 'geometry', icon: 'geometry' },
  { name: 'tsquery', detail: 'text search query', icon: 'text' },
  { name: 'tsvector', detail: 'text search document', icon: 'text' },
  { name: 'txid_snapshot', detail: 'deprecated', icon: 'object' },
  { name: 'xml', detail: 'structured markup', icon: 'xml' },
];

const POSTGRES_FAMILIES: CatalogRow[] = [
  { name: 'jsonpath', detail: 'JSON path expression', icon: 'json' },
  { name: 'T[]', detail: 'array of any element type', icon: 'array' },
  { name: 'enum', detail: 'user-defined labels', icon: 'enum' },
  { name: 'composite', detail: 'user-defined row', icon: 'object' },
  { name: 'domain', detail: 'constrained base type', icon: 'options' },
  { name: 'int4range', detail: 'int4multirange', icon: 'range' },
  { name: 'int8range', detail: 'int8multirange', icon: 'range' },
  { name: 'numrange', detail: 'nummultirange', icon: 'range' },
  { name: 'tsrange', detail: 'tsmultirange', icon: 'range' },
  { name: 'tstzrange', detail: 'tstzmultirange', icon: 'range' },
  { name: 'daterange', detail: 'datemultirange', icon: 'range' },
];

const POSTGRES_IDENTIFIERS: CatalogRow[] = [
  { name: 'oid', detail: 'object identifier', icon: 'identifier' },
  { name: 'regclass', detail: 'relation', icon: 'identifier' },
  { name: 'regcollation', detail: 'collation', icon: 'identifier' },
  { name: 'regconfig', detail: 'search configuration', icon: 'identifier' },
  { name: 'regdictionary', detail: 'search dictionary', icon: 'identifier' },
  { name: 'regnamespace', detail: 'schema', icon: 'identifier' },
  { name: 'regoper', detail: 'operator', icon: 'identifier' },
  { name: 'regoperator', detail: 'typed operator', icon: 'identifier' },
  { name: 'regproc', detail: 'function', icon: 'identifier' },
  { name: 'regprocedure', detail: 'typed function', icon: 'identifier' },
  { name: 'regrole', detail: 'role', icon: 'identifier' },
  { name: 'regtype', detail: 'type', icon: 'identifier' },
  { name: 'xid', detail: 'transaction identifier', icon: 'identifier' },
  { name: 'xid8', detail: '64-bit transaction ID', icon: 'identifier' },
];

const SQLITE_AFFINITIES: CatalogRow[] = [
  { name: 'INT family', detail: 'INTEGER affinity', icon: 'number' },
  { name: 'CHAR / CLOB / TEXT family', detail: 'TEXT affinity', icon: 'text' },
  { name: 'BLOB', detail: 'BLOB affinity', icon: 'binary' },
  { name: 'No declared type', detail: 'BLOB affinity', icon: 'any' },
  { name: 'REAL / FLOA / DOUB family', detail: 'REAL affinity', icon: 'number' },
  { name: 'NUMERIC / DECIMAL', detail: 'NUMERIC affinity', icon: 'number' },
  { name: 'BOOLEAN', detail: 'NUMERIC affinity', icon: 'boolean' },
  { name: 'DATE / DATETIME', detail: 'NUMERIC affinity', icon: 'date' },
  { name: 'FLOATING POINT', detail: 'INTEGER affinity (INT wins)', icon: 'number' },
  { name: 'STRING', detail: 'NUMERIC affinity', icon: 'text' },
  { name: 'Other declared names', detail: 'NUMERIC affinity', icon: 'any' },
];

const SQLITE_STRICT: CatalogRow[] = [
  { name: 'INT', detail: 'integer', icon: 'number' },
  { name: 'INTEGER', detail: 'integer; rowid PK possible', icon: 'number' },
  { name: 'REAL', detail: 'floating point', icon: 'number' },
  { name: 'TEXT', detail: 'string', icon: 'text' },
  { name: 'BLOB', detail: 'binary', icon: 'binary' },
  { name: 'ANY', detail: 'preserves any value', icon: 'any' },
];

const SQLITE_STORAGE: CatalogRow[] = [
  { name: 'NULL', detail: 'null value', icon: 'null' },
  { name: 'INTEGER', detail: 'signed integer', icon: 'number' },
  { name: 'REAL', detail: 'floating point', icon: 'number' },
  { name: 'TEXT', detail: 'text string', icon: 'text' },
  { name: 'BLOB', detail: 'binary data', icon: 'binary' },
];

function IconGlyph({ kind }: { kind: IconKind }) {
  const Icon = TYPE_ICONS[kind].component;
  return <Icon className="w-5 h-5 shrink-0" />;
}

export function ColumnTypeIcon({ type }: { type: FieldType }) {
  return <IconGlyph kind={FIELD_ICON_KIND[type]} />;
}

function TypeTable({ title, nameTitle = 'Column type', detailTitle, rows }: { title: string; nameTitle?: string; detailTitle: string; rows: CatalogRow[] }) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: COLORS.muted }}>
      <div className="px-3 py-2 text-white font-bold text-[9pt]" style={{ backgroundColor: COLORS.primary }}>{title}</div>
      <table className="w-full text-[8pt]">
        <thead><tr><th className="text-left">Icon</th><th className="text-left">{nameTitle}</th><th className="text-left">{detailTitle}</th></tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.name}>
            <td><IconGlyph kind={row.icon} /></td>
            <td className="font-semibold">{row.name}</td>
            <td>{row.detail}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const STRUCTURE_LEGEND = [
  { icon: UiSqlTable, name: 'UiSqlTable', meaning: 'Relational table' },
  { icon: UiDataSchema, name: 'UiDataSchema', meaning: 'Junction or schema relationship' },
  { icon: UiStream, name: 'UiStream', meaning: 'Event stream' },
  { icon: UiCollection, name: 'UiCollection', meaning: 'Document collection' },
  { icon: UiProjection, name: 'UiProjection', meaning: 'Derived or materialized view' },
  { icon: UiIndex, name: 'UiIndex', meaning: 'General index' },
  { icon: UiSqlPrimaryKey, name: 'UiSqlPrimaryKey', meaning: 'Primary key index' },
  { icon: UiSqlForeignKey, name: 'UiSqlForeignKey', meaning: 'Foreign key lookup index' },
  { icon: UiRows, name: 'UiRows', meaning: 'Clustered index concept' },
  { icon: UiIndex5, name: 'UiIndex5', meaning: 'Unique index' },
  { icon: UiCheckConstraint, name: 'UiCheckConstraint', meaning: 'CHECK constraint' },
  { icon: UiPartition, name: 'UiPartition', meaning: 'Partition key' },
  { icon: UiMaterializedLog, name: 'UiMaterializedLog', meaning: 'Materialized refresh source' },
];

export function TypeCatalogPage() {
  return (
    <>
      <Page>
        <Section title="PostgreSQL 18: built-in general-purpose column types">
          <p className="text-[8pt] mb-4" style={{ color: COLORS.muted }}>Every name in PostgreSQL Table 8.1 is shown below. Parameters such as character length, bit length, precision, and time precision are omitted from the labels.</p>
          <div className="grid grid-cols-2 gap-6">
            <TypeTable title="Scalar and temporal" detailTitle="Alias or detail" rows={POSTGRES_SCALAR} />
            <TypeTable title="Structured and specialized" detailTitle="Alias or detail" rows={POSTGRES_SPECIALIZED} />
          </div>
        </Section>
      </Page>
      <Page>
        <Section title="PostgreSQL 18: additional column-type families">
          <p className="text-[8pt] mb-4" style={{ color: COLORS.muted }}>Range and multirange pairs, catalog identifiers, and extensible type families can also be used in columns. Extension and user-defined type names are unbounded.</p>
          <div className="grid grid-cols-2 gap-6">
            <TypeTable title="Structured and range types" nameTitle="Type or family" detailTitle="Related type or meaning" rows={POSTGRES_FAMILIES} />
            <TypeTable title="Object and transaction IDs" detailTitle="Refers to" rows={POSTGRES_IDENTIFIERS} />
          </div>
        </Section>
      </Page>
      <Page>
        <Section title="SQLite: column declarations and storage">
          <p className="text-[8pt] mb-4" style={{ color: COLORS.muted }}>Ordinary SQLite accepts arbitrary declared names and applies the five affinity rules in order. BOOLEAN and DATE/DATETIME keep semantic icons here, though both have NUMERIC affinity; Boolean values use integer 0/1, while dates can use TEXT, REAL, or INTEGER storage. Storage classes describe values, not a fixed column type.</p>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <TypeTable title="Ordinary-table affinity rules" nameTitle="Declared type pattern" detailTitle="Result" rows={SQLITE_AFFINITIES} />
            <TypeTable title="STRICT table: all six allowed names" detailTitle="Meaning" rows={SQLITE_STRICT} />
          </div>
          <div className="max-w-[50%] pr-3">
            <TypeTable title="All five storage classes" nameTitle="Storage class" detailTitle="Value" rows={SQLITE_STORAGE} />
          </div>
        </Section>
      </Page>
      <Page>
        <Section title="Full icon and notation legend">
          <div className="grid grid-cols-2 gap-8 text-[8pt]">
            <div>
              <h4 className="font-bold mb-2">Column type icons</h4>
              {Object.entries(TYPE_ICONS).map(([kind, entry]) => (
                <div key={kind} className="flex items-center gap-2 py-1 border-b" style={{ borderColor: COLORS.muted }}>
                  <IconGlyph kind={kind as IconKind} />
                  <span className="font-semibold min-w-[83pt]">{entry.name}</span>
                  <span style={{ color: COLORS.muted }}>{entry.meaning}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-bold mb-2">Models and structure</h4>
              {STRUCTURE_LEGEND.map(({ icon: Icon, name, meaning }) => (
                <div key={name} className="flex items-center gap-2 py-1 border-b" style={{ borderColor: COLORS.muted }}>
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-semibold min-w-[98pt]">{name}</span>
                  <span style={{ color: COLORS.muted }}>{meaning}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 py-1"><span className="font-bold px-1 rounded text-white" style={{ backgroundColor: COLORS.pk }}>PK</span> Primary key; always required</div>
              <div className="flex items-center gap-2 py-1"><span className="font-bold px-1 rounded text-white" style={{ backgroundColor: COLORS.fk }}>FK</span> Foreign key</div>
              <div className="py-1"><span className="text-red-600 font-bold">*</span> Required field; absence means nullable in these examples</div>
              <div className="py-1"><span className="inline-block w-4 h-4 rounded-sm align-middle mr-2" style={{ backgroundColor: COLORS.primary }} />Blue header = relational or source model</div>
              <div className="py-1"><span className="inline-block w-4 h-4 rounded-sm align-middle mr-2" style={{ backgroundColor: COLORS.fk }} />Green header or arrow = junction, result, or highlighted FK</div>
              <div className="py-1">Solid arrow = relationship or derivation; N:1 = many rows reference one row</div>
            </div>
          </div>
        </Section>
      </Page>
    </>
  );
}
