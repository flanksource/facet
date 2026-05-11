import React from 'react';
import clsx from 'clsx';

/**
 * Badge size variant — either a named preset or a numeric font size in pt.
 * Numeric sizes interpolate container padding, icon dimensions, and gap
 * from the named presets so custom typography still lays out consistently.
 */
export type BadgeSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | number;

/**
 * Badge shape variant
 */
export type BadgeShape = 'pill' | 'rounded' | 'square';

/**
 * Badge visual variant
 */
export type BadgeVariant = 'status' | 'metric' | 'custom' | 'outlined' | 'label';

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
  label?: React.ReactNode;

  /**
   * Value text (right section)
   */
  value?: React.ReactNode;

  /**
   * Additional CSS classes for the label section.
   */
  labelClassName?: string;

  /**
   * Additional CSS classes for the value section.
   */
  valueClassName?: string;

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
   * Allow the badge content to wrap instead of forcing a single line.
   */
  wrap?: boolean;

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

type SizeClasses = {
  container: string;
  icon: string;
  text: string;
  gap: string;
  /**
   * Inline-style fallbacks for numeric sizes. Tailwind's JIT cannot resolve
   * runtime-built arbitrary-value classes, so numeric sizes apply padding,
   * gap, font sizing, and icon dimensions via inline styles instead.
   * Split to match the className split so each render path can apply only
   * what it needs (e.g. the label variant uses gap on the chip but not the
   * wrapper).
   */
  containerStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
  gapStyle?: React.CSSProperties;
  iconStyle?: React.CSSProperties;
};

const NAMED_SIZE_MAP: Record<Exclude<BadgeSize, number>, SizeClasses> = {
  xxs: {
    container: 'px-[0.9mm] py-[0.2mm]',
    icon: 'w-[2.3mm] h-[2.3mm]',
    text: 'text-[7pt] leading-[8pt]',
    gap: 'gap-[0.6mm]',
  },
  xs: {
    container: 'px-[1.2mm] py-[0.3mm]',
    icon: 'w-[2.7mm] h-[2.7mm]',
    text: 'text-[8pt] leading-[9pt]',
    gap: 'gap-[0.8mm]',
  },
  sm: {
    container: 'px-[1.6mm] py-[0.45mm]',
    icon: 'w-[3mm] h-[3mm]',
    text: 'text-[9pt] leading-[10pt]',
    gap: 'gap-[1mm]',
  },
  md: {
    container: 'px-[2mm] py-[0.6mm]',
    icon: 'w-[3.6mm] h-[3.6mm]',
    text: 'text-[10pt] leading-[12pt]',
    gap: 'gap-[1.2mm]',
  },
  lg: {
    container: 'px-[2.6mm] py-[0.8mm]',
    icon: 'w-[4.2mm] h-[4.2mm]',
    text: 'text-[11pt] leading-[13pt]',
    gap: 'gap-[1.5mm]',
  },
};

const DEFAULT_SIZE: Exclude<BadgeSize, number> = 'md';

/**
 * Get size-based classes. Accepts named presets (xxs/xs/sm/md/lg) or a
 * numeric font size in pt. Unknown values fall back to 'md' to keep
 * rendering resilient rather than throwing on `.container` access.
 */
