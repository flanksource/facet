import React from 'react';

interface SectionProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description?: string;
  metric?: React.ReactNode;
  variant?: 'hero' | 'card-grid' | 'two-column' | 'two-column-reverse' | 'metric-grid' | 'summary-grid' | 'dashboard';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  span?: number;
  columns?: 2 | 3 | 4;
  layout?: '9-3' | '10-2' | '8-4' | '6-6';
  children?: React.ReactNode;
}

/**
 * Section Component
 *
 * Unified component for various section layouts in datasheets.
 * Replaces ValueProposition and CapabilitySection with flexible variant system.
 *
 * Variants:
 * - 'hero': Single-column full-width layout for headers and value propositions
 * - 'two-column': Left content + right metric sidebar (configurable span or layout)
 * - 'two-column-reverse': Right content + left metric sidebar
 * - 'card-grid': Header with grid of cards below (2 columns)
 * - 'metric-grid': Header with grid of metric cards below (2-4 columns)
 * - 'summary-grid': Header with grid of entity/project cards below (2-3 columns)
 * - 'dashboard': Title/subtitle left, metric right, description/children below
 *
 * Size variants control typography and spacing:
 * - sm: 12pt title, 2mm gaps
 * - md: 14pt title, 4mm gaps (default)
 * - lg: 18pt title, 6mm gaps
 *
 * Layout shortcuts for two-column variants:
 * - '9-3': 9 columns content, 3 columns metric
 * - '10-2': 10 columns content, 2 columns metric
 * - '8-4': 8 columns content, 4 columns metric
 * - '6-6': 6 columns content, 6 columns metric
 *
 * Usage:
 * <Section
 *   variant="metric-grid"
 *   columns={3}
 *   title="Platform Metrics"
 *   description="Current system performance"
 * >
 *   <StatCard value="99.9%" label="Uptime" />
 *   <StatCard value="42" label="Services" />
 *   <StatCard value="5ms" label="Latency" />
 * </Section>
 */
