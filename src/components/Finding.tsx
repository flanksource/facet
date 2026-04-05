import React from 'react';
import { formatDateTime } from './Format';
import ListTable from './ListTable';
import Badge from './Badge';

export interface FindingBadge {
  label: string;
  className?: string;
  icon?: string | React.ComponentType<{ className?: string }>;
  dot?: string;
}

export interface Entity {
  name: string;
  type?: string;
  scope?: string;
  className?: string;
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
  const icon = badge.icon && typeof badge.icon !== 'string'
    ? badge.icon as React.ComponentType<{ className?: string }>
    : undefined;

  return (
    <Badge
      variant="custom"
      label={badge.label}
      icon={icon}
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
  const { id, title, summary, severity, outcome, tags, className,
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

  const entityRows = (entities || []).map((e) => ({
    name: e.name,
    type: e.type || '',
    scope: e.scope || '',
  }));

  const sampleRows = (samples || []).map((s) => {
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(s)) {
      row[k] = typeof v === 'boolean' ? (v ? '✓' : '✗') : String(v ?? '');
    }
    return row;
  });

  const complianceTags = tags?.filter((t) => t.className?.includes('green')) || [];
  const nonComplianceTags = tags?.filter((t) => !t.className?.includes('green')) || [];

  return (
    <div className={`mb-4 break-inside-avoid border border-gray-200 rounded-lg p-4 ${className || ''}`}>
      <div className="flex items-start gap-2 border-b border-gray-100 pb-2 mb-2">
        <Badge variant="custom" label={id} size={size} shape="square" className="font-mono bg-gray-50 text-gray-500 rounded-xs mt-0.5" />
        <h3 className="text-sm font-semibold text-gray-900 flex-1 min-w-0">{title}</h3>
      </div>
      {outcome && <FindingBadgeEl badge={outcome} size={size} />}

      <p className="text-sm text-gray-700 border-b border-gray-100 pb-2 mb-2">{summary}</p>

      {(timeRange || metrics) && (
        <div className="flex items-center flex-wrap gap-2 border-b border-gray-100 pb-2 mb-2">
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

      {entityRows.length > 0 && (
        <div className="border-b border-gray-100 pb-2 mb-2">
          <ListTable rows={entityRows} subject="name" keys={["type", "scope"]} size="xs" />
        </div>
      )}

      {sampleRows.length > 0 && (() => {
        const cols = Object.keys(sampleRows[0]);
        const subject = cols[0];
        const keys = cols.slice(1);
        return (
          <div className="border-b border-gray-100 pb-2 mb-2">
            <ListTable rows={sampleRows} subject={subject} keys={keys} size="xs" />
          </div>
        );
      })()}

      {recommendation && (
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Recommendation</span>
          <p className="text-xs text-amber-900 mt-0.5 font-medium">{recommendation}</p>
          {mitigations && mitigations.length > 0 && (
            <ul className="mt-1 ml-3 space-y-0">
              {mitigations.map((m, i) => <li key={i} className="text-xs text-amber-800 list-disc leading-4">{m}</li>)}
            </ul>
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

      {complianceTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {complianceTags.map((t, i) => <FindingBadgeEl key={i} badge={t} size={size} />)}
        </div>
      )}

      {nonComplianceTags.map((t, i) => <FindingBadgeEl key={i} badge={t} size={size} />)}
    </div>
  );
}