function getSizeClasses(size: BadgeSize): SizeClasses {
  if (typeof size === 'number' && Number.isFinite(size) && size > 0) {
    const pt = size;
    return {
      container: '',
      icon: '',
      text: '',
      gap: '',
      containerStyle: {
        paddingLeft: `${pt * 0.2}mm`,
        paddingRight: `${pt * 0.2}mm`,
        paddingTop: `${pt * 0.06}mm`,
        paddingBottom: `${pt * 0.06}mm`,
      },
      textStyle: {
        fontSize: `${pt}pt`,
        lineHeight: `${pt * 1.2}pt`,
      },
      gapStyle: { gap: `${pt * 0.12}mm` },
      iconStyle: {
        width: `${pt * 0.36}mm`,
        height: `${pt * 0.36}mm`,
      },
    };
  }

  return NAMED_SIZE_MAP[size as Exclude<BadgeSize, number>] ?? NAMED_SIZE_MAP[DEFAULT_SIZE];
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
  status,
  color,
  textColor,
  borderColor,
  icon: Icon,
  label,
  value,
  labelClassName,
  valueClassName,
  size = 'md',
  shape = 'pill',
  href,
  target = '_self',
  rel,
  wrap = false,
  className,
}: BadgeProps) {
  const sizeClasses = getSizeClasses(size);
  const shapeClass = getShapeClasses(shape);
  const textWrapClasses = wrap ? 'min-w-0 max-w-full whitespace-normal break-all' : 'whitespace-nowrap';

  // Determine background and text colors based on variant
  let colorClasses = '';
  let customStyles: React.CSSProperties = {
    ...sizeClasses.containerStyle,
    ...sizeClasses.textStyle,
    ...sizeClasses.gapStyle,
  };

  if (variant === 'status') {
    colorClasses = getStatusClasses(status ?? 'info', variant);
  } else if (variant === 'outlined') {
    if (status) {
      colorClasses = clsx('bg-transparent', getStatusClasses(status, variant));
    } else {
      colorClasses = 'bg-transparent text-slate-700 border-slate-300';
      if (textColor?.startsWith('#') || textColor?.startsWith('rgb') || textColor?.startsWith('hsl')) {
        customStyles.color = textColor;
      } else if (textColor) {
        colorClasses += ` ${textColor}`;
      }

      if (borderColor?.startsWith('#') || borderColor?.startsWith('rgb') || borderColor?.startsWith('hsl')) {
        customStyles.borderColor = borderColor;
      } else if (borderColor) {
        colorClasses += ` ${borderColor}`;
      }
    }
  } else if (variant === 'custom') {
    // Handle custom colors
    if (color?.startsWith('#') || color?.startsWith('rgb') || color?.startsWith('hsl')) {
      customStyles.backgroundColor = color;
    } else if (color) {
      colorClasses += ` ${color}`;
    }

    if (textColor?.startsWith('#') || textColor?.startsWith('rgb') || textColor?.startsWith('hsl')) {
      customStyles.color = textColor;
    } else if (textColor) {
      colorClasses += ` ${textColor}`;
    }

    if (borderColor?.startsWith('#') || borderColor?.startsWith('rgb') || borderColor?.startsWith('hsl')) {
      customStyles.borderColor = borderColor;
      colorClasses += ' border';
    } else if (borderColor) {
      colorClasses += ` border ${borderColor}`;
    }
  } else if (variant === 'label') {
    colorClasses = '';
  } else {
    // Default metric variant
    colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  // Label variant: colored label section + plain value, all inside a shared border
  if (variant === 'label') {
    let labelBg = 'bg-slate-200';
    let labelText = 'text-slate-700';
    let labelStyle: React.CSSProperties = {};
    if (color?.startsWith('#') || color?.startsWith('rgb') || color?.startsWith('hsl')) {
      labelStyle.backgroundColor = color;
      labelStyle.color = textColor || '#334155';
    } else if (color) {
      labelBg = color;
    }
    if (textColor && !(textColor.startsWith('#') || textColor.startsWith('rgb') || textColor.startsWith('hsl'))) {
      labelText = textColor;
    }

    const wrapperClasses = clsx(
      'inline-flex align-middle items-stretch border border-slate-200 bg-white font-medium leading-none text-slate-700',
      wrap ? 'max-w-full flex-wrap' : 'shrink-0 overflow-hidden',
      sizeClasses.text,
      shapeClass,
      href && 'transition-opacity hover:opacity-80 cursor-pointer',
      className,
    );

    const labelChipClasses = clsx(
      'inline-flex self-stretch items-center leading-none',
      wrap && 'flex-wrap',
      textWrapClasses,
      sizeClasses.container,
      sizeClasses.gap,
      labelBg,
      labelText,
      labelClassName,
    );

    const valueClasses = clsx(
      'inline-flex self-stretch items-center leading-none text-slate-700',
      wrap && 'flex-wrap',
      textWrapClasses,
      sizeClasses.container,
      valueClassName,
    );

    const chipStyle: React.CSSProperties = {
      ...sizeClasses.containerStyle,
      ...sizeClasses.gapStyle,
      ...labelStyle,
    };
    const valueStyle: React.CSSProperties = { ...sizeClasses.containerStyle };
    const wrapperStyle: React.CSSProperties = { ...sizeClasses.textStyle };
    const iconElement = Icon
      ? (sizeClasses.iconStyle
          ? <span className="inline-flex" style={sizeClasses.iconStyle}><Icon className="w-full h-full" /></span>
          : <Icon className={sizeClasses.icon} />)
      : null;

    const labelContent = (
      <>
        {(iconElement || label != null) && (
          <span className={labelChipClasses} style={chipStyle}>
            {iconElement}
            {label != null && <span>{label}</span>}
          </span>
        )}
        {value != null && <span className={valueClasses} style={valueStyle}>{value}</span>}
      </>
    );

    if (href) {
      return (
        <a href={href} target={target} rel={rel || (target === '_blank' ? 'noopener noreferrer' : undefined)} className={wrapperClasses} style={wrapperStyle}>
          {labelContent}
        </a>
      );
    }
    return <span className={wrapperClasses} style={wrapperStyle}>{labelContent}</span>;
  }

  // Base classes for badge container
  const badgeClasses = clsx(
    'inline-flex align-middle items-center font-medium leading-none border',
    wrap ? 'max-w-full flex-wrap' : 'shrink-0',
    textWrapClasses,
    sizeClasses.container,
    sizeClasses.text,
    sizeClasses.gap,
    shapeClass,
    colorClasses,
    href && 'transition-opacity hover:opacity-80 cursor-pointer',
    className
  );

  // Render label section (darker background for two-part badges)
  const renderLabel = () => {
    if (!label && !Icon) return null;

    const labelClasses = clsx(
      'inline-flex items-center leading-none',
      textWrapClasses,
      sizeClasses.gap || (sizeClasses.gapStyle ? undefined : 'gap-1.5'),
      value != null && 'pr-2 -ml-3 pl-3 border-r border-black/10',
      labelClassName,
    );

    return (
      <span className={labelClasses} style={sizeClasses.gapStyle}>
        {Icon && (sizeClasses.iconStyle
          ? <span className="inline-flex" style={sizeClasses.iconStyle}><Icon className="w-full h-full" /></span>
          : <Icon className={sizeClasses.icon} />)}
        {label != null && <span>{label}</span>}
      </span>
    );
  };

  // Render value section
  const renderValue = () => {
    if (value == null) return null;
    return <span className={clsx('leading-none', textWrapClasses, label != null && 'pl-1', valueClassName)}>{value}</span>;
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
