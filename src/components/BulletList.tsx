import React from 'react';
import { Icon } from '@iconify/react';

// @flanksource/icons IndexMap is not available in this version
// Using undefined to trigger fallback behavior
const Icons: Record<string, string> | undefined = undefined;

interface BulletItem {
  term: string | React.ReactNode;
  subtitle?: string;
  description?: string;
  color?: string;
  icon?: string | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

interface BulletGroup {
  title: string;
  items: BulletItem[];
}

interface BulletListProps {
  items?: BulletItem[];
  groups?: BulletGroup[];
  variant?: 'default' | 'border-left' | 'gradient' | 'icon-left' | 'compact' | 'card';
  columns?: number;
  size?: 'xs' | 'sm' | 'md';
  termClass?: string;
  descriptionClass?: string;
  className?: string;
}

/**
 * Color class mappings for Tailwind CSS
 * Tailwind requires complete class names at build time (no string interpolation)
 */
const COLOR_CLASSES = {
  blue: {
    border: 'border-l-4 border-blue-500',
    gradient: 'bg-gradient-to-r from-blue-50 to-blue-100',
    gradientBorder: 'border border-blue-300',
    icon: 'text-blue-600',
    text: 'text-blue-500',
  },
  green: {
    border: 'border-l-4 border-green-500',
    gradient: 'bg-gradient-to-r from-green-50 to-green-100',
    gradientBorder: 'border border-green-300',
    icon: 'text-green-600',
    text: 'text-green-500',
  },
  indigo: {
    border: 'border-l-4 border-indigo-500',
    gradient: 'bg-gradient-to-r from-indigo-50 to-indigo-100',
    gradientBorder: 'border border-indigo-300',
    icon: 'text-indigo-600',
    text: 'text-indigo-500',
  },
  orange: {
    border: 'border-l-4 border-orange-500',
    gradient: 'bg-gradient-to-r from-orange-50 to-orange-100',
    gradientBorder: 'border border-orange-300',
    icon: 'text-orange-600',
    text: 'text-orange-500',
  },
  red: {
    border: 'border-l-4 border-red-500',
    gradient: 'bg-gradient-to-r from-red-50 to-red-100',
    gradientBorder: 'border border-red-300',
    icon: 'text-red-600',
    text: 'text-red-500',
  },
  purple: {
    border: 'border-l-4 border-purple-500',
    gradient: 'bg-gradient-to-r from-purple-50 to-purple-100',
    gradientBorder: 'border border-purple-300',
    icon: 'text-purple-600',
    text: 'text-purple-500',
  },
  yellow: {
    border: 'border-l-4 border-yellow-500',
    gradient: 'bg-gradient-to-r from-yellow-50 to-yellow-100',
    gradientBorder: 'border border-yellow-300',
    icon: 'text-yellow-600',
    text: 'text-yellow-500',
  },
  pink: {
    border: 'border-l-4 border-pink-500',
    gradient: 'bg-gradient-to-r from-pink-50 to-pink-100',
    gradientBorder: 'border border-pink-300',
    icon: 'text-pink-600',
    text: 'text-pink-500',
  },
  cyan: {
    border: 'border-l-4 border-cyan-500',
    gradient: 'bg-gradient-to-r from-cyan-50 to-cyan-100',
    gradientBorder: 'border border-cyan-300',
    icon: 'text-cyan-600',
    text: 'text-cyan-500',
  },
  teal: {
    border: 'border-l-4 border-teal-500',
    gradient: 'bg-gradient-to-r from-teal-50 to-teal-100',
    gradientBorder: 'border border-teal-300',
    icon: 'text-teal-600',
    text: 'text-teal-500',
  },
  gray: {
    border: 'border-l-4 border-gray-500',
    gradient: 'bg-gradient-to-r from-gray-50 to-gray-100',
    gradientBorder: 'border border-gray-300',
    icon: 'text-gray-600',
    text: 'text-gray-500',
  },
} as const;

/**
 * Get Tailwind color classes for a given color name
 */
function getColorClasses(color: string, variant: string) {
  const colorKey = color as keyof typeof COLOR_CLASSES;
  const classes = COLOR_CLASSES[colorKey] || COLOR_CLASSES.gray;

  if (variant === 'border-left') {
    return {
      border: classes.border,
    };
  }

  if (variant === 'gradient') {
    return {
      background: classes.gradient,
      border: classes.gradientBorder,
      icon: classes.icon,
    };
  }

  return {};
}

/**
 * Get size-specific classes for font, spacing, and layout
 */
function getSizeClasses(size: 'xs' | 'sm' | 'md') {
  const sizeMap = {
    xs: {
      text: 'text-[8pt] leading-[10pt]',
      termText: 'text-[8pt] leading-[10pt]',
      descriptionText: 'text-[7pt] leading-[9pt]',
      gap: 'gap-0.5',
      itemGap: 'space-y-0.5',
      padding: 'p-2',
      cardPadding: 'p-2',
      iconSize: 14
    },
    sm: {
      text: 'text-[9pt] leading-[12pt]',
      termText: 'text-[9pt] leading-[12pt]',
      descriptionText: 'text-[8pt] leading-[10pt]',
      gap: 'gap-1',
      itemGap: 'space-y-1',
      padding: 'p-2.5',
      cardPadding: 'p-3',
      iconSize: 16
    },
    md: {
      text: 'text-[11pt] leading-[14pt]',
      termText: 'text-[11pt] leading-[14pt]',
      descriptionText: 'text-[10pt] leading-[13pt]',
      gap: 'gap-1.5',
      itemGap: 'space-y-2',
      padding: 'p-3',
      cardPadding: 'p-4',
      iconSize: 18
    }
  };
  return sizeMap[size];
}

/**
 * Render icon - supports:
 * - JSX Icon components from unplugin-icons (React components)
 * - Iconify icons (ion:*) via @iconify/react
 * - Flanksource icons (postgres, kubernetes)
 * - Emoji/text fallback
 */
function renderIcon(
  icon?: string | React.ComponentType<{ className?: string; style?: React.CSSProperties }>,
  size: number = 24,
  color?: string
) {
  console.log('Rendering icon:', icon);
  if (!icon) return null;

  // JSX Icon component (from unplugin-icons or React components)
  // Check if it's a function or React component object
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && ('$$typeof' in icon || React.isValidElement(icon)))) {
    const IconComponent = icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    return <IconComponent style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }} />;
  }

  // String-based icon name
  const iconName = icon as string;

  // Iconify icon (e.g., "ion:alert-circle-outline")
  if (iconName.includes(':')) {
    return <Icon icon={iconName} width={size} height={size} style={{ display: 'inline-block', verticalAlign: 'middle' }} />;
  }

  // Flanksource icon (e.g., "postgres", "kubernetes")
  if (typeof Icons === 'object' && Icons && iconName in Icons) {
    const iconSrc = Icons[iconName as keyof typeof Icons];
    if (iconSrc) {
      return <img src={iconSrc} alt={iconName} width={size} height={size} style={{ display: 'inline-block', verticalAlign: 'middle' }} />;
    }
  }

  // Fallback to emoji or text
  return <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>{iconName}</span>;
}

