import React from 'react';

/**
 * CalloutBox Props
 */
export interface CalloutBoxProps {
  /** Content to display inside the callout */
  children: React.ReactNode;
  /** Visual variant of the callout */
  variant?: 'info' | 'warning' | 'success' | 'default';
  /** Optional title for the callout */
  title?: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * CalloutBox Component
 *
 * Displays an emphasized callout box with different visual styles.
 * Useful for highlighting important information, warnings, or tips.
 *
 * @example
 * ```tsx
 * <CalloutBox variant="info" title="Important Note">
 *   This is important information that users should know.
 * </CalloutBox>
 * ```
 */
export default function CalloutBox({
  children,
  variant = 'default',
  title,
  className = '',
}: CalloutBoxProps) {
  const variantStyles = {
    info: {
      container: 'bg-blue-50/50 border-l-blue-500',
      title: 'text-blue-900',
      content: 'text-blue-700',
    },
    warning: {
      container: 'bg-yellow-50/50 border-l-yellow-500',
      title: 'text-yellow-900',
      content: 'text-yellow-700',
    },
    success: {
      container: 'bg-green-50/50 border-l-green-500',
      title: 'text-green-900',
      content: 'text-green-700',
    },
    default: {
      container: 'bg-zinc-50/75 border-l-zinc-300',
      title: 'text-zinc-900',
      content: 'text-zinc-600',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`${styles.container} border-l-[3pt] rounded-r p-4 my-4 ${className}`}
    >
      {title && (
        <h3 className={`text-sm font-bold ${styles.title} mb-2`}>{title}</h3>
      )}
      <div className={`text-sm ${styles.content} leading-relaxed`}>
        {children}
      </div>
    </div>
  );
}
