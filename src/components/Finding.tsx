import React from 'react';
import { formatDateTime } from './Format';
import ListTable from './ListTable';
import Badge from './Badge';

export interface FindingBadge {
  label: string;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface Entity {
  name: string;
  type?: string;
  scope?: string;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface Sample {
  [key: string]: string | number | boolean | undefined;
}

export interface FindingProps {
  id: string;
  title: string;
  summary: string;
  className?: string;
  severity: FindingBadge;
  outcome?: FindingBadge;
  typeIcon?: React.ReactNode;
  tags?: FindingBadge[];
  timeRange?: { start: string; end: string; durationSeconds?: number };
  metrics?: Record<string, string | number>;
  entities?: Entity[];
  samples?: Sample[];
  recommendation?: string;
  mitigations?: string[];
  references?: string[];
  variant?: 'compact' | 'detail';
  size?: 'xs' | 'sm' | 'md';
}

function FindingBadgeEl({ badge, size = 'sm' }: { badge: FindingBadge; size?: 'xs' | 'sm' | 'md' }) {
  return (
    <Badge
      variant="custom"
      label={badge.label}
      icon={badge.icon}
      size={size}
      shape="pill"
      className={badge.className || 'bg-gray-100 text-gray-500'}
    />
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

export default function Finding(props: FindingProps) {
  const { id, title, summary, severity, outcome, typeIcon, tags, className,
    timeRange, metrics, entities, samples, recommendation, mitigations, references,
    variant = 'detail', size = 'sm' } = props;

  if (variant === 'compact') {
    return (
      <div className="border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <Badge variant="custom" label={id} size={size} shape="square" className="font-mono bg-gray-50 text-gray-500 rounded-xs" />
          <FindingBadgeEl badge={severity} size={size} />
          {outcome && <FindingBadgeEl badge={outcome} size={size} />}
          {tags?.map((t, i) => <FindingBadgeEl key={i} badge={t} size={size} />)}
        </div>
        <div className="text-xs text-gray-800">{title}</div>
      </div>
    );
  }

  const sampleRows = (samples || []).map((s) => {
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(s)) {
      row[k] = typeof v === 'boolean' ? (v ? '✓' : '✗') : String(v ?? '');
    }
    return row;
  });


  return (
    <section aria-label={title} className={`mb-3 break-inside-avoid rounded-md p-3 ${className || 'border border-gray-200'}`}>
      <div className="flex items-center gap-2 border-b border-gray-100 pb-1.5 mb-1.5 flex-nowrap">
        <Badge variant="custom" label={id} size={size} shape="square" className="font-mono bg-gray-50 text-gray-500 rounded-xs shrink-0" />
        {typeIcon && <span className="shrink-0 inline-flex items-center w-4 h-4 text-gray-500">{typeIcon}</span>}
        <h3 className="text-sm font-semibold text-gray-900 flex-1 min-w-0">{title}</h3>
        <FindingBadgeEl badge={severity} size={size} />
      </div>

      <p className="text-sm text-gray-700 leading-relaxed border-b border-gray-100 pb-1.5 mb-1.5">{summary}</p>

      {(timeRange || metrics) && (
        <div className="flex items-center flex-wrap gap-2 border-b border-gray-100 pb-1.5 mb-1.5">
          {timeRange && (
            <span className="text-xs text-gray-500">
              {formatDateTime(timeRange.start)} — {formatDateTime(timeRange.end)}
              {timeRange.durationSeconds != null && ` (${formatDuration(timeRange.durationSeconds)})`}
            </span>
          )}
          {metrics && Object.entries(metrics).filter(([, v]) => v != null).map(([key, val]) => (
            <Badge key={key} variant="custom" size={size} shape="rounded"
              label={formatKey(key)}
              value={typeof val === 'number' ? val.toLocaleString() : String(val)}
              className="bg-white border-gray-200 text-gray-800"
            />
          ))}
        </div>
      )}

      {entities && entities.length > 0 && (
        <div className="border-b border-gray-100 pb-1.5 mb-1.5">
          <span className="text-[8pt] font-semibold text-gray-400 uppercase tracking-wide">Affected Assets</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {entities.map((e, i) => (
              <Badge key={i} variant="custom" size="xs" shape="pill"
                icon={e.icon}
                label={e.type || ''}
                value={e.name}
                className={e.className || 'bg-gray-100 text-gray-700'}
              />
            ))}
          </div>
        </div>
      )}

      {sampleRows.length > 0 && (() => {
        const cols = Object.keys(sampleRows[0]);
        const subject = cols[0];
        const keys = cols.slice(1);
        return (
          <div className="border-b border-gray-100 pb-1.5 mb-1.5">
            <span className="text-[8pt] font-semibold text-gray-400 uppercase tracking-wide">Evidence</span>
            <ListTable rows={sampleRows} subject={subject} keys={keys} size="xs" cellClassName="font-mono" density="compact" wrap />
          </div>
        );
      })()}

      {recommendation && (
        <div className="bg-gray-50 border-l-2 border-l-amber-500 border-y border-r border-gray-200 rounded-r px-3 py-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[8pt] font-bold text-gray-700 uppercase tracking-wide">Recommended Action</span>
            {outcome && <FindingBadgeEl badge={outcome} size="xs" />}
          </div>
          <p className="text-xs text-gray-900 mt-0.5 font-medium">{recommendation}</p>
          {mitigations && mitigations.length > 0 && (
            <ol className="mt-1 ml-4 space-y-0.5 list-decimal">
              {mitigations.map((m, i) => <li key={i} className="text-xs text-gray-700 leading-relaxed pl-0.5">{m}</li>)}
            </ol>
          )}
        </div>
      )}

      {references && references.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {references.map((ref, i) => (
            <Badge key={i} variant="custom" label={ref} size={size} shape="rounded" className="bg-gray-100 text-gray-600" />
          ))}
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => <FindingBadgeEl key={i} badge={t} size={size} />)}
        </div>
      )}


    </section>
  );
}
