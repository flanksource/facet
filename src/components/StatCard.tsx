import React from 'react';
import ProgressBar from './ProgressBar';

interface StatCardProps {
  value: UnitValue | string | number;
  compareFrom?: UnitValue | string | number;
  label: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  variant?: 'card' | 'badge' | 'hero' | 'bordered' | 'icon-heavy' | 'left-aligned' | 'metric';
  compareVariant?:
  | 'trendline' // show a trendline icon and the trending value delta
  | 'up-down'  // show up/down arrows with the delta
  | 'before-after' // show before → after style
  | 'before-after-progress'; // show before → after with progress bar style (like MetricHeader)

  size?: 'sm' | 'md' | 'lg';
  valueClassName?: string;
  iconClassName?: string;
  iconColor?: string;
  valueColor?: string;
  sublabel?: React.ReactNode;
  sublabelClassName?: string;
  // Conditional styles based on the value e.g. for coloring based on thresholds
  conditionalStyles?: ConditionalStyle[];
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
}

export type ConditionalStyle = ConditionalStyleFunction | 'red-green' | 'green-red';

export interface ConditionalStyleFunction {
  condition: (value: UnitValue) => boolean;
  classes: string;
}

export type TimeUnit = 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
export type DataUnit = 'bytes' | 'kilobytes' | 'megabytes' | 'gigabytes' | 'terabytes';
export type NumberUnit = 'none' | 'percent' | 'currency';

export type Unit = TimeUnit | DataUnit | NumberUnit;
export type UnitValue = TimeUnitValue | DataUnitValue | NumberUnitValue;

export class TimeUnitValue {
  value: number;
  unit: TimeUnit;

  constructor(value: number, unit: TimeUnit) {
    this.value = value;
    this.unit = unit;
  }

  toUnit(targetUnit: TimeUnit): TimeUnitValue {
    const unitFactors: { [key in TimeUnit]: number } = {
      milliseconds: 1,
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000,
      years: 365 * 24 * 60 * 60 * 1000
    };

    const valueInMs = this.value * unitFactors[this.unit];
    const targetValue = valueInMs / unitFactors[targetUnit];

    return new TimeUnitValue(targetValue, targetUnit);
  }

  seconds(): number {
    return this.toUnit('seconds').value;
  }

  toString(): string {
    let seconds = this.seconds();
    if (seconds < 60) {
      return `${seconds.toFixed(0)}s`;
    } else if (seconds < 3600) {
      return `${(seconds / 60).toFixed(0)}m`;
    } else if (seconds < 86400) {
      return `${(seconds / 3600).toFixed(0)}h`;
    } else {
      return `${(seconds / 86400).toFixed(0)}d`;
    }
  }
}

export class DataUnitValue {
  value: number;
  unit: DataUnit;

  constructor(value: number, unit: DataUnit) {
    this.value = value;
    this.unit = unit;
  }

  toUnit(targetUnit: DataUnit): DataUnitValue {
    const unitFactors: { [key in DataUnit]: number } = {
      bytes: 1,
      kilobytes: 1024,
      megabytes: 1024 * 1024,
      gigabytes: 1024 * 1024 * 1024,
      terabytes: 1024 * 1024 * 1024 * 1024
    };

    const valueInBytes = this.value * unitFactors[this.unit];
    const targetValue = valueInBytes / unitFactors[targetUnit];

    return new DataUnitValue(targetValue, targetUnit);
  }

  bytes(): number {
    return this.toUnit('bytes').value;
  }

