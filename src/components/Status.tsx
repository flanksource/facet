type StatusVariant = 'healthy' | 'warning' | 'danger' | 'unknown';

function getStatusVariant(
  status: string | undefined,
  good: boolean | undefined,
  mixed: boolean | undefined
): StatusVariant {
  status = status?.toLowerCase();

  if (
    status === 'degraded' ||
    status === 'missing' ||
    status === 'unhealthy' ||
    (good !== undefined && !good)
  ) {
    return 'danger';
  }

  if (status === 'unknown' || status === 'suspended') {
    return 'unknown';
  }

  if (status === 'warning' || status === 'warn') {
    return 'warning';
  }

  if (mixed !== undefined && mixed) {
    return 'warning';
  }

  return 'healthy';
}

export interface StatusProps {
  good?: boolean;
  mixed?: boolean;
  status?: string;
  className?: string;
  statusText?: string;
  hideText?: boolean;
}

export function Status({
  status,
  statusText,
  good,
  mixed,
  className = '',
  hideText = false
}: StatusProps) {
  if (!status && good === undefined && mixed === undefined) {
    return null;
  }

  const variant = getStatusVariant(status, good, mixed);
  const indicatorClassName =
    variant === 'unknown'
      ? 'inline-flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full border border-gray-400 bg-white text-gray-400'
      : `inline-block h-3 w-3 flex-shrink-0 rounded-full shadow-md ${
          variant === 'danger'
            ? 'bg-red-400'
            : variant === 'warning'
              ? 'bg-orange-400'
              : 'bg-green-400'
        }`;

  const accessibleLabel = statusText ?? status;

  return (
    <div className="inline-flex flex-row items-center">
      <span
        className={`${indicatorClassName} ${className}`}
        aria-hidden={hideText ? undefined : true}
        aria-label={hideText ? accessibleLabel : undefined}
        role={hideText ? 'img' : undefined}
      >
        {variant === 'unknown' && (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
        )}
      </span>
      {!hideText && (
        <span className="pl-1 capitalize">{accessibleLabel}</span>
      )}
    </div>
  );
}

export default Status;
