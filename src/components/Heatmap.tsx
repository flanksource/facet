import React from 'react';

type CalendarStatus = 'success' | 'failed' | 'none';

export interface HeatmapValue {
  date: string;
  successful: number;
  failed: number;
  count: number;
  size?: string;
}

export interface HeatmapProps {
  values: HeatmapValue[];
  variant?: 'calendar' | 'compact';
  dateKey?: string;
}

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SUCCESS_STATUSES = new Set(['success', 'successful', 'completed']);
const FAILURE_STATUSES = new Set(['failed', 'failure', 'error', 'errored', 'cancelled', 'canceled']);

const CALENDAR_CELL_CLASSES: Record<CalendarStatus, string> = {
  success: 'bg-green-50 border border-green-600',
  failed: 'bg-red-50 border border-red-600',
  none: 'bg-gray-100 border border-gray-200',
};

const CALENDAR_TEXT_CLASSES: Record<CalendarStatus, string> = {
  success: 'text-green-700',
  failed: 'text-red-600',
  none: 'text-gray-400',
};

const COMPACT_CELL_STYLES: Record<'success' | 'mixed' | 'failed' | 'none', { bg: string; border: string }> = {
  success: { bg: '#BBF7D0', border: '#86EFAC' },
  mixed: { bg: '#FED7AA', border: '#FDBA74' },
  failed: { bg: '#FECACA', border: '#FCA5A5' },
  none: { bg: '#F3F4F6', border: '#E5E7EB' },
};

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDateKey(value: unknown): string | null {
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    if (DATE_ONLY_REGEX.test(s)) return s;
    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return null;
    return formatDateKey(parsed);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDateKey(value);
  return null;
}

function getCalendarStatus(value: HeatmapValue | undefined): CalendarStatus {
  if (!value) return 'none';
  const total = value.count > 0 ? value.count : value.successful + value.failed;
  if (total <= 0) return 'none';
  if (value.failed > 0) return 'failed';
  if (value.successful > 0) return 'success';
  return 'none';
}

function getCellLabel(value: HeatmapValue | undefined): string | undefined {
  if (!value) return undefined;
  if (value.size) return value.size;
  const total = value.count > 0 ? value.count : value.successful + value.failed;
  return total > 0 ? `${total}` : undefined;
}

function getTooltipText(date: string, value: HeatmapValue | undefined): string {
  if (!value) return `${date}: No data`;
  const total = value.count > 0 ? value.count : value.successful + value.failed;
  return `${date}: ${value.successful} successful, ${value.failed} failed (${total} total)`;
}

