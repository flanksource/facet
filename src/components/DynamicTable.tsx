import React from 'react';
import CompactTable from './CompactTable';
import { formatDate, formatBytes, formatMillicores, formatDurationMs, getGaugeColor } from './Format';
import { HEALTH_COLORS, STATUS_COLORS } from '../utils/theme';

export type ColumnType =
  | 'string' | 'number' | 'boolean' | 'datetime' | 'duration'
  | 'health' | 'status' | 'gauge' | 'bytes' | 'decimal'
  | 'millicore' | 'labels';

export interface GaugeThreshold {
  percent: number;
  color: string;
}

export interface GaugeConfig {
  max?: number;
  min?: number;
  precision?: number;
  thresholds?: GaugeThreshold[];
}

export interface BadgeColorSource {
  auto?: boolean;
  map?: Record<string, string>;
}

export interface ColumnDef {
  name: string;
  type: ColumnType;
  hidden?: boolean;
  width?: string;
  unit?: string;
  gauge?: GaugeConfig;
  badge?: { color?: BadgeColorSource };
  icon?: string;
}

export interface CellAttributes {
  url?: string;
  icon?: string;
  max?: number;
  min?: number;
}

export type RowData = any[] | Record<string, any>;

export interface DynamicTableProps {
  columns: ColumnDef[];
  rows: RowData[];
  cellAttributes?: (row: RowData, col: ColumnDef) => CellAttributes | undefined;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'md';
}

function HealthDot({ health }: { health: string }) {
  const color = HEALTH_COLORS[health.toLowerCase()] ?? '#6B7280';
  return (
    <span className="inline-flex items-center gap-[0.5mm]">
      <span className="inline-block w-[2mm] h-[2mm] rounded-full" style={{ backgroundColor: color }} />
      {health}
    </span>
  );
}

function StatusBadge({ value }: { value: string }) {
  const colors = STATUS_COLORS[value.toLowerCase()] ?? { bg: '#F3F4F6', fg: '#374151' };
  return (
    <span className="inline-flex px-[1.5mm] py-[0.3mm] rounded text-[6pt] font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.fg }}>
      {value}
    </span>
  );
}

function BadgeCell({ value, config }: { value: string; config?: { color?: BadgeColorSource } }) {
  let bg = '#F3F4F6', fg = '#374151';
  if (config?.color?.map) {
    const mapped = config.color.map[value] || config.color.map[value.toLowerCase()];
    if (mapped) { bg = mapped; fg = '#FFFFFF'; }
  } else if (config?.color?.auto) {
    const auto = STATUS_COLORS[value.toLowerCase()];
    if (auto) { bg = auto.bg; fg = auto.fg; }
  }
  return (
    <span className="inline-flex px-[1.5mm] py-[0.3mm] rounded text-[6pt] font-semibold"
      style={{ backgroundColor: bg, color: fg }}>
      {value}
    </span>
  );
}

function GaugeCell({ value, gauge, attrs }: { value: number; gauge?: GaugeConfig; attrs?: CellAttributes }) {
  const max = attrs?.max ?? gauge?.max ?? 100;
  const min = attrs?.min ?? gauge?.min ?? 0;
  const range = max - min;
  const pct = range > 0 ? Math.min(100, Math.max(0, ((value - min) / range) * 100)) : 0;
  const color = gauge?.thresholds ? getGaugeColor(pct, gauge.thresholds) : '#3B82F6';
  const precision = gauge?.precision ?? 1;

  return (
    <span className="inline-flex items-center gap-[1mm] w-full">
      <span className="flex-1 h-[1.5mm] rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </span>
      <span className="text-[6pt] text-gray-600 min-w-[6mm] text-right">{value.toFixed(precision)}%</span>
    </span>
  );
}

function TagBadges({ value }: { value: Record<string, string> }) {
  return (
    <span className="inline-flex flex-wrap gap-[0.5mm]">
      {Object.entries(value).map(([k, v]) => (
        <span key={k} className="inline-flex items-center border border-blue-200 rounded overflow-hidden text-[6pt]" style={{ whiteSpace: 'nowrap' }}>
          <span className="px-[1.5mm] py-[0.3mm] font-medium" style={{ backgroundColor: '#DBEAFE', color: '#475569' }}>{k}</span>
          <span className="px-[1.5mm] py-[0.3mm]" style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}>{v}</span>
        </span>
      ))}
    </span>
  );
}

function isTagLike(value: any): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
}

export function formatCellValue(value: any, col: ColumnDef, attrs?: CellAttributes): React.ReactNode {
  if (value == null) return '-';

  let node: React.ReactNode;
  switch (col.type) {
    case 'datetime': node = formatDate(String(value)); break;
    case 'boolean': node = value ? 'Yes' : 'No'; break;
    case 'number':
      node = typeof value === 'number'
        ? (col.unit ? `${value.toLocaleString()} ${col.unit}` : value.toLocaleString())
        : String(value);
      break;
    case 'duration':
      node = typeof value === 'number' ? formatDurationMs(value / 1_000_000) : String(value);
      break;
    case 'bytes':
      node = typeof value === 'number' ? formatBytes(value) : String(value);
      break;
    case 'decimal':
      node = typeof value === 'number'
        ? (col.unit ? `${value.toFixed(2)} ${col.unit}` : value.toFixed(2))
        : String(value);
      break;
    case 'millicore': node = formatMillicores(value); break;
    case 'gauge':
      node = typeof value === 'number' ? <GaugeCell value={value} gauge={col.gauge} attrs={attrs} /> : String(value);
      break;
    case 'health': node = <HealthDot health={String(value)} />; break;
    case 'status': node = <StatusBadge value={String(value)} />; break;
    case 'labels': node = isTagLike(value) ? <TagBadges value={value} /> : String(value); break;
    default:
      if (col.badge) node = <BadgeCell value={String(value)} config={col.badge} />;
      else if (isTagLike(value)) node = <TagBadges value={value} />;
      else node = String(value);
  }

  if (attrs?.url) {
    node = <a href={attrs.url} className="text-blue-600 underline">{node}</a>;
  }
  return node;
}

function getRowValue(row: RowData, col: ColumnDef, colIndex: number): any {
  if (Array.isArray(row)) return row[colIndex];
  return row[col.name];
}

export default function DynamicTable({ columns, rows, cellAttributes, className, size }: DynamicTableProps) {
  const visibleCols = columns.filter((c) => !c.hidden);
  const headers = visibleCols.map((c) =>
    c.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
  );

  const colIndices = new Map(columns.map((c, i) => [c.name, i]));

  const tableRows = rows.map((row) =>
    visibleCols.map((col) => {
      const value = getRowValue(row, col, colIndices.get(col.name) ?? 0);
      const attrs = cellAttributes?.(row, col);
      return formatCellValue(value, col, attrs);
    }),
  );

  return <CompactTable variant="reference" columns={headers} data={tableRows} className={className} size={size} />;
}
