import React from 'react';

/**
 * KPI Value Interface
 */
export interface KpiValue {
  /** Numeric value */
  value: number | string;
  /** Display formatted value */
  displayValue: string;
  /** Unit of measurement */
  unit?: string;
}

/**
 * KpiComparison Props
 */
export interface KpiComparisonProps {
  /** Before metric value */
  before: KpiValue;
  /** After metric value */
  after: KpiValue;
  /** Percentage improvement (positive = better) */
  improvement?: number;
  /** Label for the metric */
  label?: string;
  /** Format type for visualization */
  format?: 'time' | 'percentage' | 'count' | 'custom';
  /** Show summary in top right */
  showSummary?: boolean;
  /** Show improvement arrow/indicator */
  showImprovement?: boolean;
}

/**
 * KpiComparison Component
 *
 * Displays before/after KPI comparison with visual bar chart.
 * Useful for showing performance improvements or metric changes.
 *
 * @example
 * ```tsx
 * <KpiComparison
 *   label="Response Time"
 *   before={{ value: 330, displayValue: "5m 30s" }}
 *   after={{ value: 45, displayValue: "45s" }}
 *   improvement={86.4}
 *   format="time"
 *   showSummary
 * />
 * ```
 */
export default function KpiComparison({
  before,
  after,
  improvement,
  label,
  showSummary = true,
  showImprovement = true,
}: KpiComparisonProps) {
  const beforeValue = typeof before.value === 'number' ? before.value : parseFloat(before.value.toString());
  const afterValue = typeof after.value === 'number' ? after.value : parseFloat(after.value.toString());
  const maxValue = Math.max(beforeValue, afterValue);
  const beforeWidth = (beforeValue / maxValue) * 100;
  const afterWidth = (afterValue / maxValue) * 100;

  const formatPercent = (value: number): string => {
    const formatted = Math.abs(value).toFixed(1);
    return formatted + '%';
  };

  const isImprovement = improvement !== undefined && improvement > 0;
  const improvementIcon = isImprovement ? '↑' : '↓';

  return (
    <div className="my-4">
      {label && <div className="text-sm font-semibold text-gray-900 mb-2">{label}</div>}

      <div className="relative">
        {/* Summary - Top Right */}
        {showSummary && (
          <div className="absolute top-0 right-0 text-xs text-right font-mono z-10">
            <div className="text-gray-600">{before.displayValue}</div>
            {improvement !== undefined && showImprovement && (
              <div className={`my-0.5 ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                {improvementIcon} {formatPercent(improvement)}
              </div>
            )}
            <div className="text-gray-600">{after.displayValue}</div>
          </div>
        )}

        <div className={`space-y-3 ${showSummary ? 'pr-24' : ''}`}>
          {/* Before bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold">Before:</span>
              {!showSummary && <span className="font-mono">{before.displayValue}</span>}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className="bg-red-400 h-6 rounded-full"
                style={{ width: `${beforeWidth}%` }}
              />
            </div>
          </div>

          {/* After bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold">After:</span>
              {!showSummary && <span className="font-mono">{after.displayValue}</span>}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className="bg-green-500 h-6 rounded-full"
                style={{ width: `${afterWidth}%` }}
              />
            </div>
          </div>
        </div>

        {/* Improvement indicator below */}
        {improvement !== undefined && showImprovement && !showSummary && (
          <div className="mt-2 text-center">
            <span className={`font-semibold ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
              {improvement > 0 ? '+' : ''}{formatPercent(improvement)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