export function buildHeatmapValues(rows: Array<Record<string, unknown>>, dateKey?: string): HeatmapValue[] {
  const byDate = new Map<string, HeatmapValue>();

  for (const row of rows) {
    const date = toDateKey(dateKey ? row[dateKey] : (row.date ?? row.day ?? row.timestamp));
    if (!date) continue;

    const status = typeof row.status === 'string' ? row.status.toLowerCase().trim() : undefined;
    let successful = Number(row.successful) || 0;
    let failed = Number(row.failed) || 0;
    let count = Number(row.count) || 0;

    if (count <= 0) count = successful + failed;
    if (successful <= 0 && failed <= 0) {
      if (status && SUCCESS_STATUSES.has(status)) successful = count > 0 ? count : 1;
      else if (status && FAILURE_STATUSES.has(status)) failed = count > 0 ? count : 1;
      else if (count > 0) successful = count;
    }
    if (count <= 0) count = successful + failed;

    const size = typeof row.size === 'string' && row.size.trim() ? row.size.trim() : undefined;
    const existing = byDate.get(date);
    if (existing) {
      existing.successful += successful;
      existing.failed += failed;
      existing.count += count;
      if (size) existing.size = size;
    } else {
      byDate.set(date, { date, successful, failed, count, size });
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function groupByMonth(values: HeatmapValue[]): Array<{ key: string; values: HeatmapValue[] }> {
  const buckets = new Map<string, HeatmapValue[]>();
  for (const v of values) {
    const key = v.date.slice(0, 7);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(v);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, vals]) => ({ key, values: vals }));
}

function CalendarMonth({ values, monthKey }: { values: HeatmapValue[]; monthKey?: string }) {
  const byDate = new Map(values.map((v) => [v.date, v]));

  let year: number, month: number;
  if (monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    year = Number.isFinite(y) ? y : new Date().getFullYear();
    month = Number.isFinite(m) ? m - 1 : new Date().getMonth();
  } else if (values.length > 0) {
    const latest = new Date(`${values[values.length - 1].date}T00:00:00`);
    year = !Number.isNaN(latest.getTime()) ? latest.getFullYear() : new Date().getFullYear();
    month = !Number.isNaN(latest.getTime()) ? latest.getMonth() : new Date().getMonth();
  } else {
    year = new Date().getFullYear();
    month = new Date().getMonth();
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const label = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <p className="text-[8pt] font-semibold text-slate-700 mb-[1.5mm]">{label}</p>
      <div className="grid grid-cols-7 gap-[0.8mm]">
        {DAY_HEADERS.map((day) => (
          <div key={day} className="text-center text-[6pt] text-gray-500 pb-[0.5mm]">{day}</div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const value = byDate.get(key);
          const status = getCalendarStatus(value);
          const cellLabel = getCellLabel(value);

          return (
            <div key={key} title={getTooltipText(key, value)}
              className={`${CALENDAR_CELL_CLASSES[status]} rounded-[1mm] p-[0.7mm] min-h-[8.5mm] flex flex-col justify-between`}>
              <span className="text-[6pt] text-gray-700 font-semibold leading-none">{day}</span>
              {cellLabel && <span className={`text-[5.5pt] leading-none ${CALENDAR_TEXT_CLASSES[status]}`}>{cellLabel}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-[2mm] mt-[1.5mm] text-[6pt] text-gray-600">
        <span className="flex items-center gap-[0.7mm]">
          <span className="inline-block w-[2.5mm] h-[2.5mm] bg-green-50 border border-green-600 rounded-[0.5mm]" /> Success
        </span>
        <span className="flex items-center gap-[0.7mm]">
          <span className="inline-block w-[2.5mm] h-[2.5mm] bg-red-50 border border-red-600 rounded-[0.5mm]" /> Failed
        </span>
        <span className="flex items-center gap-[0.7mm]">
          <span className="inline-block w-[2.5mm] h-[2.5mm] bg-gray-100 border border-gray-200 rounded-[0.5mm]" /> None
        </span>
      </div>
    </div>
  );
}

function getCompactCellKind(value?: HeatmapValue): 'success' | 'mixed' | 'failed' | 'none' {
  if (!value) return 'none';
  const total = value.count > 0 ? value.count : value.successful + value.failed;
  if (total <= 0) return 'none';
  if (value.failed <= 0) return 'success';
  return value.successful / total >= 0.5 ? 'mixed' : 'failed';
}

function CompactHeatmap({ values }: { values: HeatmapValue[] }) {
  let startDate: Date, endDate: Date;
  if (values.length === 0) {
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(endDate.getDate() - 120);
  } else {
    startDate = new Date(`${values[0].date}T00:00:00`);
    endDate = new Date(`${values[values.length - 1].date}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 120);
    }
  }

  const byDate = new Map(values.map((v) => [v.date, v]));
  const aligned = new Date(startDate);
  aligned.setDate(aligned.getDate() - aligned.getDay());
  const endAligned = new Date(endDate);
  endAligned.setDate(endAligned.getDate() + (6 - endAligned.getDay()));

  const weeks: Array<Array<{ date: string; inRange: boolean; value?: HeatmapValue }>> = [];
  const cursor = new Date(aligned);
  while (cursor <= endAligned) {
    const week: typeof weeks[0] = [];
    for (let d = 0; d < 7; d++) {
      const date = formatDateKey(cursor);
      week.push({ date, inRange: cursor >= startDate && cursor <= endDate, value: byDate.get(date) });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const weekCount = Math.max(weeks.length, 1);
  const gapMm = 0.3;
  const cellMm = Math.max(0.9, Math.min(2.2, (82 - (weekCount - 1) * gapMm) / weekCount));

  return (
    <div>
      <div className="text-[6pt] text-gray-500 mb-[1mm]">
        {formatDateKey(startDate)} to {formatDateKey(endDate)}
      </div>
      <div className="flex" style={{ columnGap: `${gapMm}mm` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col" style={{ rowGap: `${gapMm}mm` }}>
            {week.map((day) => {
              if (!day.inRange) {
                return <span key={day.date} className="inline-block rounded-[0.4mm]"
                  style={{ width: `${cellMm}mm`, height: `${cellMm}mm`, backgroundColor: 'transparent' }} />;
              }
              const kind = getCompactCellKind(day.value);
              const style = COMPACT_CELL_STYLES[kind];
              return <span key={day.date} title={getTooltipText(day.date, day.value)}
                className="inline-block rounded-[0.4mm] border"
                style={{ width: `${cellMm}mm`, height: `${cellMm}mm`, backgroundColor: style.bg, borderColor: style.border }} />;
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-[2mm] mt-[1.5mm] text-[6pt] text-gray-600">
        {(['success', 'mixed', 'failed'] as const).map((k) => (
          <span key={k} className="flex items-center gap-[0.7mm]">
            <span className="inline-block w-[2.5mm] h-[2.5mm] rounded-[0.5mm] border"
              style={{ backgroundColor: COMPACT_CELL_STYLES[k].bg, borderColor: COMPACT_CELL_STYLES[k].border }} />
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Heatmap({ values, variant = 'calendar' }: HeatmapProps) {
  if (variant === 'compact') return <CompactHeatmap values={values} />;

  const months = groupByMonth(values);
  if (months.length === 0) return <CalendarMonth values={[]} />;

  return (
    <div className="flex flex-col gap-[3mm]">
      {months.map((g) => <CalendarMonth key={g.key} values={g.values} monthKey={g.key} />)}
    </div>
  );
}