/**
 * BulletList Component (DS-17)
 *
 * Enforces bold lead-in phrase formatting for bullet points with multiple style variants.
 *
 * Supports three variants:
 * - default: Simple list with bold term and description
 * - border-left: Styled with left border accent (used in architecture page)
 * - gradient: Gradient background with icons (used in component showcases)
 *
 * DS-17: List items SHOULD start with bold lead-in phrases followed by details
 *
 * @example Default usage
 * ```tsx
 * <BulletList
 *   items={[
 *     {
 *       term: "Automatic discovery",
 *       description: "Agentless scraping across AWS, Azure, GCP, Kubernetes"
 *     },
 *     {
 *       term: "Real-time updates",
 *       description: "5-minute freshness with event-driven change detection"
 *     }
 *   ]}
 * />
 * ```
 *
 * @example Default with columns
 * ```tsx
 * <BulletList
 *   columns={2}
 *   items={[
 *     {
 *       term: "Automatic discovery",
 *       description: "Agentless scraping across AWS, Azure, GCP, Kubernetes"
 *     },
 *     {
 *       term: "Real-time updates",
 *       description: "5-minute freshness with event-driven change detection"
 *     },
 *     {
 *       term: "Full topology",
 *       description: "Dependencies, relationships, and change history"
 *     },
 *     {
 *       term: "GitOps workflows",
 *       description: "Declarative configuration management"
 *     }
 *   ]}
 * />
 * ```
 *
 * @example Border-left variant (Architecture page style)
 * ```tsx
 * <BulletList
 *   variant="border-left"
 *   columns={2}
 *   items={[
 *     {
 *       term: "Playbooks",
 *       description: "Event-driven automation engine for Day 2 operations.",
 *       color: "blue"
 *     },
 *     {
 *       term: "Unified Catalog",
 *       description: "Graph database storing infrastructure state.",
 *       color: "yellow"
 *     },
 *     {
 *       term: "Health Checks",
 *       description: "Synthetic monitoring with 35+ check types.",
 *       color: "green"
 *     }
 *   ]}
 * />
 * ```
 *
 * @example Gradient variant with groups (Component showcase style)
 * ```tsx
 * <BulletList
 *   variant="gradient"
 *   groups={[
 *     {
 *       title: "Data & Processing Layer",
 *       items: [
 *         {
 *           term: "Unified Catalog",
 *           description: "Graph database correlating infrastructure state.",
 *           color: "yellow",
 *           icon: "◉"
 *         },
 *         {
 *           term: "PostgreSQL",
 *           description: "Time-series and graph-enabled datastore.",
 *           color: "blue",
 *           icon: "◉"
 *         }
 *       ]
 *     },
 *     {
 *       title: "Automation & Operations",
 *       items: [
 *         {
 *           term: "Playbooks",
 *           description: "Event-driven automation engine.",
 *           color: "purple",
 *           icon: "◉"
 *         }
 *       ]
 *     }
 *   ]}
 * />
 * ```
 */
