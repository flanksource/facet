import React from 'react';
import clsx from 'clsx';

/**
 * Badge size variant
 */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Badge shape variant
 */
export type BadgeShape = 'pill' | 'rounded' | 'square';

/**
 * Badge visual variant
 */
export type BadgeVariant = 'status' | 'metric' | 'custom' | 'outlined';

/**
 * Semantic status types for status badges
 */
export type BadgeStatus = 'success' | 'error' | 'warning' | 'info';

/**
 * Props for the Badge component
 */
export interface BadgeProps {
  /**
   * Visual variant of the badge
   * @default 'metric'
   */
  variant?: BadgeVariant;

  /**
   * Semantic status for status variant badges
   * Only applicable when variant='status'
   */
  status?: BadgeStatus;

  /**
   * Custom background color (hex or Tailwind class)
   * Only applicable when variant='custom'
   */
  color?: string;

  /**
   * Custom text color (hex or Tailwind class)
   * Only applicable when variant='custom'
   */
  textColor?: string;

  /**
   * Custom border color (hex or Tailwind class)
   * Only applicable when variant='custom' or 'outlined'
   */
  borderColor?: string;

  /**
   * Icon component to display (left-aligned)
   * Should be a React component that accepts className prop
   */
  icon?: React.ComponentType<{ className?: string }>;

  /**
   * Label text (left section)
   */
  label?: string;

  /**
   * Value text (right section)
   */
  value?: string;

  /**
   * Size of the badge
   * @default 'md'
   */
  size?: BadgeSize;

  /**
   * Shape/border-radius of the badge
   * @default 'pill'
   */
  shape?: BadgeShape;

  /**
   * URL for clickable badge (renders as <a> tag)
   */
  href?: string;

  /**
   * Link target attribute
   * @default '_self'
   */
  target?: '_blank' | '_self' | '_parent' | '_top';

  /**
   * Link rel attribute (e.g., 'noopener noreferrer' for external links)
   */
  rel?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Get status-based color classes
 */
function getStatusClasses(status: BadgeStatus, variant: BadgeVariant): string {
  const baseClasses = {
    success: variant === 'outlined'
      ? 'border-green-500 text-green-700'
      : 'bg-green-100 text-green-800 border-green-200',
    error: variant === 'outlined'
      ? 'border-red-500 text-red-700'
      : 'bg-red-100 text-red-800 border-red-200',
    warning: variant === 'outlined'
      ? 'border-yellow-500 text-yellow-700'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200',
    info: variant === 'outlined'
      ? 'border-blue-500 text-blue-700'
      : 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return baseClasses[status];
}

/**
 * Get size-based classes
 */
function getSizeClasses(size: BadgeSize): { container: string; icon: string; text: string } {
  const sizeMap = {
    xs: {
      container: 'px-1 gap-1',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    sm: {
      container: 'px-2 py-0.5 gap-1',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    md: {
      container: 'px-3 py-1 gap-1.5',
      icon: 'w-3.5 h-3.5',
      text: 'text-sm',
    },
    lg: {
      container: 'px-4 py-1.5 gap-2',
      icon: 'w-4 h-4',
      text: 'text-base',
    },
  };

  return sizeMap[size];
}

/**
 * Get shape-based border-radius classes
 */
function getShapeClasses(shape: BadgeShape): string {
  const shapeMap = {
    pill: 'rounded-full',
    rounded: 'rounded-md',
    square: 'rounded-none',
  };

  return shapeMap[shape];
}

/**
 * Badge component for displaying status indicators, metrics, and labeled values
 *
 * @example
 * // Status badge
 * <Badge variant="status" status="success" label="Build" value="passing" />
 *
 * @example
 * // Metric badge with icon
 * <Badge variant="metric" icon={StarIcon} label="Stars" value="1.2k" />
 *
 * @example
 * // Custom color badge
 * <Badge variant="custom" color="#7c3aed" textColor="#fff" label="v1.2.3" />
 *
 * @example
 * // Outlined badge as link
 * <Badge variant="outlined" status="info" label="Docs" href="/docs" target="_blank" />
 */
export default function Badge({
  variant = 'metric',
  status = 'info',
  color,
  textColor,
  borderColor,
  icon: Icon,
  label,
  value,
  size = 'md',
  shape = 'pill',
  href,
  target = '_self',
  rel,
  className,
}: BadgeProps) {
  const sizeClasses = getSizeClasses(size);
  const shapeClass = getShapeClasses(shape);

  // Determine background and text colors based on variant
  let colorClasses = '';
  let customStyles: React.CSSProperties = {};

  if (variant === 'status') {
    colorClasses = getStatusClasses(status, variant);
  } else if (variant === 'outlined') {
    colorClasses = clsx(
      'bg-transparent border-2',
      status ? getStatusClasses(status, variant) : borderColor
    );
  } else if (variant === 'custom') {
    // Handle custom colors
    if (color?.startsWith('#') || color?.startsWith('rgb')) {
      customStyles.backgroundColor = color;
    } else if (color) {
      colorClasses += ` ${color}`;
    }

    if (textColor?.startsWith('#') || textColor?.startsWith('rgb')) {
      customStyles.color = textColor;
    } else if (textColor) {
      colorClasses += ` ${textColor}`;
    }

    if (borderColor?.startsWith('#') || borderColor?.startsWith('rgb')) {
      customStyles.borderColor = borderColor;
      colorClasses += ' border';
    } else if (borderColor) {
      colorClasses += ` border ${borderColor}`;
    }
  } else {
    // Default metric variant
    colorClasses = 'bg-gray-100 text-gray-800 border-gray-200';
  }

  // Base classes for badge container
  const badgeClasses = clsx(
    'inline-flex items-center font-medium whitespace-nowrap border',
    sizeClasses.container,
    sizeClasses.text,
    shapeClass,
    colorClasses,
    href && 'transition-opacity hover:opacity-80 cursor-pointer',
    className
  );

  // Render label section (darker background for two-part badges)
  const renderLabel = () => {
    if (!label && !Icon) return null;

    const labelClasses = clsx(
      'flex items-center',
      sizeClasses.gap || 'gap-1.5',
      value && 'pr-2 -ml-3 pl-3 border-r border-black/10'
    );

    return (
      <span className={labelClasses}>
        {Icon && <Icon className={sizeClasses.icon} />}
        {label && <span>{label}</span>}
      </span>
    );
  };

  // Render value section
  const renderValue = () => {
    if (!value) return null;
    return <span className={label ? 'pl-1' : ''}>{value}</span>;
  };

  // Render content
  const content = (
    <>
      {renderLabel()}
      {renderValue()}
    </>
  );

  // Render as link or span
  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel || (target === '_blank' ? 'noopener noreferrer' : undefined)}
        className={badgeClasses}
        style={customStyles}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={badgeClasses} style={customStyles}>
      {content}
    </span>
  );
}
