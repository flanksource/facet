import React from 'react';
import type { Alert } from '../types/security';

interface AlertsTableProps {
  alerts: Alert[];
  className?: string;
}

interface GroupedAlert {
  severity: string;
  title: string;
  location?: string;
  references?: Array<{ label: string; url: string }>;
  count: number;
}

/**
 * Displays security alerts in a compact single-line format with ellipsis
 */
export default function AlertsTable({ alerts, className = '' }: AlertsTableProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const getSeverityClasses = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };

  // Group code-scanning alerts by location, keep others as-is
  const groupedAlerts: GroupedAlert[] = [];
  const alertsByLocation = new Map<string, Alert[]>();

  alerts.forEach(alert => {
    if (alert.type === 'code-scanning' && alert.location) {
      const existing = alertsByLocation.get(alert.location) || [];
      existing.push(alert);
      alertsByLocation.set(alert.location, existing);
    } else {
      groupedAlerts.push({
        severity: alert.severity,
        title: alert.title,
        location: alert.location,
        references: alert.references,
        count: 1
      });
    }
  });

  // Add grouped code-scanning alerts
  alertsByLocation.forEach((alerts, location) => {
    // Find the highest severity in this group
    const highestSeverity = alerts.reduce((highest, alert) => {
      return severityOrder[alert.severity] < severityOrder[highest.severity] ? alert : highest;
    }).severity;

    groupedAlerts.push({
      severity: highestSeverity,
      title: alerts[0].title,
      location,
      count: alerts.length
    });
  });

  // Sort by severity first, then by title
  const sortedAlerts = groupedAlerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className={`space-y-1 ${className}`}>
      {sortedAlerts.map((alert, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs min-w-0">
          <span className={`inline-block px-1.5 py-0.5 rounded  flex-shrink-0 ${getSeverityClasses(alert.severity)}`}>
            {alert.severity}
          </span>
          <span className="text-gray-700 truncate flex-1 min-w-0">
            {alert.title}
          </span>
          {alert.location && (
            <code className="text-gray-500 truncate-prefix flex-shrink-0 max-w-[50%] text-[10px] bg-gray-100 px-1 rounded">
              {alert.location.replaceAll(".github/workflows/", "")}
            </code>
          )}
          {alert.count > 1 && (
            <span className="inline-block px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded flex-shrink-0">
              ×{alert.count}
            </span>
          )}
          {alert.references && alert.references.length > 0 && (
            <span className="flex-shrink-0">
              {alert.references.map((ref, refIdx) => (
                <a
                  key={refIdx}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1"
                >
                  {ref.label}
                </a>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
