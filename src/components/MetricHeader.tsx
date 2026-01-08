import ProgressBar from './ProgressBar';
import { Gauge } from './Gauge';
/**
 * KPI Value Interface
 */
export interface KpiValue {
  /** Numeric or string value */
  value: number;

  /** Optional unit of measurement */
  unit?: string;
}

/**
 * MetricHeaderProps - Base Props
 */
interface MetricHeaderBaseProps {
  /** Metric title/label */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional CSS class name */
  className?: string;
}

interface MetricHeaderGaugeProps extends MetricHeaderBaseProps {
  variant: 'gauge';
  score: number;
  maxScore?: number;
}

/**
 * MetricHeaderProps - Comparison Variant
 */
interface MetricHeaderComparisonProps extends MetricHeaderBaseProps {
  /** Variant type */
  variant: 'comparison';
  /** Before measurement */
  before: KpiValue;
  /** After measurement */
  after: KpiValue;
  /** Percentage improvement */
  improvement?: number;
  /** Show visual bars */
  showBars?: boolean;
  /** Optional comparison component */
  ComparisonComponent?: React.ComponentType<{
    before: KpiValue;
    after: KpiValue;
    improvement?: number;
  }>;
}

export type MetricHeaderProps = MetricHeaderGaugeProps | MetricHeaderComparisonProps;

/**
 * MetricHeader Component
 *
 * Displays a metric header with either a gauge (score) or comparison (before/after) variant.
 * Used for highlighting key metrics at the top of sections.
 *
 * @example Gauge Variant
 * ```tsx
 * <MetricHeader
 *   variant="gauge"
 *   title="Security Score"
 *   subtitle="OpenSSF Scorecard"
 *   score={8.5}
 *   size="lg"
 *   GaugeComponent={ScoreGauge}
 * />
 * ```
 *
 * @example Comparison Variant
 * ```tsx
 * <MetricHeader
 *   variant="comparison"
 *   title="Time to Ascertain Service Health"
 *   subtitle="Average time to gather complete service health picture"
 *   before={{ value: 330, displayValue: "5m 30s" }}
 *   after={{ value: 45, displayValue: "45s" }}
 *   improvement={86.4}
 *   showBars
 * />
 * ```
 */
export default function MetricHeader(props: MetricHeaderProps) {
  const { variant, title, subtitle, className = '' } = props;

  if (variant === 'gauge') {
    const { score, maxScore = 10 } = props;

    const getArcColor = (s: number, max: number) => {
      const pct = s / max;
      if (pct >= 0.7) return '#16a34a';
      if (pct >= 0.4) return '#eab308';
      return '#dc2626';
    };

    return (
      <div className={`border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-blue-900 mb-1">{title}</h3>
            {subtitle && <p className="text-zinc-600">{subtitle}</p>}
          </div>
          <div className="flex-shrink-0">
            <Gauge
              value={score}
              minValue={0}
              maxValue={maxScore}
              width="8em"
              arcColor={getArcColor(score, maxScore)}
              showMinMax={false}
            />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'comparison') {
    const { before, after, showBars = true, ComparisonComponent } = props;

    const beforeValue = typeof before.value === 'number' ? before.value : parseFloat(before.value.toString());
    const afterValue = typeof after.value === 'number' ? after.value : parseFloat(after.value.toString());
    const maxValue = Math.max(beforeValue, afterValue);
    const beforeWidth = (beforeValue / maxValue) * 100;
    const afterWidth = (afterValue / maxValue) * 100;
    const improvement = (before.value - after.value) / before.value * 100;


    const isImprovement = improvement !== undefined && improvement > 0;

    return (
      <div className={`${className}`}>
        <h3 className="text-sm font-bold text-blue-900 mb-3">{title}</h3>
        {subtitle && <p className="font-semibold text-zinc-700 mb-3">{subtitle}</p>}


        <div className="space-y-3">
          <ProgressBar
            title="Before"
            percentage={beforeWidth}
            displayValue={formatKpiValue(before)}
            variant="danger"
          />

          <ProgressBar
            title="After"
            percentage={afterWidth}
            displayValue={formatKpiValue(after)}
            variant="success"
          >
            {improvement !== undefined && (
              <span className={`text-sm ${isImprovement ? 'text-green-500' : 'text-red-500'}`}>
                {isImprovement ? '↑' : '↓'} {formatPercent(improvement)}
              </span>
            )}
          </ProgressBar>
        </div>

      </div >
    );
  }

  return null;
}

function formatPercent(value: number): string {
  return Math.abs(value).toFixed(0) + '%';
};

function formatKpiValue(kpi: KpiValue): string {
  if (kpi.unit === 'minutes') {
    kpi.value = Number(kpi.value) * 60;
    kpi.unit = 'seconds';
  }
  if (kpi.unit === 'seconds') {
    const seconds = Number(kpi.value);
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m` : `${mins}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return mins > 0 ? `${hours}h` : `${hours}h`;
    }
  }



  // Format large numbers with K/M suffix
  const numValue = Number(kpi.value);
  if (!isNaN(numValue)) {
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M${kpi.unit ? ' ' + kpi.unit : ''}`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K${kpi.unit ? ' ' + kpi.unit : ''}`;
    }
  }

  return kpi.unit ? `${kpi.value} ${kpi.unit}` : `${kpi.value}`;
}
