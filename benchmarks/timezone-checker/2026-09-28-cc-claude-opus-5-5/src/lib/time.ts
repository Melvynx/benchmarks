export type TimeFormat = "12h" | "24h";

export const MINUTES_PER_DAY = 24 * 60;
export const HOURS: readonly number[] = Array.from({ length: 24 }, (_, hour) => hour);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
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
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock components of `date` as observed in `timeZone`. */
export function getZonedParts(timeZone: string, date: Date): ZonedParts {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of getFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year ?? 1970,
    month: values.month ?? 1,
    day: values.day ?? 1,
    hour: (values.hour ?? 0) % 24,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

/** UTC offset of `timeZone` at `date`, in minutes. DST-aware and supports fractional zones. */
export function getOffsetMinutes(timeZone: string, date: Date): number {
  const p = getZonedParts(timeZone, date);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const instant = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((wallClockAsUtc - instant) / 60_000);
}

/** "UTC", "UTC+8", "UTC−7", "UTC+5:45". */
export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";
  const sign = offsetMinutes > 0 ? "+" : "−";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export interface ClockParts {
  hour: string;
  /** ":30" style suffix for non-whole hours, otherwise null. */
  minutes: string | null;
  /** "am" / "pm" in 12h mode, otherwise null. */
  period: string | null;
}

export function clockParts(minutesOfDay: number, format: TimeFormat): ClockParts {
  const total = mod(minutesOfDay, MINUTES_PER_DAY);
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const minutes = minute ? `:${String(minute).padStart(2, "0")}` : null;
  if (format === "24h") return { hour: String(hour24).padStart(2, "0"), minutes, period: null };
  return { hour: String(hour24 % 12 || 12), minutes, period: hour24 < 12 ? "am" : "pm" };
}

/** "9:41am" / "09:41" — for full clock readouts. */
export function formatClock(minutesOfDay: number, format: TimeFormat): string {
  const { hour, minutes, period } = clockParts(minutesOfDay, format);
  if (format === "24h") return `${hour}${minutes ?? ":00"}`;
  return `${hour}${minutes ?? ""}${period}`;
}

/** "9am" / "09:00" for a whole hour (24 is treated as midnight). */
export function formatHour(hour: number, format: TimeFormat): string {
  return formatClock(hour * 60, format);
}

export function weekdayName(year: number, month: number, day: number): string {
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
}
