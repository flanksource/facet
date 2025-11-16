import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

/**
 * Format duration from milliseconds to human-readable string
 * @param value Duration in milliseconds
 * @returns Formatted string like "2d5h30m15s" or "450ms"
 */
export function formatDuration(value: number): string {
  const durationObj = dayjs.duration(value, 'milliseconds');
  const milliseconds = durationObj.asMilliseconds();

  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(0)}ms`;
  }

  const seconds = durationObj.seconds();
  const minutes = durationObj.minutes();
  const hours = durationObj.hours();
  const days = durationObj.days();

  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0) {
    parts.push(`${seconds}s`);
  }

  const remainingMilliseconds = (milliseconds % 1000).toFixed(0);
  // only show milliseconds if there is no other value
  if (parseInt(remainingMilliseconds) > 0 && parts.length === 0) {
    parts.push(`${remainingMilliseconds}ms`);
  }

  return parts.join('');
}

/**
 * Check if a value is empty (null, undefined, empty string, or empty array)
 */
export function isEmpty(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}
