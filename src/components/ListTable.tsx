import React from 'react';
import Badge from './Badge';
import { formatDate, formatDateTime, formatRelative } from './Format';

export type TagMapping = (key: string, value: any) => string;
export type ListTableDateFormat = 'short' | 'long' | 'age';
export type ListTableTimeBucketFormat = 'time' | 'monthDay';

export interface ListTableGroup {
  by: 'date' | 'field';
  field?: string;
  title?: string;
}

export interface ListTableProps {
  rows: Record<string, any>[];
  subject: string;
  subtitle?: string;
  body?: string;
  date?: string;
  dateFormat?: ListTableDateFormat;
  primaryTags?: string[];
  secondaryTags?: string[];
  tagMapping?: TagMapping | TagMapping[];
  keys?: string[];
  icon?: string;
  iconMap?: (value: any) => React.ReactNode;
  iconRenderer?: (value: any, context: ListTableIconContext) => React.ReactNode;
  count?: string;
  title?: string;
  size?: 'xs' | 'sm' | 'md';
  density?: 'compact' | 'normal' | 'comfortable';
  emptyMessage?: string;
  className?: string;
  cellClassName?: string;
  maxRows?: number;
  overflowNote?: string;
  wrap?: boolean;
  groups?: ListTableGroup[];
}

export interface ListTablePublicGroup {
  key: string;
  label: string;
  value?: any;
  count: number;
  sampleRow?: Record<string, any>;
  definition: ListTableGroup;
}

export interface ListTableIconContext {
  kind: 'row' | 'group';
  field?: string;
  row?: Record<string, any>;
  group?: ListTablePublicGroup;
}

interface TimeBucket {
  key: string;
  label: string;
  dateFormat: ListTableTimeBucketFormat;
}

interface RowGroup {
  key: string;
  label: string;
  value?: any;
  count: number;
  rows: Record<string, any>[];
  sampleRow?: Record<string, any>;
  dateFormat?: ListTableTimeBucketFormat;
  group: ListTableGroup;
  children?: RowGroup[];
}

type DisplayDateFormat = ListTableDateFormat | ListTableTimeBucketFormat;

const DEFAULT_TAG_MAPPING: TagMapping = (_key, value) => {
  const v = String(value).toLowerCase();
  if (['critical', 'error', 'failed', 'unhealthy'].includes(v)) return 'text-red-700 bg-red-50 border-red-200';
  if (['high', 'warning', 'degraded'].includes(v)) return 'text-orange-700 bg-orange-50 border-orange-200';
  if (['medium'].includes(v)) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  if (['low', 'info', 'pending'].includes(v)) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (['success', 'healthy', 'running', 'active'].includes(v)) return 'text-green-700 bg-green-50 border-green-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
};

const SIZE_CONFIG = {
  xs: {
    row: 'text-[8.5pt] leading-[10pt]',
    subject: 'text-[8.5pt] leading-[10pt] font-medium text-slate-800',
    subtitle: 'text-[7.5pt] leading-[9pt] text-slate-600',
    date: 'text-[7.5pt] leading-[9pt]',
    body: 'text-[7.5pt] leading-[9pt] text-slate-500',
    key: 'text-[7.5pt] leading-[9pt] text-slate-400',
    gap: 'gap-[0.8mm]',
    tagSize: 'xxs' as const,
  },
  sm: {
    row: 'text-[9pt] leading-[11pt]',
    subject: 'text-[9pt] leading-[11pt] font-medium text-slate-800',
    subtitle: 'text-[8pt] leading-[10pt] text-slate-600',
    date: 'text-[8pt] leading-[10pt]',
    body: 'text-[8pt] leading-[10pt] text-slate-500',
    key: 'text-[8pt] leading-[10pt] text-slate-400',
    gap: 'gap-[1mm]',
    tagSize: 'xs' as const,
  },
  md: {
    row: 'text-[10pt] leading-[12pt]',
    subject: 'text-[10pt] leading-[12pt] font-medium text-slate-800',
    subtitle: 'text-[9pt] leading-[11pt] text-slate-600',
    date: 'text-[9pt] leading-[11pt]',
    body: 'text-[9pt] leading-[11pt] text-slate-500',
    key: 'text-[9pt] leading-[11pt] text-slate-400',
    gap: 'gap-[1.5mm]',
    tagSize: 'sm' as const,
  },
} as const;

const DENSITY_CONFIG = {
  compact: { py: '', border: 'border-b border-slate-100', bodyMt: '' },
  normal: { py: 'py-0.5', border: 'border-b border-slate-100', bodyMt: '-mt-px' },
  comfortable: { py: 'py-1.5', border: 'border-b border-slate-200', bodyMt: 'mt-px' },
} as const;