  toString(): string {
    let bytes = this.bytes();
    if (bytes < 1024) {
      return `${bytes.toFixed(0)} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes < 1024 * 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
    }
  }
}

export class NumberUnitValue {
  value: number;
  unit: NumberUnit;

  constructor(value: number, unit: NumberUnit) {
    this.value = value;
    this.unit = unit;
  }

  toString(): string {
    if (this.unit === 'percent') {
      return `${this.value.toFixed(1)}%`;
    } else if (this.unit === 'currency') {
      return `$${this.value.toFixed(2)}`;
    } else {
      return this.value.toString();
    }
  }
}

/**
 * StatCard Component
 *
 * Displays a metric with optional icon, value, label, and sublabel.
 * Supports multiple styling variants for different use cases.
 *
 * Variants:
 * - 'card': Clean unbordered card style (40mm × 40mm, outlined icon)
 * - 'badge': Compact inline badge (light blue background)
 * - 'hero': Large emphasis metric (36-48pt values)
 * - 'bordered': Bordered card variant (for when borders are needed)
 * - 'icon-heavy': Large icon with overlaid value badge
 * - 'left-aligned': Icon on left, value and label stacked on right
 * - 'metric': Summary metric card with colored background and border
 *
 * Compare Variants (when compareFrom is provided):
 * - 'trendline': Show trend icon and delta
 * - 'up-down': Show up/down arrows with conditional coloring
 * - 'before-after': Show "X → Y" format
 * - 'before-after-progress': Show before → after with progress bar
 *
 * Usage:
 * <StatCard
 *   value={150}
 *   compareFrom={100}
 *   compareVariant="up-down"
 *   label="Total Credits"
 *   icon={MyIconComponent}
 *   variant="card"
 *   conditionalStyles={['red-green']}
 * />
 */
export default function StatCard({
  value,
  label,
  icon: IconComponent,
  variant = 'card',
  size = 'md',
  iconColor = '#3578e5',
  valueColor = '#3578e5',
  sublabel,
  compareFrom,
  compareVariant,
  color = 'blue',
  conditionalStyles = [],
  valueClassName = '',
  iconClassName = '',
  sublabelClassName = ''
}: StatCardProps) {

  // Helper: Convert value to display string
  const formatValue = (val: UnitValue | string | number): string => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val.toFixed(0);
    if ('toString' in val && typeof val.toString === 'function') {
      return val.toString();
    }
    return String(val);
  };

  // Helper: Extract numeric value from UnitValue for comparisons
  const getNumericValue = (val: UnitValue | string | number): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    if ('value' in val && typeof val.value === 'number') {
      return val.value;
    }
    return 0;
  };

  // Helper: Calculate delta for comparisons
  const calculateDelta = (): { delta: number; percent: number; isPositive: boolean } => {
    if (!compareFrom) return { delta: 0, percent: 0, isPositive: true };

    const currentNum = getNumericValue(value);
    const previousNum = getNumericValue(compareFrom);
    const delta = currentNum - previousNum;
    const percent = previousNum !== 0 ? (delta / Math.abs(previousNum)) * 100 : 0;

    return {
      delta,
      percent,
      isPositive: delta >= 0
    };
  };

  // Helper: Evaluate conditional styles
  const evaluateConditionalStyles = (): string => {
    if (!conditionalStyles || conditionalStyles.length === 0) return '';

    for (const style of conditionalStyles) {
      if (typeof style === 'string') {
        // Preset conditional styles
        const numVal = getNumericValue(value);
        if (style === 'red-green') {
          // Negative = red, Positive = green
          return numVal < 0 ? 'text-red-600' : 'text-green-600';
        } else if (style === 'green-red') {
          // Negative = green, Positive = red (for errors, issues)
          return numVal < 0 ? 'text-green-600' : 'text-red-600';
        }
      } else if (style.condition) {
        // Custom function - convert value to UnitValue-like format if needed
        const unitVal = typeof value === 'object' && 'value' in value
          ? value as UnitValue
          : new NumberUnitValue(getNumericValue(value), 'none');

        if (style.condition(unitVal)) {
          return style.classes;
        }
      }
    }
    return '';
  };

  // Helper: Evaluate conditional styles for improvement percentage
  const evaluateImprovementStyles = (improvementValue: number): string => {
    if (!conditionalStyles || conditionalStyles.length === 0) {
      // Default behavior: positive improvement = green, negative = red
      return improvementValue > 0 ? 'text-green-500' : 'text-red-500';
    }

    for (const style of conditionalStyles) {
      if (typeof style === 'string') {
        // Preset conditional styles evaluated against improvement value
        if (style === 'red-green') {
          // Negative improvement = red, Positive = green
          return improvementValue < 0 ? 'text-red-500' : 'text-green-500';
        } else if (style === 'green-red') {
          // Negative improvement = green, Positive = red
          return improvementValue < 0 ? 'text-green-500' : 'text-red-500';
        }
      } else if (style.condition) {
        // Custom function - convert improvement to UnitValue format
        const improvementUnit = new NumberUnitValue(improvementValue, 'percent');
        if (style.condition(improvementUnit)) {
          return style.classes;
        }
      }
    }

    // Fallback to default
    return improvementValue > 0 ? 'text-green-500' : 'text-red-500';
  };

  // Helper: Render icon with optional className
  const renderIcon = () => {
    if (IconComponent) {
      return <IconComponent className={`w-full h-full ${iconClassName}`} style={{ color: iconColor, stroke: iconColor, fill: 'none' }} />;
    }
    return null;
  };

  // Helper: Render comparison indicator based on compareVariant
  const renderComparisonIndicator = () => {
    if (!compareFrom || !compareVariant) return null;

    const { delta, percent, isPositive } = calculateDelta();
    const formattedValue = formatValue(value);
    const formattedCompareFrom = formatValue(compareFrom);

    if (compareVariant === 'trendline') {
      // Trendline: icon + delta
      return (
        <div className="flex items-center gap-1 text-xs">
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '↗' : '↘'}
          </span>
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '+' : ''}{delta.toFixed(0)}
          </span>
        </div>
      );
    }

    if (compareVariant === 'up-down') {
      // Up/down arrows with color
      return (
        <div className="flex items-center gap-1 text-xs">
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '▲' : '▼'}
          </span>
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {Math.abs(delta).toFixed(0)}
          </span>
        </div>
      );
    }

    if (compareVariant === 'before-after') {
      // Before → After format
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">{formattedCompareFrom}</span>
          <span className="text-green-500">→</span>
          <span className="font-semibold">{formattedValue}</span>
        </div>
      );
    }

    if (compareVariant === 'before-after-progress') {
      // Before → After with dual progress bars (exact match to MetricHeader)
      const beforeValue = getNumericValue(compareFrom);
      const afterValue = getNumericValue(value);

      // Normalize both bars to max value (MetricHeader approach)
      const maxValue = Math.max(beforeValue, afterValue);
      const beforeWidth = maxValue > 0 ? (beforeValue / maxValue) * 100 : 0;
      const afterWidth = maxValue > 0 ? (afterValue / maxValue) * 100 : 0;

      // Calculate improvement percentage
      const improvement = beforeValue !== 0
        ? ((beforeValue - afterValue) / beforeValue) * 100
        : 0;
      const isImprovement = improvement > 0;

      return (
        <div className="space-y-3">
          <ProgressBar
            title="Before"
            percentage={beforeWidth}
            displayValue={formattedCompareFrom}
            variant="danger"
          />

          <ProgressBar
            title="After"
            percentage={afterWidth}
            displayValue={formattedValue}
            variant="success"
          >
            {improvement !== 0 && (
              <span className={`text-sm ${evaluateImprovementStyles(improvement)}`}>
                {isImprovement ? '↑' : '↓'} {Math.abs(improvement).toFixed(0)}%
              </span>
            )}
          </ProgressBar>
        </div>
      );
    }

    return null;
  };

  // Get color theme classes
  const getColorClasses = () => {
    const colorMap = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
      red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900' },
      gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900' }
    };
    return colorMap[color];
  };

  // Get size-specific classes for card and badge variants
  const getSizeClasses = () => {
    const sizeMap = {
      sm: {
        iconSize: 'w-[4mm] h-[4mm]',
        iconGap: 'gap-[1mm]',
        cardPadding: 'px-[2mm] py-[1.5mm]',
        badgePadding: 'px-[2mm] py-[1mm]',
        gap: 'gap-[1mm]',
        valueText: 'text-[12pt] leading-[15pt]',
        labelText: 'text-[7pt] leading-[9pt]',
        sublabelText: 'text-[6pt]',
        badgeValueText: 'text-[9pt]',
        badgeLabelText: 'text-[7pt]',
        heroValueText: 'text-[24pt] leading-[30pt]',
        heroLabelText: 'text-[9pt]',
        heroSublabelText: 'text-[7pt]',
        iconHeavyBadgeText: 'text-[6pt]',
        iconHeavyLabelText: 'text-[8pt]'
      },
      md: {
        iconSize: 'w-[6mm] h-[6mm]',
        iconGap: 'gap-[2mm]',
        cardPadding: 'p-[4mm]',
        badgePadding: 'px-[4mm] py-[2mm]',
        gap: 'gap-[2mm]',
        valueText: 'text-[16pt] leading-[20pt]',
        labelText: 'text-[9pt] leading-[11pt]',
        sublabelText: 'text-[8pt]',
        badgeValueText: 'text-[12pt]',
        badgeLabelText: 'text-[9pt]',
        heroValueText: 'text-[36pt] leading-[44pt]',
        heroLabelText: 'text-[12pt]',
        heroSublabelText: 'text-[9pt]',
        iconHeavyBadgeText: 'text-[8pt]',
        iconHeavyLabelText: 'text-[10pt]'
      },
      lg: {
        iconSize: 'w-[8mm] h-[8mm]',
        iconGap: 'gap-[3mm]',
        cardPadding: 'p-[6mm]',
        badgePadding: 'px-[6mm] py-[3mm]',
        gap: 'gap-[3mm]',
        valueText: 'text-[20pt] leading-[25pt]',
        labelText: 'text-[11pt] leading-[14pt]',
        sublabelText: 'text-[10pt]',
        badgeValueText: 'text-[14pt]',
        badgeLabelText: 'text-[11pt]',
        heroValueText: 'text-[48pt] leading-[56pt]',
        heroLabelText: 'text-[14pt]',
        heroSublabelText: 'text-[11pt]',
        iconHeavyBadgeText: 'text-[10pt]',
        iconHeavyLabelText: 'text-[12pt]'
      }
    };
    return sizeMap[size];
  };

  const formattedValue = formatValue(value);
  const conditionalClasses = evaluateConditionalStyles();
  const colorClasses = getColorClasses();
  const sizeClasses = getSizeClasses();

  // Card variant: Clean unbordered card with icon, value, label
  if (variant === 'card') {
    return (
      <div className={`flex flex-col items-center ${sizeClasses.gap} ${sizeClasses.cardPadding} bg-white min-w-[40mm] min-h-[40mm] justify-center`}>
        <div className={`flex items-center ${sizeClasses.iconGap}`}>
          {IconComponent && (
            <div className={sizeClasses.iconSize}>
              {renderIcon()}
            </div>
          )}
          <div className={`${sizeClasses.valueText} font-bold text-center ${conditionalClasses || valueClassName}`} style={!conditionalClasses ? { color: valueColor } : undefined}>
            {formattedValue}
          </div>
        </div>
        <div className={`${sizeClasses.labelText} text-[#6b7280] text-center font-medium`}>
          {label}
        </div>
        {compareVariant && renderComparisonIndicator()}
        {sublabel && <div className={`${sizeClasses.sublabelText} text-[#9ca3af] text-center ${sublabelClassName}`}>{sublabel}</div>}
      </div>
    );
  }

  // Bordered variant: Card with border (for when emphasis is needed)
  if (variant === 'bordered') {
    return (
      <div className={`flex flex-col items-center ${sizeClasses.gap} ${sizeClasses.cardPadding} border ${colorClasses.border} rounded-[2mm] ${colorClasses.bg} min-w-[40mm] min-h-[40mm] justify-center`}>
        <div className={`flex items-center ${sizeClasses.iconGap}`}>
          {IconComponent && (
            <div className={sizeClasses.iconSize}>
              {renderIcon()}
            </div>
          )}
          <div className={`${sizeClasses.valueText} font-bold text-center ${conditionalClasses || valueClassName}`} style={!conditionalClasses ? { color: valueColor } : undefined}>
            {formattedValue}
          </div>
        </div>
        <div className={`${sizeClasses.labelText} text-[#6b7280] text-center font-medium`}>
          {label}
        </div>
        {compareVariant && renderComparisonIndicator()}
        {sublabel && <div className={`${sizeClasses.sublabelText} text-[#9ca3af] text-center ${sublabelClassName}`}>{sublabel}</div>}
      </div>
    );
  }

  // Badge variant: Compact inline pill-shaped badge
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center ${sizeClasses.gap} ${sizeClasses.badgePadding} ${colorClasses.bg} rounded-full`}>
        {IconComponent && (
          <div className={`${sizeClasses.iconSize} flex-shrink-0`}>
            {renderIcon()}
          </div>
        )}
        <span className={`${sizeClasses.badgeValueText} font-semibold ${conditionalClasses || valueClassName}`} style={!conditionalClasses ? { color: valueColor } : undefined}>
          {formattedValue}
        </span>
        <span className={`${sizeClasses.badgeLabelText} text-[#6b7280]`}>
          {label}
        </span>
        {compareVariant && renderComparisonIndicator()}
      </div>
    );
  }

