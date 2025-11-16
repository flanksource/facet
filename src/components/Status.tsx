function getStatusColor(
  status: string | undefined,
  good: boolean | undefined,
  mixed: boolean | undefined
): string {
  status = status?.toLowerCase();

  if (
    status === 'degraded' ||
    status === 'missing' ||
    status === 'unhealthy' ||
    (good !== undefined && !good)
  ) {
    return 'bg-red-400';
  }

  if (status === 'unknown' || status === 'suspended') {
    return 'bg-gray-400';
  }

  if (status === 'warning' || status === 'warn') {
    return 'bg-orange-400';
  }

  if (mixed !== undefined && mixed) {
    return 'bg-orange-400';
  }

  return 'bg-green-400';
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

  const color = getStatusColor(status, good, mixed);

  return (
    <div className="inline-flex flex-row items-center">
      <span
        className={`inline-block h-3 w-3 flex-shrink-0 rounded-full shadow-md ${className} ${color}`}
        aria-hidden="true"
      />
      {!hideText && (
        <span className="pl-1 capitalize">{statusText ?? status}</span>
      )}
    </div>
  );
}

export default Status;
