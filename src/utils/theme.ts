import { scaled } from './font-scale';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Health = 'healthy' | 'warning' | 'unhealthy' | 'unknown';
export type Status = 'running' | 'active' | 'healthy' | 'ready' | 'succeeded'
  | 'warning' | 'degraded' | 'pending' | 'stopped'
  | 'terminated' | 'failed' | 'error' | 'unhealthy';
export type Purpose = 'primary' | 'backup' | 'dr';

export interface ColorPair { bg: string; fg: string }
export interface TypographyStyle { fontSize: string; lineHeight?: string; margin?: string }

export const Theme = {
  Severity: {
    Critical: '#DC2626',
    High: '#EA580C',
    Medium: '#D97706',
    Low: '#2563EB',
  },
  SeverityBg: {
    Critical: '#FEE2E2',
    High: '#FFEDD5',
    Medium: '#FEF3C7',
    Low: '#DBEAFE',
  },
  Health: {
    Healthy: '#16A34A',
    Warning: '#D97706',
    Unhealthy: '#DC2626',
    Unknown: '#6B7280',
  },
  Status: {
    Running:    { bg: '#DCFCE7', fg: '#166534' } as ColorPair,
    Active:     { bg: '#DCFCE7', fg: '#166534' } as ColorPair,
    Healthy:    { bg: '#DCFCE7', fg: '#166534' } as ColorPair,
    Ready:      { bg: '#DCFCE7', fg: '#166534' } as ColorPair,
    Succeeded:  { bg: '#DCFCE7', fg: '#166534' } as ColorPair,
    Warning:    { bg: '#FEF3C7', fg: '#92400E' } as ColorPair,
    Degraded:   { bg: '#FEF3C7', fg: '#92400E' } as ColorPair,
    Pending:    { bg: '#DBEAFE', fg: '#1E40AF' } as ColorPair,
    Stopped:    { bg: '#F3F4F6', fg: '#374151' } as ColorPair,
    Terminated: { bg: '#FEE2E2', fg: '#991B1B' } as ColorPair,
    Failed:     { bg: '#FEE2E2', fg: '#991B1B' } as ColorPair,
    Error:      { bg: '#FEE2E2', fg: '#991B1B' } as ColorPair,
    Unhealthy:  { bg: '#FEE2E2', fg: '#991B1B' } as ColorPair,
  },
  Purpose: {
    Primary: '#2563EB',
    Backup: '#D97706',
    DR: '#DC2626',
  },
  H1: { fontSize: scaled('22pt'), lineHeight: scaled('26pt'), margin: '0 0 4mm' } as TypographyStyle,
  H2: { fontSize: scaled('15pt'), lineHeight: scaled('19pt'), margin: '4mm 0 3mm' } as TypographyStyle,
  H3: { fontSize: scaled('12pt'), lineHeight: scaled('15pt'), margin: '3mm 0 2mm' } as TypographyStyle,
  H4: { fontSize: scaled('10pt'), lineHeight: scaled('12pt'), margin: '2mm 0 2mm' } as TypographyStyle,
  P:  { fontSize: scaled('9pt'), lineHeight: scaled('12pt'), margin: '0 0 3mm' } as TypographyStyle,
  Body: { fontSize: scaled('10pt'), lineHeight: scaled('14pt') } as TypographyStyle,
  TextXs:  { fontSize: scaled('7pt') } as TypographyStyle,
  TextSm:  { fontSize: scaled('9pt') } as TypographyStyle,
  TextBase: { fontSize: scaled('10pt') } as TypographyStyle,
  TextMd:  { fontSize: scaled('10pt') } as TypographyStyle,
  TextLg:  { fontSize: scaled('15pt') } as TypographyStyle,
  TextXl:  { fontSize: scaled('18pt') } as TypographyStyle,
  Text2xl: { fontSize: scaled('24pt') } as TypographyStyle,
  Brand: {
    FlanksourceBlue: '#2563eb',
    FlanksourceDark: '#1e293b',
  },
} as const;

// Lowercase lookup maps for runtime use (e.g., theme.health[value.toLowerCase()])
export const SEVERITY_COLORS: Record<string, string> = {
  critical: Theme.Severity.Critical, high: Theme.Severity.High,
  medium: Theme.Severity.Medium, low: Theme.Severity.Low,
};
export const SEVERITY_BG: Record<string, string> = {
  critical: Theme.SeverityBg.Critical, high: Theme.SeverityBg.High,
  medium: Theme.SeverityBg.Medium, low: Theme.SeverityBg.Low,
};
export const HEALTH_COLORS: Record<string, string> = {
  healthy: Theme.Health.Healthy, warning: Theme.Health.Warning,
  unhealthy: Theme.Health.Unhealthy, unknown: Theme.Health.Unknown,
};
export const STATUS_COLORS: Record<string, ColorPair> = {
  running: Theme.Status.Running, active: Theme.Status.Active,
  healthy: Theme.Status.Healthy, ready: Theme.Status.Ready,
  succeeded: Theme.Status.Succeeded, warning: Theme.Status.Warning,
  degraded: Theme.Status.Degraded, pending: Theme.Status.Pending,
  stopped: Theme.Status.Stopped, terminated: Theme.Status.Terminated,
  failed: Theme.Status.Failed, error: Theme.Status.Error,
  unhealthy: Theme.Status.Unhealthy,
};
export const PURPOSE_COLORS: Record<string, string> = {
  primary: Theme.Purpose.Primary, backup: Theme.Purpose.Backup, dr: Theme.Purpose.DR,
};
