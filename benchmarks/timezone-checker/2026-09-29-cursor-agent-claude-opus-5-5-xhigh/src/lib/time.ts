import { MINUTES_PER_HOUR } from './math';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
type Weekday = (typeof WEEKDAYS)[number];

export interface ZonedTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  minutesOfDay: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock time in `timeZone` at the given instant. */
export function getZonedTime(timeZone: string, date: Date): ZonedTime {
  const fields: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    fields[part.type] = part.value;
  }

  const hour = Number(fields.hour) % 24;
  const minute = Number(fields.minute);

  return {
    year: Number(fields.year),
    month: Number(fields.month),
    day: Number(fields.day),
    hour,
    minute,
    second: Number(fields.second),
    weekday: WEEKDAYS.indexOf(fields.weekday as Weekday),
    minutesOfDay: hour * MINUTES_PER_HOUR + minute,
  };
}

/**
 * UTC offset of `timeZone` at the given instant, in minutes (e.g. +330 for India).
 * Derived from the wall clock, so DST and fractional offsets come for free.
 */
export function getUtcOffsetMinutes(timeZone: string, date: Date): number {
  const zoned = getZonedTime(timeZone, date);
  const wallClockAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  const wholeSeconds = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((wallClockAsUtc - wholeSeconds) / 60_000);
}