export default function Section({
  title,
  subtitle,
  icon: IconComponent,
  description,
  metric,
  variant = 'hero',
  size = 'md',
  color = '#131f3b',
  className = '',
  span,
  columns,
  layout,
  children
}: SectionProps) {
  // Typography scale based on size
  const typography = {
    sm: {
      title: 'text-[12pt] leading-[16pt]',
      subtitle: 'text-[10pt] leading-[13pt]',
      description: 'text-[9pt] leading-[12pt]',
      gap: 'gap-[2mm]'
    },
    md: {
      title: 'text-[14pt] leading-[18pt]',
      subtitle: 'text-[11pt] leading-[14pt]',
      description: 'text-[10pt] leading-[14pt]',
      gap: 'gap-[4mm]'
    },
    lg: {
      title: 'text-[18pt] leading-[22pt]',
      subtitle: 'text-[13pt] leading-[16pt]',
      description: 'text-[11pt] leading-[15pt]',
      gap: 'gap-[6mm]'
    }
  }[size];

  // Convert layout shortcuts to span values
  const getSpanFromLayout = (layoutStr: string): number => {
    const layoutMap: Record<string, number> = {
      '9-3': 3,
      '10-2': 2,
      '8-4': 4,
      '6-6': 6
    };
    return layoutMap[layoutStr] || 3;
  };

  // Render header content (title, subtitle, icon, description)
  const renderHeader = (includeDescription = true) => (
    <>
      {title && (
        <h3 className={`${typography.title} font-semibold m-0 mb-[2mm]`} style={{ color }}>
          {IconComponent && (
            <span className="inline-block mr-[2mm] align-middle">
              <IconComponent style={{ color, width: '12pt', height: '12pt', display: 'inline-block' }} />
            </span>
          )}
          {title}
        </h3>
      )}
      {subtitle && (
        <h4 className={`${typography.subtitle} font-medium text-[#6b7280] m-0 mb-[2mm]`}>
          {subtitle}
        </h4>
      )}
      {includeDescription && description && (
        <p className={`${typography.description} text-[#374151] m-0 mb-[3mm]`}>
          {description}
        </p>
      )}
    </>
  );

  // Hero variant: Single-column full-width
  if (variant === 'hero') {
    return (
      <section className={`flex flex-col ${typography.gap} my-[4mm] ${className}`}>
        {renderHeader()}
        {children}
      </section>
    );
  }

  // Card-grid variant: Header above, 2-column grid below
  if (variant === 'card-grid') {
    return (
      <section className={`flex flex-col ${typography.gap} my-[4mm] ${className}`}>
        {renderHeader()}
        <div className="grid grid-cols-2 gap-[4mm]">
          {children}
        </div>
      </section>
    );
  }

  // Metric-grid variant: Header above, configurable grid of metrics below
  if (variant === 'metric-grid') {
    const gridCols = columns || 3;
    const gridClass = {
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4'
    }[gridCols];

    return (
      <section className={`flex flex-col ${typography.gap} my-[4mm] ${className}`}>
        {renderHeader()}
        <div className={`grid ${gridClass} gap-[4mm]`}>
          {children}
        </div>
      </section>
    );
  }

  // Summary-grid variant: Header above, 2-3 column grid for entity cards
  if (variant === 'summary-grid') {
    const gridCols = columns || 2;
    const gridClass = gridCols === 3 ? 'grid-cols-3' : 'grid-cols-2';

    return (
      <section className={`flex flex-col ${typography.gap} my-[4mm] ${className}`}>
        {renderHeader()}
        <div className={`grid ${gridClass} gap-[4mm]`}>
          {children}
        </div>
      </section>
    );
  }

  // Dashboard variant: Title/subtitle left, metric right in row; description/children below
  if (variant === 'dashboard') {
    return (
      <section className={`flex flex-col ${typography.gap} my-[4mm] ${className}`}>
        <div className="grid grid-cols-12 gap-[6mm] items-start">
          <div className="col-span-9">
            {renderHeader(false)}
          </div>
          {metric && (
            <div className="col-span-3 min-w-0">
              {metric}
            </div>
          )}
        </div>
        {description && (
          <p className={`${typography.description} text-[#374151] m-0`}>
            {description}
          </p>
        )}
        {children}
      </section>
    );
  }

  // Two-column variant: Left content + right metric
  if (variant === 'two-column') {
    // Use layout prop if provided, otherwise fall back to span or default
    const effectiveSpan = layout ? getSpanFromLayout(layout) : (span || 3);
    const leftSpan = 12 - effectiveSpan;
    const rightSpan = effectiveSpan;

    return (
      <section className={`grid grid-cols-12 gap-[6mm] my-[4mm] items-start ${className}`}>
        <div className={`col-span-${leftSpan}`}>
          {renderHeader()}
          {children}
        </div>
        {metric && (
          <div className={`col-span-${rightSpan} min-w-0`}>
            {metric}
          </div>
        )}
      </section>
    );
  }

  // Two-column-reverse variant: Left metric + right content
  if (variant === 'two-column-reverse') {
    // Use layout prop if provided, otherwise fall back to span or default
    const effectiveSpan = layout ? getSpanFromLayout(layout) : (span || 6);
    const leftSpan = effectiveSpan;
    const rightSpan = 12 - effectiveSpan;

    return (
      <section className={`grid grid-cols-12 gap-[6mm] my-[4mm] items-start ${className}`}>
        {metric && (
          <div className={`col-span-${leftSpan} min-w-0 order-1`}>
            {metric}
          </div>
        )}
        <div className={`col-span-${rightSpan} order-2`}>
          {renderHeader()}
          {children}
        </div>
      </section>
    );
  }

  // Default fallback to hero
  return (
    <section className={`flex flex-col ${typography.gap} my-[4mm] ${className}`}>
      {renderHeader()}
      {children}
    </section>
  );
}
