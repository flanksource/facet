import type { LintIssue, LintLocation } from './types.js';

export function issueLocations(issue: LintIssue): LintLocation[] {
  if (issue.locations) return issue.locations;
  return issue.line === undefined ? [] : [{ type: 'source', line: issue.line, ...(issue.column === undefined ? {} : { column: issue.column }) }];
}

export function formatLocation(location: LintLocation): string {
  switch (location.type) {
    case 'source': return `${location.line}:${location.column ?? 1}`;
    case 'png': return location.x === undefined ? `image ${location.image.width}×${location.image.height} px` : `pixel (${location.x}, ${location.y})`;
    case 'pdf': return [`page ${location.page}`, location.object, location.resource].filter(Boolean).join(' · ');
    case 'docx': return [location.part, location.elementPath, location.relationshipId, location.asset, location.pdf ? formatLocation(location.pdf) : undefined].filter(Boolean).join(' · ');
  }
}

export function compactReportValue(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    const entries = value.map(compactReportValue).filter(entry => entry !== undefined);
    return entries.length ? entries : undefined;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).map(([key, entry]) => [key, compactReportValue(entry)] as const).filter(([, entry]) => entry !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  throw new Error(`Unsupported lint metadata value: ${String(value)}`);
}
