import type { ReactNode } from 'react';
import clsx from 'clsx';

interface ShieldProps {
  value: string;
  label?: string;
  size?: 'h-3' | 'h-4' | 'h-5' | 'h-6';
  theme?: 'primary' | 'secondary' | 'success' | 'warning' | 'high' | 'error' | 'info';
  icon?: ReactNode;
  href?: string;
  target?: string;
  ariaLabel?: string;
  className?: string;
}

export function Shield({
  value,
  label,
  size = 'h-5',
  theme = 'primary',
  icon,
  href,
  target,
  ariaLabel,
  className,
}: ShieldProps) {
  const themes = {
    primary: {
      label: 'bg-zinc-300 text-zinc-500',
      value: 'bg-blue-600 text-white',
    },
    secondary: {
      label: 'bg-zinc-300 text-zinc-500',
      value: 'bg-zinc-600 text-white',
    },
    success: {
      label: 'bg-zinc-300 text-zinc-500',
      value: 'bg-green-600 text-white',
    },
    warning: {
      label: 'bg-zinc-300 text-zinc-500',
      value: 'bg-yellow-500 text-gray-900',
    },
    high: {
      label: 'bg-zinc-300 text-zinc-500',
      value: 'bg-orange-600 text-white',
    },
    error: {
      label: 'bg-zinc-300 text-zinc-500',
      value: 'bg-red-600 text-white',
    },
    info: {
      label: 'bg-zinc-300 text-zinc-500',
      value: 'bg-blue-500 text-white',
    },
  };

  const sizeConfig = {
    'h-3': {
      container: 'h-3',
      text: 'text-[8px]',
      icon: 'text-[8px]',
      padding: 'px-1.5',
      gap: 'gap-0.5',
    },
    'h-4': {
      container: 'h-4',
      text: 'text-[8px]',
      icon: 'text-[8px]',
      padding: 'px-2',
      gap: 'gap-1',
    },
    'h-5': {
      container: 'h-5',
      text: 'text-[10px]',
      icon: 'text-[10px]',
      padding: 'px-2',
      gap: 'gap-1',
    },
    'h-6': {
      container: 'h-6',
      text: 'text-xs',
      icon: 'text-xs',
      padding: 'px-2.5',
      gap: 'gap-1',
    },
  };

  const currentTheme = themes[theme];
  const currentSize = sizeConfig[size];

  const badgeContent = (
    <div
      className={clsx(
        'inline-flex items-center overflow-hidden rounded font-bold uppercase',
        currentSize.container,
        className
      )}
      aria-label={ariaLabel}
    >
      {label && (
        <div
          className={clsx(
            'flex items-center justify-center',
            currentSize.padding,
            currentSize.gap,
            currentSize.container,
            currentSize.text,
            currentTheme.label
          )}
        >
          {icon && (
            <span className={clsx('inline-flex', currentSize.icon)}>
              {icon}
            </span>
          )}
          <span>{label}</span>
        </div>
      )}
      <div
        className={clsx(
          'flex items-center justify-center',
          currentSize.padding,
          currentSize.gap,
          currentSize.container,
          currentSize.text,
          currentTheme.value,
          !label && icon && 'pl-1.5'
        )}
      >
        {!label && icon && (
          <span className={clsx('inline-flex', currentSize.icon)}>
            {icon}
          </span>
        )}
        <span>{value}</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        className="inline-block no-underline hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-opacity"
        aria-label={ariaLabel}
      >
        {badgeContent}
      </a>
    );
  }

  return badgeContent;
}

export default Shield;
