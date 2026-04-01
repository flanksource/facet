export type FormatType =
  | 'date' | 'datetime' | 'relative'
  | 'bytes' | 'millicores' | 'duration'
  | 'number' | 'percent' | 'property';

export interface FormatProps {
  type: FormatType;
  value: number | string;
  unit?: string;
  precision?: number;
  text?: string;
  className?: string;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function formatMillicores(value: number | string): string {
  let mc: number;
  if (typeof value === 'string') {
    mc = parseInt(value.replace(/m$/, ''), 10);
    if (isNaN(mc)) return String(value);
  } else {
    mc = value;
  }
  if (mc === 0) return '0';
  if (mc > 0 && mc < 1) return '1m';
  if (mc >= 1000) {
    const cores = mc / 1000;
    return cores === Math.round(cores) ? `${Math.round(cores)}` : `${cores.toFixed(1)}`;
  }
  return `${Math.round(mc)}m`;
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export function formatDisplayValue(value: number, unit?: string, precision?: number): string {
  if (!unit) return Number(value.toFixed(precision ?? 0)).toString();
  switch (unit) {
    case 'percent': return `${Number(value.toFixed(precision ?? 0))}%`;
    case 'bytes': return formatBytes(value);
    case 'millicores':
    case 'millicore': return formatMillicores(value);
    default: return `${Number(value.toFixed(precision ?? 0))} ${unit}`;
  }
}

export function formatPropertyValue(value?: number, text?: string, unit?: string): string {
  if (text) return text;
  if (value == null) return '-';
  switch (unit) {
    case 'bytes': return formatBytes(value);
    case 'milliseconds': return formatDurationMs(value);
    case 'millicores': return formatMillicores(value);
    case 'epoch': return formatDate(new Date(value * 1000).toISOString());
    default: return String(value);
  }
}

export function getGaugeColor(
  percentage: number,
  thresholds: Array<{ percent: number; color: string }>,
): string {
  const sorted = [...thresholds].sort((a, b) => a.percent - b.percent);
  let color = '#3B82F6';
  for (const t of sorted) {
    if (percentage >= t.percent) color = t.color;
  }
  return color;
}

function safeNumber(value: number | string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatValue({ type, value, unit, precision, text }: FormatProps): string {
  switch (type) {
    case 'date': return formatDate(String(value));
    case 'datetime': return formatDateTime(String(value));
    case 'relative': return formatRelative(String(value));
    case 'bytes': return formatBytes(safeNumber(value));
    case 'millicores': return formatMillicores(value);
    case 'duration': return formatDurationMs(safeNumber(value));
    case 'number': return formatDisplayValue(safeNumber(value), unit, precision);
    case 'percent': return formatDisplayValue(safeNumber(value), 'percent', precision);
    case 'property': return formatPropertyValue(
      typeof value === 'number' ? value : undefined, text, unit);
    default: return String(value);
  }
}

export default function Format(props: FormatProps) {
  return <span className={props.className}>{formatValue(props)}</span>;
}
