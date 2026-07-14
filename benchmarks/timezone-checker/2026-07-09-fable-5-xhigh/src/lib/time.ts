import type { TimeFormat } from '../types';

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * UTC offset of `timeZone` at `date`, in minutes (Geneva in July → +120,
 * Mumbai → +330). Derived from Intl so DST and fractional offsets are exact.
 */
export function utcOffsetMinutes(timeZone: string, date: Date): number {
  // Work on a whole minute so the wall-clock read-back differs from the
  // timestamp by exactly the offset.
  const floored = new Date(Math.floor(date.getTime() / 60_000) * 60_000);
  const parts = partsFormatter(timeZone).formatToParts(floored);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return (asUtc - floored.getTime()) / 60_000;
}

/** "UTC+2", "UTC−7", "UTC+5:30" (typographic minus for display). */
export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '−' : '+';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${hours}${minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

const clockFormatters = new Map<string, Intl.DateTimeFormat>();

/** Current wall-clock time in a zone: "3:42 pm" or "15:42". */
export function formatLocalClock(timeZone: string, date: Date, format: TimeFormat): string {
  const key = `${timeZone}|${format}`;
  let formatter = clockFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      ...(format === '12h' ? { hour12: true } : { hourCycle: 'h23' as const }),
    });
    clockFormatters.set(key, formatter);
  }
  return formatter.format(date).toLowerCase();
}

/** Minutes since local midnight in `timeZone` at `date` (0–1439). */
export function localMinutesOfDay(timeZone: string, date: Date): number {
  const offset = utcOffsetMinutes(timeZone, date);
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return ((utcMinutes + offset) % 1440 + 1440) % 1440;
}