export default function BulletList({
  items = [],
  groups = [],
  variant = 'default',
  columns = 1,
  size = 'md',
  termClass = 'font-semibold',
  descriptionClass = '',
  className = ''
}: BulletListProps) {
  const sizeClasses = getSizeClasses(size);
  // Get grid column class - Tailwind requires complete class names
  const getGridColsClass = (cols: number) => {
    switch (cols) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-1';
    }
  };

  // Default variant with CSS Grid layout
  if (variant === 'default') {
    if (columns > 1) {
      return (
        <ul className={`bullet-list grid ${getGridColsClass(columns)} ${sizeClasses.gap} ${sizeClasses.text} ${className}`}>
          {items.map((item, index) => (
            <li key={index} className={item.icon ? 'has-icon' : ''}>
              {item.icon && <>{renderIcon(item.icon, sizeClasses.iconSize)} </>}
              <span className={termClass}>{item.term}</span>
              {item.description && <> - <span className={descriptionClass}>{item.description}</span></>}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <ul className={`bullet-list ${sizeClasses.itemGap} ${sizeClasses.text} ${className}`}>
        {items.map((item, index) => (
          <li key={index} className={item.icon ? 'has-icon' : ''}>
            {item.icon && <>{renderIcon(item.icon, sizeClasses.iconSize)} </>}
            <span className={termClass}>{item.term}</span>
            {item.description && <> - <span className={descriptionClass}>{item.description}</span></>}
          </li>
        ))}
      </ul>
    );
  }

  // Border-left variant with CSS Grid layout
  if (variant === 'border-left') {
    const gridClass = columns > 1 ? `grid ${getGridColsClass(columns)} ${sizeClasses.gap}` : sizeClasses.itemGap;

    return (
      <div className={`${gridClass} ${className}`}>
        {items.map((item, index) => {
          const colorClasses = getColorClasses(item.color || 'gray', variant);
          const content = item.subtitle || item.description;
          return (
            <div key={index} className={`${colorClasses.border} ${sizeClasses.padding}`}>
              <h4 className={`${termClass} text-slate-900 ${sizeClasses.termText}`}>{item.term}</h4>
              {content && <div className={`${descriptionClass} text-gray-600 ${sizeClasses.descriptionText}`}>{content}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  // Icon-left variant with CSS Grid layout
  if (variant === 'icon-left') {
    const gridClass = columns > 1 ? `grid ${getGridColsClass(columns)} ${sizeClasses.gap}` : sizeClasses.itemGap;

    return (
      <div className={`${gridClass} ${className}`}>
        {items.map((item, index) => {
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="text-gray-400 flex-shrink-0">
                {renderIcon(item.icon, sizeClasses.iconSize) || '•'}
              </span>
              <div className={sizeClasses.text}>
                <span className={`${termClass} text-slate-900`}>{item.term}</span>
                {item.description && <span className={`${descriptionClass} text-gray-600`}> — {item.description}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <ul className={`${sizeClasses.itemGap} ${className}`}>
        {items.map((item, index) => (
          <li key={index} className={sizeClasses.text}>
            <span className={`${termClass} text-slate-800`}>{item.term}</span>
            {item.description && <><span>:</span>{' '}<span className={`${descriptionClass} text-gray-600`}>{item.description}</span></>}
          </li>
        ))}
      </ul>
    );
  }

  // Card variant
  if (variant === 'card') {
    const gridClass = columns > 1 ? `grid ${getGridColsClass(columns)} ${sizeClasses.gap}` : sizeClasses.itemGap;

    return (
      <div className={`${gridClass} ${className}`}>
        {items.map((item, index) => {
          const colorKey = (item.color || 'blue') as keyof typeof COLOR_CLASSES;
          const textColorClass = COLOR_CLASSES[colorKey]?.text || COLOR_CLASSES.blue.text;

          return (
            <div key={index} className={`bg-white rounded-lg shadow-sm border border-gray-200 ${sizeClasses.cardPadding} hover:shadow-md transition-shadow`}>
              {item.icon && (
                <div className={`${textColorClass} mb-2`}>
                  {renderIcon(item.icon, sizeClasses.iconSize * 1.5)}
                </div>
              )}
              <h4 className={`${termClass} text-slate-900 mb-1 ${sizeClasses.termText}`}>{item.term}</h4>
              {item.description && <p className={`${descriptionClass} text-gray-600 ${sizeClasses.descriptionText}`}>{item.description}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  // Gradient variant
  if (variant === 'gradient') {
    const renderItems = (itemsToRender: BulletItem[]) => (
      <>
        {itemsToRender.map((item, index) => {
          const colorClasses = getColorClasses(item.color || 'gray', variant);
          return (
            <div
              key={index}
              className={`flex-1 min-w-[280px] ${colorClasses.background} ${colorClasses.border} rounded-lg ${sizeClasses.padding}`}
            >
              <h4 className={`${termClass} text-slate-900 flex items-center gap-2 ${sizeClasses.termText}`}>
                {item.icon && (
                  <span className={colorClasses.icon}>{renderIcon(item.icon, sizeClasses.iconSize)}</span>
                )}
                {item.term}
              </h4>
              {item.description && <p className={`${descriptionClass} text-gray-700 mt-1 ${sizeClasses.descriptionText}`}>{item.description}</p>}
            </div>
          );
        })}
      </>
    );

    // If groups are provided, render with section headers
    if (groups.length > 0) {
      return (
        <div className={`flex flex-wrap ${sizeClasses.gap} ${className}`}>
          {groups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              <div className="flex-none w-full">
                <h3 className={`font-semibold text-gray-500 uppercase tracking-wide mb-2 ${sizeClasses.termText}`}>
                  {group.title}
                </h3>
              </div>
              {renderItems(group.items)}
            </React.Fragment>
          ))}
        </div>
      );
    }

    // Otherwise render items without groups
    return (
      <div className={`flex flex-wrap ${sizeClasses.gap} ${className}`}>
        {renderItems(items)}
      </div>
    );
  }

  return null;
}
