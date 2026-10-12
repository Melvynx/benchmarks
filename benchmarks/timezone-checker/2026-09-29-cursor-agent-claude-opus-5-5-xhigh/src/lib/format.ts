import { HOURS_PER_DAY, MINUTES_PER_DAY, MINUTES_PER_HOUR, mod } from './math';
import type { HourRange } from './overlap';

export type TimeFormat = '12h' | '24h';

export const RANGE_SEPARATOR = ' — ';

const pad = (value: number) => String(value).padStart(2, '0');

function splitMinutes(minutes: number) {
  const total = mod(Math.round(minutes), MINUTES_PER_DAY);
  return { hour: Math.floor(total / MINUTES_PER_HOUR), minute: total % MINUTES_PER_HOUR };
}

/** "9am", "5:30pm" (12h) or "09:00", "17:30" (24h). Wraps past midnight. */
export function formatClock(minutes: number, format: TimeFormat): string {
  const { hour, minute } = splitMinutes(minutes);
  if (format === '24h') return `${pad(hour)}:${pad(minute)}`;
  const minutePart = minute ? `:${pad(minute)}` : '';
  return `${hour % 12 || 12}${minutePart}${hour < 12 ? 'am' : 'pm'}`;
}

export function formatHour(hour: number, format: TimeFormat): string {
  return formatClock(hour * MINUTES_PER_HOUR, format);
}

export interface CellLabel {
  hour: string;
  /** Only set for fractional-offset zones, e.g. "30" for India. */
  minute: string | null;
  meridiem: 'am' | 'pm' | null;
}

export function cellLabel(minutes: number, format: TimeFormat): CellLabel {
  const { hour, minute } = splitMinutes(minutes);
  const minuteLabel = minute ? pad(minute) : null;
  if (format === '24h') return { hour: pad(hour), minute: minuteLabel, meridiem: null };
  return { hour: String(hour % 12 || 12), minute: minuteLabel, meridiem: hour < 12 ? 'am' : 'pm' };
}

/**
 * Inclusive start → exclusive end: `{ start: 9, length: 3 }` → "9am — 12pm".
 * `shiftMinutes` re-expresses the range in another city's local time.
 */
export function formatRange(range: HourRange, format: TimeFormat, shiftMinutes = 0): string {
  if (range.length >= HOURS_PER_DAY) return 'All day';
  const start = range.start * MINUTES_PER_HOUR + shiftMinutes;
  const end = start + range.length * MINUTES_PER_HOUR;
  return `${formatClock(start, format)}${RANGE_SEPARATOR}${formatClock(end, format)}`;
}

function formatSignedDuration(minutes: number, style: 'offset' | 'diff'): string {
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / MINUTES_PER_HOUR);
  const rest = abs % MINUTES_PER_HOUR;
  if (style === 'offset') return `${sign}${hours}${rest ? `:${pad(rest)}` : ''}`;
  return `${sign}${hours}h${rest ? ` ${rest}m` : ''}`;
}

/** "UTC−7", "UTC+5:30", "UTC+0" */
export function formatOffset(offsetMinutes: number): string {
  return `UTC${formatSignedDuration(offsetMinutes, 'offset')}`;
}

/** Difference relative to the reference city: "+15h", "−3h 30m", "same time". */
export function formatDiff(diffMinutes: number): string {
  return diffMinutes === 0 ? 'same time' : formatSignedDuration(diffMinutes, 'diff');
}

export function formatHourCount(hours: number): string {
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
