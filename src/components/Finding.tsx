import React from 'react';
import { formatDateTime, formatRelative } from './Format';
import ListTable from './ListTable';

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
}

function MdiIcon({ path, className }: { path: string; className?: string }) {
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" className={`inline-block align-middle ${className || ''}`}>
      <path fill="currentColor" d={path} />
    </svg>
  );
}

function BadgeEl({ badge }: { badge: FindingBadge }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className || 'bg-gray-100 text-gray-500'}`}>
      {badge.dot && <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />}
      {badge.icon && (typeof badge.icon === 'string'
        ? <MdiIcon path={badge.icon} />
        : <span className="inline-flex w-3.5 h-3.5">{React.createElement(badge.icon, { size: 14 })}</span>)}
      {badge.label}
    </span>
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
    variant = 'detail' } = props;

  if (variant === 'compact') {
    return (
      <div className="border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <code className="text-xs text-gray-500 font-mono">{id}</code>
          <BadgeEl badge={severity} />
          {outcome && <BadgeEl badge={outcome} />}
          {tags?.map((t, i) => <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${t.className || 'text-gray-400'}`}>{t.label}</span>)}
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

  return (
    <div className={`mb-6 break-inside-avoid ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap border-b border-gray-200 pb-2 mb-2">
        <code className="text-xs text-gray-500 font-mono">{id}</code>
        <BadgeEl badge={severity} />
        {outcome && <BadgeEl badge={outcome} />}
        {tags?.map((t, i) => <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${t.className || 'bg-gray-100 text-gray-400'}`}>{t.label}</span>)}
      </div>

      {/* Title & Summary */}
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-700 border-b border-gray-100 pb-2 mb-2">{summary}</p>

      {/* Time range */}
      {timeRange && (
        <p className="text-xs text-gray-500 border-b border-gray-100 pb-2 mb-2">
          {formatDateTime(timeRange.start)} — {formatDateTime(timeRange.end)}
          {timeRange.durationSeconds != null && ` (${formatDuration(timeRange.durationSeconds)})`}
        </p>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2 mb-2">
          {Object.entries(metrics).filter(([, v]) => v != null).map(([key, val]) => (
            <span key={key} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
              <span className="text-gray-400">{formatKey(key)}:</span>{' '}
              <span className="font-semibold text-gray-800">{typeof val === 'number' ? val.toLocaleString() : val}</span>
            </span>
          ))}
        </div>
      )}

      {/* Entities via ListTable */}
      {entityRows.length > 0 && (
        <div className="border-b border-gray-100 pb-2 mb-2">
          <ListTable
            rows={entityRows}
            subject="name"
            keys={["type"]}
            size="xs"
          />
        </div>
      )}

      {/* Samples via ListTable */}
      {sampleRows.length > 0 && (() => {
        const cols = Object.keys(sampleRows[0]);
        const subject = cols[0];
        const keys = cols.slice(1);
        return (
          <div className="border-b border-gray-100 pb-2 mb-2">
            <ListTable
              rows={sampleRows}
              subject={subject}
              keys={keys}
              size="xs"
            />
          </div>
        );
      })()}

      {/* Recommendation */}
      {recommendation && (
        <div className="border-b border-gray-100 pb-2 mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Recommendation: </span>
          <span className="text-xs text-gray-800">{recommendation}</span>
          {mitigations && mitigations.length > 0 && (
            <ul className="mt-1 ml-3">
              {mitigations.map((m, i) => <li key={i} className="text-xs text-gray-600 list-disc">{m}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* References */}
      {references && references.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {references.map((ref, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{ref}</span>
          ))}
        </div>
      )}
    </div>
  );
}