  // Hero variant: Large emphasis metric
  if (variant === 'hero') {
    return (
      <div className={`flex flex-col items-center gap-[3mm] ${colorClasses.bg} p-[8mm] text-center`}>
        <div className={`${sizeClasses.heroValueText} font-bold ${conditionalClasses || valueClassName}`} style={!conditionalClasses ? { color: valueColor } : undefined}>
          {formattedValue}
        </div>
        <div className={`${sizeClasses.heroLabelText} font-semibold text-[#374151]`}>
          {label}
        </div>
        {compareVariant && renderComparisonIndicator()}
        {sublabel && (
          <div className={`${sizeClasses.heroSublabelText} text-[#6b7280] ${sublabelClassName}`}>
            {sublabel}
          </div>
        )}
      </div>
    );
  }

  // Icon-heavy variant: Large icon with overlaid value badge
  if (variant === 'icon-heavy') {
    return (
      <div className="flex flex-col items-center gap-[4mm] p-[4mm]">
        <div className="relative w-[12mm] h-[12mm] flex items-center justify-center">
          {IconComponent && (
            <div className="w-full h-full">
              {renderIcon()}
            </div>
          )}
          <div className={`absolute top-[-2mm] right-[-2mm] w-[5mm] h-[5mm] bg-white rounded-full flex items-center justify-center border ${colorClasses.border} ${sizeClasses.iconHeavyBadgeText} font-bold ${conditionalClasses || valueClassName}`} style={!conditionalClasses ? { color: valueColor } : undefined}>
            {formattedValue}
          </div>
        </div>
        <div className={`${sizeClasses.iconHeavyLabelText} font-semibold text-[#374151] text-center`}>
          {label}
        </div>
        {compareVariant && renderComparisonIndicator()}
        {sublabel && <div className={`${sizeClasses.sublabelText} text-[#9ca3af] text-center ${sublabelClassName}`}>{sublabel}</div>}
      </div>
    );
  }

