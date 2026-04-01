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
  H1: { fontSize: '22pt', lineHeight: '26pt', margin: '0 0 4mm' } as TypographyStyle,
  H2: { fontSize: '15pt', lineHeight: '19pt', margin: '4mm 0 3mm' } as TypographyStyle,
  H3: { fontSize: '12pt', lineHeight: '15pt', margin: '3mm 0 2mm' } as TypographyStyle,
  H4: { fontSize: '10pt', lineHeight: '12pt', margin: '2mm 0 2mm' } as TypographyStyle,
  P:  { fontSize: '9pt', lineHeight: '12pt', margin: '0 0 3mm' } as TypographyStyle,
  TextXs:  { fontSize: '7pt' } as TypographyStyle,
  TextSm:  { fontSize: '9pt' } as TypographyStyle,
  TextMd:  { fontSize: '10pt' } as TypographyStyle,
  TextLg:  { fontSize: '15pt' } as TypographyStyle,
  TextXl:  { fontSize: '18pt' } as TypographyStyle,
  Text2xl: { fontSize: '24pt' } as TypographyStyle,
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
