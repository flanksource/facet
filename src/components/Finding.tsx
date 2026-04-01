import { formatDateTime, formatRelative } from './Format';

export interface FindingBadge {
  label: string;
  className?: string;
  icon?: string;
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
      {badge.icon && <MdiIcon path={badge.icon} />}
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

  return (
    <div className={`border rounded-lg p-4 mb-4 break-inside-avoid ${className || 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <code className="text-xs text-gray-500 font-mono">{id}</code>
        <BadgeEl badge={severity} />
        {outcome && <BadgeEl badge={outcome} />}
        {tags?.map((t, i) => <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${t.className || 'bg-gray-100 text-gray-400'}`}>{t.label}</span>)}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-xs text-gray-700 mb-2">{summary}</p>

      {timeRange && (
        <p className="text-xs text-gray-500 mb-2">
          {formatDateTime(timeRange.start)} — {formatDateTime(timeRange.end)}
          {timeRange.durationSeconds != null && ` (${formatDuration(timeRange.durationSeconds)})`}
        </p>
      )}

      {metrics && (
        <div className="flex flex-wrap gap-2 mb-2">
          {Object.entries(metrics).filter(([, v]) => v != null).map(([key, val]) => (
            <span key={key} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
              <span className="text-gray-400">{formatKey(key)}:</span>{' '}
              <span className="font-semibold text-gray-800">{typeof val === 'number' ? val.toLocaleString() : val}</span>
            </span>
          ))}
        </div>
      )}

      {entities && entities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {entities.map((e, i) => (
            <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${e.className || 'bg-gray-100 text-gray-700'}`}>
              {e.name}{e.type && <span className="text-gray-400"> ({e.type})</span>}
              {e.scope && <span className="text-gray-400"> @ {e.scope}</span>}
            </span>
          ))}
        </div>
      )}

      {samples && samples.length > 0 && (() => {
        const cols = Object.keys(samples[0]);
        return (
          <table className="w-full text-xs mb-2 border-collapse">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-200">
                {cols.map((col) => <th key={col} className="pb-1 pr-2 font-medium">{formatKey(col)}</th>)}
              </tr>
            </thead>
            <tbody>
              {samples.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {cols.map((col) => (
                    <td key={col} className="py-0.5 pr-2 text-gray-600 max-w-xs truncate">
                      {typeof row[col] === 'boolean' ? (row[col] ? '✓' : '✗') : String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })()}

      {recommendation && (
        <div className="bg-white/80 border border-gray-200 rounded p-2 mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Recommendation: </span>
          <span className="text-xs text-gray-800">{recommendation}</span>
          {mitigations && mitigations.length > 0 && (
            <ul className="mt-1 ml-3">
              {mitigations.map((m, i) => <li key={i} className="text-xs text-gray-600 list-disc">{m}</li>)}
            </ul>
          )}
        </div>
      )}

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
