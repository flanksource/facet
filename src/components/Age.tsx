import clsx from 'clsx';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import { isEmpty } from '../utils/date';

dayjs.extend(LocalizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(duration);

export interface AgeProps {
  className?: string;
  from?: Date | string;
  to?: Date | string | null;
  suffix?: boolean;
}

export function Age({
  className = '',
  from,
  to,
  suffix = false
}: AgeProps) {
  if (isEmpty(from)) {
    return null;
  }

  const _from = dayjs(from);

  // No "to" date - show relative time from now
  if (isEmpty(to)) {
    return (
      <span className={className} title={_from.format('YYYY-MM-DD HH:mm:ssZ')}>
        {_from.local().fromNow(!suffix)}
      </span>
    );
  }

  const _to = dayjs(to);
  const durationObj = dayjs.duration(_to.diff(_from));

  // Duration less than 1 second - show milliseconds
  if (durationObj.asMilliseconds() < 1000) {
    return (
      <span
        className={className}
        title={_from.format('YYYY-MM-DD HH:mm:ssZ')}
      >
        {durationObj.asMilliseconds()}ms
      </span>
    );
  }

  // Show relative time between two dates
  return (
    <span
      className={clsx(className, 'whitespace-nowrap')}
      title={`${_from.format('YYYY-MM-DD HH:mm:ssZ')} - ${_to.format('YYYY-MM-DD HH:mm:ssZ')}`}
    >
      {_from.local().to(_to, !suffix)}
    </span>
  );
}

export default Age;
