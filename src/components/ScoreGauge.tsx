import React from 'react';

interface ScoreGaugeProps {
  score: number; // 0-10
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Circular gauge displaying OpenSSF Scorecard score (0-10)
 * Color-coded: 0-4 (red), 4-7 (yellow), 7-10 (green)
 */
export default function ScoreGauge({ score, label, size = 'md', className = '' }: ScoreGaugeProps) {
  // Normalize score to 0-10 range
  const normalizedScore = Math.max(0, Math.min(10, score));
  const percentage = (normalizedScore / 10) * 100;

  // Determine color theme based on score
  const getTheme = (s: number) => {
    if (s >= 7) return { color: 'text-green-700', stroke: 'stroke-green-600', bg: 'bg-green-50' };
    if (s >= 4) return { color: 'text-yellow-700', stroke: 'stroke-yellow-500', bg: 'bg-yellow-50' };
    return { color: 'text-red-700', stroke: 'stroke-red-600', bg: 'bg-red-50' };
  };

  const theme = getTheme(normalizedScore);

  // Size configurations
  const sizeConfig = {
    sm: { container: 'w-16 h-16', text: 'text-lg', label: 'text-xs', strokeWidth: 3 },
    md: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-sm', strokeWidth: 4 },
    lg: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-base', strokeWidth: 5 }
  };

  const config = sizeConfig[size];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${config.container}`}>
        {/* Background circle */}
        <svg className="transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            className={theme.stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>

        {/* Score text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`font-bold ${config.text} ${theme.color}`}>
              {normalizedScore.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">/ 10</div>
          </div>
        </div>
      </div>

      {/* Label */}
      {label && (
        <div className={`mt-2 text-center font-medium text-gray-700 ${config.label}`}>
          {label}
        </div>
      )}
    </div>
  );
}