  // Left-aligned variant: Icon on left, value and label stacked on right
  if (variant === 'left-aligned') {
    return (
      <div className="flex items-center gap-[3mm] p-[2mm] min-w-[25mm]">
        {IconComponent && (
          <div className={`${sizeClasses.iconSize} flex-shrink-0`}>
            {renderIcon()}
          </div>
        )}
        <div className="flex flex-col">
          <div className={`${sizeClasses.valueText} font-bold ${conditionalClasses || valueClassName}`} style={!conditionalClasses ? { color: valueColor } : undefined}>
            {formattedValue}
          </div>
          <div className={`${sizeClasses.labelText} text-[#6b7280] font-medium`}>
            {label}
          </div>
          {compareVariant && renderComparisonIndicator()}
          {sublabel && <div className={`${sizeClasses.sublabelText} text-[#9ca3af] ${sublabelClassName}`}>{sublabel}</div>}
        </div>
      </div>
    );
  }

  // Metric variant: Summary metric card with colored background
  if (variant === 'metric') {
    return (
      <div className={`${colorClasses.bg} p-4 rounded-lg border ${colorClasses.border} min-w-[25mm]`}>
        <div className="text-xs text-gray-600 mb-1 whitespace-nowrap">{label}</div>
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center ${sizeClasses.iconGap}`}>
            {IconComponent && (
              <div className={`${sizeClasses.iconSize} flex-shrink-0`}>
                {renderIcon()}
              </div>
            )}
            <div className={`text-3xl font-bold ${conditionalClasses || colorClasses.text || valueClassName}`}>
              {formattedValue}
            </div>
          </div>
          {compareVariant && (
            <div className="flex-shrink-0">{renderComparisonIndicator()}</div>
          )}
        </div>
        {sublabel && <div className={`text-xs text-gray-600 mt-1 ${sublabelClassName}`}>{sublabel}</div>}
      </div>
    );
  }

  // Default fallback to clean card
  return (
    <div className={`flex flex-col items-center ${sizeClasses.gap} ${sizeClasses.cardPadding} bg-white min-w-[40mm] min-h-[40mm] justify-center`}>
      <div className={`flex items-center ${sizeClasses.iconGap}`}>
        {IconComponent && (
          <div className={sizeClasses.iconSize}>
            {renderIcon()}
          </div>
        )}
        <div className={`${sizeClasses.valueText} font-bold text-center ${conditionalClasses || valueClassName}`} style={!conditionalClasses ? { color: valueColor } : undefined}>
          {formattedValue}
        </div>
      </div>
      <div className={`${sizeClasses.labelText} text-[#6b7280] text-center font-medium`}>
        {label}
      </div>
      {compareVariant && renderComparisonIndicator()}
      {sublabel && <div className={`${sizeClasses.sublabelText} text-[#9ca3af] text-center ${sublabelClassName}`}>{sublabel}</div>}
    </div>
  );
}
