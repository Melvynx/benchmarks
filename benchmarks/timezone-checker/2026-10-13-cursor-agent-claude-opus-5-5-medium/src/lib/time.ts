export type TimeFormat = "12h" | "24h";

export const MINUTES_PER_DAY = 24 * 60;

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = getPartsFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

/** UTC offset in minutes for `timeZone` at `date` (DST-aware). */
export function getUtcOffsetMinutes(timeZone: string, date: Date): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const truncated = Math.floor(date.getTime() / 60_000) * 60_000;
  return Math.round((asUtc - truncated) / 60_000);
}

export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "−" : "+";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export interface ClockParts {
  /** Main hour label, e.g. "9" (12h) or "09" (24h). */
  hour: string;
  /** Minutes suffix, e.g. ":30", empty on the hour. */
  minutes: string;
  /** "am" / "pm" in 12h mode, empty in 24h mode. */
  meridiem: string;
}

export function clockParts(minutesOfDay: number, format: TimeFormat): ClockParts {
  const m = mod(Math.round(minutesOfDay), MINUTES_PER_DAY);
  const h = Math.floor(m / 60);
  const min = m % 60;
  const minutes = min ? `:${String(min).padStart(2, "0")}` : "";
  if (format === "24h") {
    return { hour: String(h).padStart(2, "0"), minutes, meridiem: "" };
  }
  return { hour: String(h % 12 === 0 ? 12 : h % 12), minutes, meridiem: h < 12 ? "am" : "pm" };
}

/** "9am", "9:30pm", "12am" — or "09:00", "21:30" in 24h. */
export function formatTime(minutesOfDay: number, format: TimeFormat): string {
  const { hour, minutes, meridiem } = clockParts(minutesOfDay, format);
  if (format === "24h") return `${hour}${minutes || ":00"}`;
  return `${hour}${minutes}${meridiem}`;
}

export function formatHour(hour: number, format: TimeFormat): string {
  return formatTime(hour * 60, format);
}

/** Short weekday of the calendar date `shift` days after `parts`. */
export function weekdayAfter(parts: Pick<ZonedParts, "year" | "month" | "day">, shift: number): string {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + shift)).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}
