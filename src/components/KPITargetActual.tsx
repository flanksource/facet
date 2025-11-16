import type { KpiComparison } from '../types/poc';
import ProgressBar from './ProgressBar';

interface KPITargetActualProps {
  kpi: KpiComparison;
  className?: string;
}

function formatKpiValue(value: number | string, unit?: string): string {
  if (typeof value === 'string') return value;
  return unit ? `${value}${unit}` : value.toString();
}

function calculatePercentage(target: number, actual: number): number {
  if (target === 0) return 0;
  return ((actual / target) * 100);
}

export default function KPITargetActual({ kpi, className = '' }: KPITargetActualProps) {
  const targetValue = typeof kpi.target.value === 'number' ? kpi.target.value : parseFloat(kpi.target.value as string);
  const actualValue = typeof kpi.actual.value === 'number' ? kpi.actual.value : parseFloat(kpi.actual.value as string);

  const percentageOfTarget = kpi.percentageOfTarget ?? calculatePercentage(targetValue, actualValue);
  const isExceeded = percentageOfTarget >= 100;
  const barWidth = Math.min(percentageOfTarget, 100);

  const targetDisplay = kpi.target.displayValue ?? formatKpiValue(kpi.target.value, kpi.target.unit);
  const actualDisplay = kpi.actual.displayValue ?? formatKpiValue(kpi.actual.value, kpi.actual.unit);

  return (
    <div className={`border border-gray-200 rounded p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{kpi.metric}</h4>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Target</div>
          <div className="text-lg font-semibold text-gray-700">{targetDisplay}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Actual</div>
          <div className={`text-lg font-semibold ${isExceeded ? 'text-green-600' : 'text-orange-600'}`}>
            {actualDisplay}
          </div>
        </div>
      </div>

      <ProgressBar
        title=""
        percentage={barWidth}
        displayValue={`${percentageOfTarget.toFixed(0)}% of target`}
        variant={isExceeded ? 'success' : 'warning'}
        size="md"
        showPercentageInBar={true}
        showPercentageLabel={false}
      />
    </div>
  );
}
