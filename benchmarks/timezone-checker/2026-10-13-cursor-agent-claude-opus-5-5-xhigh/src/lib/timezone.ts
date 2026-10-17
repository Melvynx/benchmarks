export const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * Offset of `timeZone` from UTC at `date`, in minutes (e.g. +330 for India).
 * Derived from the zone's wall clock at that instant, so DST is picked up automatically.
 */
export function getUtcOffsetMinutes(timeZone: string, date: Date): number {
  const parts = getFormatter(timeZone).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const wallClockAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  const instant = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((wallClockAsUtc - instant) / MS_PER_MINUTE);
}

export interface WallClock {
  year: number;
  /** 0-based, like `Date#getMonth`. */
  month: number;
  day: number;
  weekday: number;
  minutesOfDay: number;
}

export function getWallClock(date: Date, offsetMinutes: number): WallClock {
  const shifted = new Date(date.getTime() + offsetMinutes * MS_PER_MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
