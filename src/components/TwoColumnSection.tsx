import React from 'react';

interface TwoColumnSectionProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  className?: string;
}

/**
 * TwoColumnSection Component (DS-2)
 *
 * Multi-column layout for content below the fold.
 * Automatically stacks on small screens for responsive design.
 *
 * DS-2: Single-column layout above fold, multi-column below fold
 *
 * Usage:
 * <TwoColumnSection
 *   leftContent={<CapabilitySection ... />}
 *   rightContent={<CapabilitySection ... />}
 * />
 */
export default function TwoColumnSection({
  leftContent,
  rightContent,
  className
}: TwoColumnSectionProps) {
  return (
    <section className={`grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 ${className || ''}`}>
      <div className="min-w-0">{leftContent}</div>
      <div className="min-w-0">{rightContent}</div>
    </section>
  );
}