function splitColorClasses(classes: string): { textColor?: string; color?: string; borderColor?: string } {
  return classes.split(/\s+/).reduce<{ textColor?: string; color?: string; borderColor?: string }>((acc, token) => {
    if (token.startsWith('text-')) {
      acc.textColor = token;
    } else if (token.startsWith('bg-')) {
      acc.color = token;
    } else if (token.startsWith('border-')) {
      acc.borderColor = token;
    }
    return acc;
  }, {});
}

function resolveTagClasses(tagMapping: TagMapping | TagMapping[] | undefined, key: string, value: any): string {
  if (!tagMapping) return DEFAULT_TAG_MAPPING(key, value);
  const fns = Array.isArray(tagMapping) ? tagMapping : [tagMapping];
  for (const fn of fns) {
    const result = fn(key, value);
    if (result) return result;
  }
  return DEFAULT_TAG_MAPPING(key, value);
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatMonthDay(value: string): string {
  const d = new Date(value);
  const now = new Date();
  if (d.getFullYear() !== now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getTimeBucket(value: string): TimeBucket {
  const d = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);

  if (diffDays < 0) {
    const ahead = -diffDays;
    if (ahead <= 6) {
      return { key: `future-day-${ahead}`, label: formatDayLabel(d), dateFormat: 'time' };
    }
    if (ahead <= 30) {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4);
      return {
        key: `future-week-${formatMonthDay(weekStart.toISOString())}`,
        label: `${formatMonthDay(weekStart.toISOString())} – ${formatMonthDay(weekEnd.toISOString())}`,
        dateFormat: 'monthDay',
      };
    }
    return {
      key: `future-month-${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      dateFormat: 'monthDay',
    };
  }
  if (diffDays === 0) {
    return { key: 'today', label: formatDayLabel(d), dateFormat: 'time' };
  }
  if (diffDays <= 6) {
    return { key: `day-${diffDays}`, label: formatDayLabel(d), dateFormat: 'time' };
  }
  if (diffDays <= 30) {
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4);
    return {
      key: `week-${formatMonthDay(weekStart.toISOString())}`,
      label: `${formatMonthDay(weekStart.toISOString())} – ${formatMonthDay(weekEnd.toISOString())}`,
      dateFormat: 'monthDay',
    };
  }
  return {
    key: `month-${d.getFullYear()}-${d.getMonth()}`,
    label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    dateFormat: 'monthDay',
  };
}

function formatDateValue(value: string, format: DisplayDateFormat): string {
  switch (format) {
    case 'age':
      return formatRelative(value);
    case 'long':
      return formatDateTime(value);
    case 'time':
      return formatTime(value);
    case 'monthDay':
      return formatMonthDay(value);
    case 'short':
    default:
      return formatDate(value);
  }
}

function renderValue(value: any): React.ReactNode {
  if (value == null) {
    return null;
  }
  if (React.isValidElement(value) || Array.isArray(value) || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
}

function TagBadge({ tagKey, value, tagMapping, sc }: {
  tagKey: string;
  value: any;
  tagMapping: TagMapping | TagMapping[] | undefined;
  sc: (typeof SIZE_CONFIG)[keyof typeof SIZE_CONFIG];
}) {
  const { color, textColor, borderColor } = splitColorClasses(resolveTagClasses(tagMapping, tagKey, value));
  return (
    <Badge
      variant="custom"
      size={sc.tagSize}
      shape="rounded"
      label={String(value)}
      color={color}
      textColor={textColor}
      borderColor={borderColor}
    />
  );
}

function toPublicGroup(group: RowGroup): ListTablePublicGroup {
  return {
    key: group.key,
    label: group.label,
    value: group.value,
    count: group.count,
    sampleRow: group.sampleRow,
    definition: group.group,
  };
}

function getIconRenderer(props: ListTableProps): ListTableProps['iconRenderer'] | undefined {
  if (props.iconRenderer) {
    return props.iconRenderer;
  }

  if (props.iconMap) {
    return (value, context) => context.kind === 'row' ? props.iconMap?.(value) : null;
  }

  return undefined;
}

function ListRow({
  row,
  props,
  sc,
  dc,
  cellClassName,
  wrap,
  dateFormatOverride,
}: {
  row: Record<string, any>;
  props: ListTableProps;
  sc: (typeof SIZE_CONFIG)[keyof typeof SIZE_CONFIG];
  dc: (typeof DENSITY_CONFIG)[keyof typeof DENSITY_CONFIG];
  cellClassName?: string;
  wrap?: boolean;
  dateFormatOverride?: ListTableTimeBucketFormat;
}) {
  const subjectVal = row[props.subject] ?? '-';
  const subtitleVal = props.subtitle ? row[props.subtitle] : undefined;
  const bodyVal = props.body ? row[props.body] : undefined;
  const dateVal = props.date ? row[props.date] : undefined;
  const countVal = props.count ? Number(row[props.count]) : 0;
  const iconVal = props.icon ? row[props.icon] : undefined;
  const iconRenderer = getIconRenderer(props);
  const hasIconColumn = Boolean(props.icon && iconRenderer);
  const renderedIcon = hasIconColumn && iconVal != null
    ? iconRenderer?.(iconVal, { kind: 'row', field: props.icon, row })
    : null;

  return (
    <div className={`${dc.border} last:border-b-0 ${dc.py}`}>
      <div className={`flex items-center ${wrap ? 'flex-wrap' : ''} ${sc.gap} ${sc.row}`}>
        {dateVal && (
          <span className={`${sc.date} text-slate-400 font-mono whitespace-nowrap shrink-0 ${!hasIconColumn ? 'mr-[1.2mm]' : ''} ${cellClassName || ''}`}>
            {formatDateValue(String(dateVal), dateFormatOverride ?? props.dateFormat ?? 'age')}
          </span>
        )}
        {hasIconColumn && (
          <span className="inline-flex shrink-0 w-4 h-4 items-center justify-center">
            {renderedIcon}
          </span>
        )}
        <span className={`${sc.subject} ${wrap ? '' : 'whitespace-nowrap'} ${cellClassName || ''}`}>
          {renderValue(subjectVal)}
        </span>
        {subtitleVal != null && (
          <span className={`${sc.subtitle} ${wrap ? '' : 'whitespace-nowrap'} ${cellClassName || ''}`}>
            {renderValue(subtitleVal)}
          </span>
        )}
        {(props.primaryTags ?? []).map((tagKey) => {
          const value = row[tagKey];
          if (value == null) return null;
          return <TagBadge key={tagKey} tagKey={tagKey} value={value} tagMapping={props.tagMapping} sc={sc} />;
        })}
        <span className="flex-1" />
        {(props.secondaryTags ?? []).map((tagKey) => {
          const value = row[tagKey];
          if (value == null) return null;
          return <TagBadge key={tagKey} tagKey={tagKey} value={value} tagMapping={props.tagMapping} sc={sc} />;
        })}
        {(props.keys ?? []).map((key) => {
          const value = row[key];
          if (value == null) return null;
          return (
            <span key={key} className={`${sc.key} ${wrap ? '' : 'whitespace-nowrap shrink-0'} ${cellClassName || ''}`}>
              {renderValue(value)}
            </span>
          );
        })}
        {countVal > 1 && (
          <Badge
            variant="label"
            size={sc.tagSize}
            shape="rounded"
            label="count"
            value={String(countVal)}
          />
        )}
      </div>
      {bodyVal != null && (
        <div className={`${sc.body} ${dc.bodyMt}`}>
          {renderValue(bodyVal)}
        </div>
      )}
    </div>
  );
}

function resolveGroupLabel(label: string, title?: string): string {
  return title ? `${title}: ${label}` : label;
}

function buildGroups(rows: Record<string, any>[], groups: ListTableGroup[], dateField?: string): RowGroup[] {
  const [current, ...rest] = groups;
  if (!current) {
    return [];
  }

  const groupMap = new Map<string, RowGroup>();
  const ordered: RowGroup[] = [];

  for (const row of rows) {
    let key = 'unknown';
    let label = 'Unknown';
    let value: any = undefined;
    let dateFormat: ListTableTimeBucketFormat | undefined;

    if (current.by === 'date') {
      const raw = dateField ? row[dateField] : undefined;
      if (raw != null && raw !== '') {
        const bucket = getTimeBucket(String(raw));
        key = bucket.key;
        label = resolveGroupLabel(bucket.label, current.title);
        value = raw;
        dateFormat = bucket.dateFormat;
      } else {
        label = resolveGroupLabel('Unknown', current.title);
      }
    } else {
      const field = current.field ?? '';
      value = field ? row[field] : undefined;
      label = resolveGroupLabel(value == null || value === '' ? 'Unknown' : String(value), current.title);
      key = field ? `${field}:${label}` : label;
    }

    let group = groupMap.get(key);
    if (!group) {
      group = {
        key,
        label,
        value,
        count: 0,
        rows: [],
        sampleRow: row,
        dateFormat,
        group: current,
      };
      groupMap.set(key, group);
      ordered.push(group);
    }

    group.count += 1;
    group.rows.push(row);
  }

  if (rest.length > 0) {
    for (const group of ordered) {
      group.children = buildGroups(group.rows, rest, dateField);
    }
  }

  return ordered;
}

function FieldGroupHeader({ group, iconRenderer }: { group: RowGroup; iconRenderer?: ListTableProps['iconRenderer'] }) {
  const icon = iconRenderer?.(group.value, { kind: 'group', field: group.group.field, group: toPublicGroup(group) });

  return (
    <div className="flex items-center gap-[1mm] mb-[1mm]">
      {icon && <span className="inline-flex shrink-0 w-[3mm] h-[3mm] items-center justify-center">{icon}</span>}
      <span className="text-[8pt] font-semibold text-slate-900">{group.label}</span>
      <span className="text-[7pt] text-slate-400">({group.count})</span>
    </div>
  );
}

function renderGroupedRows(
  groups: RowGroup[],
  props: ListTableProps,
  sc: (typeof SIZE_CONFIG)[keyof typeof SIZE_CONFIG],
  dc: (typeof DENSITY_CONFIG)[keyof typeof DENSITY_CONFIG],
  cellClassName?: string,
  wrap?: boolean,
  inheritedDateFormat?: ListTableTimeBucketFormat,
  iconRenderer?: ListTableProps['iconRenderer'],
  level = 0,
): React.ReactNode {
  return groups.map((group) => {
    const effectiveDateFormat = group.group.by === 'date' ? group.dateFormat : inheritedDateFormat;
    const content = group.children?.length
      ? renderGroupedRows(group.children, props, sc, dc, cellClassName, wrap, effectiveDateFormat, iconRenderer, level + 1)
      : (
        <div className="flex flex-col">
          {group.rows.map((row, index) => (
            <ListRow
              key={row.id ?? index}
              row={row}
              props={props}
              sc={sc}
              dc={dc}
              cellClassName={cellClassName}
              wrap={wrap}
              dateFormatOverride={effectiveDateFormat}
            />
          ))}
        </div>
      );

    if (group.group.by === 'date') {
      return (
        <div key={group.key} className="mb-[3mm]">
          <div className="text-[8pt] font-semibold text-slate-500 border-b border-slate-200 pb-[0.8mm] mb-[1mm]">
            {group.label}
            <span className="font-normal text-slate-400 ml-[1mm]">({group.count})</span>
          </div>
          {content}
        </div>
      );
    }

    return (
      <div key={group.key} className={level > 0 ? '' : 'mb-[3mm]'}>
        <FieldGroupHeader group={group} iconRenderer={iconRenderer} />
        <div className={level > 0 ? 'ml-[4mm] border-l border-slate-200 pl-[2.5mm]' : ''}>
          {content}
        </div>
      </div>
    );
  });
}

export default function ListTable(props: ListTableProps) {
  const {
    rows,
    title,
    size = 'sm',
    density = 'normal',
    emptyMessage = 'No items.',
    className = '',
    cellClassName,
    maxRows,
    overflowNote,
    wrap,
    groups = [],
  } = props;
  const sc = SIZE_CONFIG[size];
  const dc = DENSITY_CONFIG[density];
  const iconRenderer = getIconRenderer(props);
  const visibleRows = maxRows != null ? rows.slice(0, maxRows) : rows;
  const overflowCount = maxRows != null ? rows.length - maxRows : 0;
  const appliedGroups = groups.slice(0, 2);

  return (
    <div className={className}>
      {title && <h4 className="text-sm font-semibold text-slate-800 mb-1">{title}</h4>}
      {rows.length === 0 ? (
        <p className={`${sc.body} italic`}>{emptyMessage}</p>
      ) : appliedGroups.length > 0 ? (
        <>
          <div className="flex flex-col">
            {renderGroupedRows(buildGroups(visibleRows, appliedGroups, props.date), props, sc, dc, cellClassName, wrap, undefined, iconRenderer)}
          </div>
          {overflowCount > 0 && (
            <div className={`${dc.py} ${sc.row} text-slate-400 italic`}>
              {overflowNote || `+ ${overflowCount} more`}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col">
          {visibleRows.map((row, index) => (
            <ListRow key={row.id ?? index} row={row} props={props} sc={sc} dc={dc} cellClassName={cellClassName} wrap={wrap} />
          ))}
          {overflowCount > 0 && (
            <div className={`${dc.py} ${sc.row} text-slate-400 italic`}>
              {overflowNote || `+ ${overflowCount} more`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
