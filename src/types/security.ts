export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType = 'dependabot' | 'code-scanning' | 'secret-scanning';

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  url?: string;
  location?: string;
  references?: Array<{ label: string; url: string }>;
}

export interface SeverityTrend {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface SecurityTrend {
  recentlyClosed: number;
  recentlyClosedDependabot: number;
  recentlyClosedCodeScanning: number;
  totalClosed: number;
  bySeverity: SeverityTrend;
}
