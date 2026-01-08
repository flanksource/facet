import React from 'react';

/**
 * Metric Interface
 * Represents a single metric value with label
 */
export interface Metric {
  /** Numeric or string value to display */
  value: string | number;
  /** Label/description of the metric */
  label: string;
  /** Optional icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional color variant for value text */
  valueColor?: 'blue' | 'green' | 'red' | 'gray' | 'yellow';
}

/**
 * MetricGrid Props
 */
export interface MetricGridProps {
  /** Array of metrics to display */
  metrics: Metric[];
  /** Number of columns in grid (2-4) */
  columns?: 2 | 3 | 4;
  /** Optional CSS class name */
  className?: string;
}

/**
 * MetricGrid Component
 *
 * Displays a grid of metrics with consistent styling.
 * Commonly used for dashboard-style metric displays.
 *
 * @example
 * ```tsx
 * <MetricGrid
 *   columns={3}
 *   metrics={[
 *     { value: '42', label: 'Total Issues' },
 *     { value: '98%', label: 'Coverage' },
 *     { value: '5ms', label: 'Response Time' }
 *   ]}
 * />
 * ```
 */
export default function MetricGrid({ metrics, columns = 3, className = '' }: MetricGridProps) {
  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns];

  const getValueColorClass = (color?: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600';
      case 'green':
        return 'text-green-600';
      case 'red':
        return 'text-red-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'gray':
        return 'text-gray-600';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className={`grid ${gridColsClass} gap-4 ${className}`}>
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div key={index} className="border border-gray-200 rounded p-3">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />}
              <div className={`text-2xl font-bold ${getValueColorClass(metric.valueColor)}`}>
                {metric.value}
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-1">{metric.label}</div>
          </div>
        );
      })}
    </div>
  );
}
