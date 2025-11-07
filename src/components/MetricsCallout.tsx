import React from 'react';
import { Icon } from '@iconify/react';

interface Metric {
  value: string;
  label: string;
  icon?: string | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

interface MetricsCalloutProps {
  metrics: Metric[];
  variant?: 'primary' | 'secondary';
}

/**
 * Render icon - supports:
 * - JSX Icon components from unplugin-icons (React components)
 * - Iconify icons (ion:*) via @iconify/react
 * - Emoji/text fallback
 */
function renderIcon(
  icon?: string | React.ComponentType<{ className?: string; style?: React.CSSProperties }>,
  size: number = 24
) {
  if (!icon) return null;

  // JSX Icon component (from unplugin-icons or React components)
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && ('$$typeof' in icon || React.isValidElement(icon)))) {
    const IconComponent = icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    return <IconComponent style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }} />;
  }

  // String-based icon name
  const iconName = icon as string;

  // Iconify icon (e.g., "ion:alert-circle-outline")
  if (iconName.includes(':')) {
    return <Icon icon={iconName} width={size} height={size} style={{ display: 'inline-block', verticalAlign: 'middle' }} />;
  }

  // Fallback to emoji or text
  return <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>{iconName}</span>;
}

/**
 * MetricsCallout Component (DS-14)
 *
 * Displays 3-5 key metrics in a visually prominent boxed layout.
 * Metrics should use percentages, time units, or counts with proper formatting.
 *
 * Formatting rules (DS-14):
 * - Percentages: Bold, 14-16pt, brand color
 * - Time metrics: Include units (hours, minutes, days)
 * - Large numbers: Use thousands separator (45,234)
 *
 * Icon support:
 * - Unplugin icons: Pass React component directly (e.g., IconTime from '~icons/ion/time-outline')
 * - Iconify icons: Pass string like "ion:alert-circle-outline"
 * - Flanksource icons: Pass string like "postgres" or "kubernetes"
 * - Emoji/text: Pass any string like "⏱️" or "✓"
 *
 * Usage:
 * <MetricsCallout
 *   metrics={[
 *     { value: "85%", label: "Reduction in MTTR" },
 *     { value: "70%", label: "Less Alert Noise" },
 *     { value: "<1 Hour", label: "Time to Value", icon: IconTime }
 *   ]}
 * />
 */
export default function MetricsCallout({ metrics, variant = 'primary' }: MetricsCalloutProps) {
  if (metrics.length === 0 || metrics.length > 5) {
    console.warn('MetricsCallout: Should display 3-5 metrics (DS-14)');
  }

  return (
    <div className={`metrics-callout metrics-callout--${variant}`}>
      {metrics.map((metric, index) => (
        <div key={index} className="metric-item">
          {metric.icon && <div className="metric-icon">{renderIcon(metric.icon, 24)}</div>}
          <div className="metric-value">{metric.value}</div>
          <div className="metric-label">{metric.label}</div>
        </div>
      ))}
    </div>
  );
}
