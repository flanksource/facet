import React from 'react';

/**
 * ProgressBar Props
 */
export interface ProgressBarProps {
  /** Title/label displayed on the left */
  title: string;
  /** Percentage value (0-100) */
  percentage: number;
  /** Optional subtitle/description below title */
  subtitle?: string;
  /** Optional display value instead of percentage */
  displayValue?: string;
  /** Color variant for the progress bar */
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
  /** Size of the progress bar */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage value inside the bar */
  showPercentageInBar?: boolean;
  /** Show percentage value on the right side */
  showPercentageLabel?: boolean;
  /** Optional CSS class name */
  className?: string;
  choldren?: React.ReactNode;
}

/**
 * ProgressBar Component
 *
 * Displays a horizontal progress bar with title on the left and optional percentage display.
 * Useful for showing completion status, scores, or any percentage-based metric.
 *
 * @example Basic Usage
 * ```tsx
 * <ProgressBar
 *   title="Task Completion"
 *   percentage={75}
 * />
 * ```
 *
 * @example With Subtitle
 * ```tsx
 * <ProgressBar
 *   title="Security Score"
 *   subtitle="OpenSSF Scorecard"
 *   percentage={85}
 *   variant="success"
 *   size="lg"
 * />
 * ```
 *
 * @example Multiple Progress Bars
 * ```tsx
 * <div className="space-y-3">
 *   <ProgressBar title="CPU Usage" percentage={65} variant="info" />
 *   <ProgressBar title="Memory Usage" percentage={82} variant="warning" />
 *   <ProgressBar title="Disk Usage" percentage={45} variant="success" />
 * </div>
 * ```
 */
export default function ProgressBar({
  title,
  percentage,
  displayValue,
  subtitle,
  variant = 'primary',
  size = 'md',
  showPercentageInBar = true,
  showPercentageLabel = true,
  className = '',
  children
}: ProgressBarProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  // Variant color classes
  const variantClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-400 text-gray-100',
    info: 'bg-cyan-600',
    gray: 'bg-gray-600',
  };

  // Size classes for the bar height
  const sizeClasses = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
  };

  // Text size for percentage in bar
  const textSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const barColorClass = variantClasses[variant];
  const barHeightClass = sizeClasses[size];
  const textSizeClass = textSizeClasses[size];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Title */}
      <div className="mb-1">
        <span className="font-semibold text-blue-900">{title}</span>
      </div>

      {/* Progress Bar and Children Container */}
      <div className="flex flex-row items-center gap-1">
        {/* Progress Bar */}
        <div className="relative flex-1">
          <div className={`bg-gray-200 rounded-full ${barHeightClass} overflow-hidden`}>
            <div
              className={`${barColorClass} ${barHeightClass} rounded-full justify-center px-2 transition-all duration-300`}
              style={{ width: `${clampedPercentage}%` }}
            />
          </div>

          {showPercentageInBar && clampedPercentage > 10 && (
            <div className="absolute top-0 left-0 w-full h-full flex pl-1 items-center">
              <span className={`${textSizeClass} ${clampedPercentage > 70 ? 'text-white' : 'text-gray-600'} text-nowrap`}>
                {displayValue ? displayValue : clampedPercentage.toFixed(0) + '%'}
              </span>
            </div>
          )}
        </div>

        {/* Children on the right */}
        {children && (
          <div className=" h-full flex justify-center items-center">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
