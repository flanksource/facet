import React from 'react';
import {
  IoTrendingUpOutline as IconTrendingUp,
  IoTrendingDownOutline as IconTrendingDown,
  IoArrowUp as IconArrowUp,
  IoArrowDown as IconArrowDown
} from 'react-icons/io5';

interface SeverityStatCardProps {
  color: 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'gray';
  value: number;
  label: string;
  trend?: {
    added: number;
    closed: number;
    delta: number;
  };
  downIsGood?: boolean;
  className?: string;
}

const colorClasses = {
  red: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200'
  },
  orange: {
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200'
  },
  yellow: {
    text: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200'
  },
  blue: {
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
  green: {
    text: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  gray: {
    text: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200'
  }
};

/**
 * Severity stat card component with optional trend indicator
 */
export default function SeverityStatCard({
  color,
  value,
  label,
  trend,
  downIsGood = true,
  className = ''
}: SeverityStatCardProps) {
  const colors = colorClasses[color];

  // Display trend with new/resolved/delta using icons
  const getTrendDisplay = () => {
    if (!trend) return null;

    const { added, closed, delta } = trend;

    // Delta should be 0 or negative for good trends (more closed than added)
    const TrendIcon = delta < 0 ? IconTrendingDown : delta > 0 ? IconTrendingUp : null;
    const trendColor = delta <= 0 ? 'text-green-700' : 'text-red-700';

    return (
      <div className="text-xs flex items-center gap-1.5">
        {added > 0 && (
          <div className="text-red-600 flex items-center gap-0.5">
            <IconArrowUp className="w-3 h-3" />
            <span>{added}</span>
          </div>
        )}
        {closed > 0 && (
          <div className="text-green-600 flex items-center gap-0.5">
            <IconArrowDown className="w-3 h-3" />
            <span>{closed}</span>
          </div>
        )}
        {delta !== 0 && TrendIcon && (
          <div className={`font-semibold flex items-center gap-0.5 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(delta)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${colors.bg} border ${colors.border} rounded p-2 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-600">{label}</div>
        {getTrendDisplay()}
      </div>
      <div className={`text-2xl font-bold ${colors.text}`}>
        {value}
      </div>
    </div>
  );
}
