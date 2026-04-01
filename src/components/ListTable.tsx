import React from 'react';
import { formatDate, formatDateTime, formatRelative } from './Format';

export type TagMapping = (key: string, value: any) => string;

export interface ListTableProps {
  rows: Record<string, any>[];
  subject: string;
  subtitle?: string;
  body?: string;
  date?: string;
  dateFormat?: 'short' | 'long' | 'age';
  primaryTags?: string[];
  secondaryTags?: string[];
  tagMapping?: TagMapping | TagMapping[];
  keys?: string[];
  icon?: string;
  iconMap?: (value: any) => React.ReactNode;
  count?: string;
  title?: string;
  size?: 'xs' | 'sm' | 'md';
  emptyMessage?: string;
  className?: string;
}

const DEFAULT_TAG_MAPPING: TagMapping = (_key, value) => {
  const v = String(value).toLowerCase();
  if (['critical', 'error', 'failed', 'unhealthy'].includes(v)) return 'text-red-700 bg-red-50 border-red-200';
  if (['high', 'warning', 'degraded'].includes(v)) return 'text-orange-700 bg-orange-50 border-orange-200';
  if (['medium'].includes(v)) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  if (['low', 'info', 'pending'].includes(v)) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (['success', 'healthy', 'running', 'active'].includes(v)) return 'text-green-700 bg-green-50 border-green-200';
  return 'text-gray-600 bg-gray-50 border-gray-200';
};

const SIZE_CONFIG = {
  xs: { row: 'text-xs', date: 'text-xs', body: 'text-xs text-gray-500 -mt-px', badge: 'text-xs', gap: 'gap-0.5', py: '' },
  sm: { row: 'text-sm', date: 'text-xs', body: 'text-xs text-gray-500 -mt-px', badge: 'text-xs', gap: 'gap-1', py: 'py-px' },
  md: { row: 'text-sm', date: 'text-xs', body: 'text-sm text-gray-500 -mt-px', badge: 'text-sm', gap: 'gap-1', py: 'py-px' },
} as const;

function resolveTagClasses(tagMapping: TagMapping | TagMapping[] | undefined, key: string, value: any): string {
  if (!tagMapping) return DEFAULT_TAG_MAPPING(key, value);
  const fns = Array.isArray(tagMapping) ? tagMapping : [tagMapping];
  for (const fn of fns) {
    const result = fn(key, value);
    if (result) return result;
  }
  return DEFAULT_TAG_MAPPING(key, value);
}

function formatDateValue(value: string, format: 'short' | 'long' | 'age'): string {
  switch (format) {
    case 'age': return formatRelative(value);
    case 'long': return formatDateTime(value);
    case 'short':
    default: return formatDate(value);
  }
}

function TagBadge({ tagKey, value, tagMapping, sc }: {
  tagKey: string; value: any;
  tagMapping: TagMapping | TagMapping[] | undefined;
  sc: typeof SIZE_CONFIG['sm'];
}) {
  const classes = resolveTagClasses(tagMapping, tagKey, value);
  return (
    <span className={`${sc.badge} leading-none px-1 py-px rounded border font-semibold whitespace-nowrap shrink-0 ${classes}`}>
      {String(value)}
    </span>
  );
}

function ListRow({ row, props, sc }: { row: Record<string, any>; props: ListTableProps; sc: typeof SIZE_CONFIG['sm'] }) {
  const subjectVal = row[props.subject] ?? '-';
  const subtitleVal = props.subtitle ? row[props.subtitle] : undefined;
  const bodyVal = props.body ? row[props.body] : undefined;
  const dateVal = props.date ? row[props.date] : undefined;
  const countVal = props.count ? Number(row[props.count]) : 0;
  const iconVal = props.icon ? row[props.icon] : undefined;

  return (
    <div className={`border-b border-gray-100 last:border-b-0 ${sc.py}`}>
      <div className={`flex items-center ${sc.gap} ${sc.row}`}>
        {dateVal && (
          <span className={`${sc.date} text-gray-400 font-mono whitespace-nowrap shrink-0`}>
            {formatDateValue(String(dateVal), props.dateFormat ?? 'age')}
          </span>
        )}
        {iconVal != null && props.iconMap && (
          <span className="inline-flex shrink-0 w-4 h-4 items-center justify-center">
            {props.iconMap(iconVal)}
          </span>
        )}
        <span className="font-medium text-slate-800 whitespace-nowrap">{subjectVal}</span>
          {subtitleVal && (
            <span className="text-slate-600 whitespace-nowrap">{String(subtitleVal)}</span>
          )}
          {(props.primaryTags ?? []).map((tagKey) => {
            const val = row[tagKey];
            if (val == null) return null;
            return <TagBadge key={tagKey} tagKey={tagKey} value={val} tagMapping={props.tagMapping} sc={sc} />;
          })}
          <span className="flex-1" />
          {(props.secondaryTags ?? []).map((tagKey) => {
            const val = row[tagKey];
            if (val == null) return null;
            return <TagBadge key={tagKey} tagKey={tagKey} value={val} tagMapping={props.tagMapping} sc={sc} />;
          })}
          {(props.keys ?? []).map((k) => {
            const val = row[k];
            if (val == null) return null;
            return <span key={k} className="text-gray-400 whitespace-nowrap shrink-0">{String(val)}</span>;
          })}
          {countVal > 1 && (
            <span className={`${sc.badge} text-gray-400 bg-gray-100 px-1 rounded shrink-0`}>x{countVal}</span>
          )}
      </div>
      {bodyVal && (
        <div className={`${sc.body} truncate`}>
          {String(bodyVal)}
        </div>
      )}
    </div>
  );
}

export default function ListTable(props: ListTableProps) {
  const { rows, title, size = 'sm', emptyMessage = 'No items.', className = '' } = props;
  const sc = SIZE_CONFIG[size];

  return (
    <div className={className}>
      {title && <h4 className="text-sm font-semibold text-slate-800 mb-1">{title}</h4>}
      {rows.length === 0 ? (
        <p className={`${sc.body} italic`}>{emptyMessage}</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => <ListRow key={i} row={row} props={props} sc={sc} />)}
        </div>
      )}
    </div>
  );
}
