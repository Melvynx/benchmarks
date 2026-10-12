export type TimeFormat = "12h" | "24h";

export const MINUTES_PER_DAY = 24 * 60;

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

/** Wall-clock date and time in `timeZone` at the given instant. */
export function getZonedParts(timeZone: string, date: Date): ZonedParts {
  const parts: Record<string, number> = {};
  for (const { type, value } of getFormatter(timeZone).formatToParts(date)) {
    if (type !== "literal") parts[type] = Number(value);
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: (parts.hour ?? 0) % 24,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
}

/**
 * UTC offset of `timeZone` at the given instant, in minutes (UTC+5:30 → 330).
 * Derived from the live date, so daylight saving time is always accounted for.
 */
export function getUtcOffsetMinutes(timeZone: string, date: Date): number {
  const instant = Math.floor(date.getTime() / 1000) * 1000;
  const p = getZonedParts(timeZone, new Date(instant));
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((wallClockAsUtc - instant) / 60_000);
}

function splitMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const abs = Math.abs(totalMinutes);
  return { hours: Math.floor(abs / 60), minutes: abs % 60 };
}

const MINUS = "−";

/** 330 → "UTC+5:30", -420 → "UTC−7", 0 → "UTC". */
export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";
  const { hours, minutes } = splitMinutes(offsetMinutes);
  const sign = offsetMinutes > 0 ? "+" : MINUS;
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

/** Difference between two cities: 900 → "+15h", -150 → "−2h 30m", 0 → "same time". */
export function formatRelativeOffset(diffMinutes: number): string {
  if (diffMinutes === 0) return "same time";
  const { hours, minutes } = splitMinutes(diffMinutes);
  const sign = diffMinutes > 0 ? "+" : MINUS;
  const parts = [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""].filter(Boolean);
  return `${sign}${parts.join(" ")}`;
}

export interface ClockParts {
  /** "9", "9:30", "09", "21:45" */
  time: string;
  /** "am" / "pm" in 12-hour mode, empty in 24-hour mode. */
  period: string;
}

/** Split a minute-of-day into display parts for the grid cells. */
export function clockParts(minuteOfDay: number, format: TimeFormat): ClockParts {
  const normalized = ((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const minuteSuffix = minute ? `:${String(minute).padStart(2, "0")}` : "";

  if (format === "24h") {
    return { time: `${String(hour).padStart(2, "0")}${minuteSuffix}`, period: "" };
  }
  return { time: `${hour % 12 || 12}${minuteSuffix}`, period: hour < 12 ? "am" : "pm" };
}

/**
 * Human-readable clock time.
 * 12h: "9am", "9:30pm", "12pm". 24h: "09:00", "21:30".
 */
export function formatClock(minuteOfDay: number, format: TimeFormat): string {
  const { time, period } = clockParts(minuteOfDay, format);
  if (format === "24h") return time.includes(":") ? time : `${time}:00`;
  return `${time}${period}`;
}

export function formatHour(hour: number, format: TimeFormat): string {
  return formatClock(hour * 60, format);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Weekday of a calendar date shifted by `dayOffset` days. */
export function weekdayOf(date: Pick<ZonedParts, "year" | "month" | "day">, dayOffset = 0): string {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + dayOffset));
  return WEEKDAYS[utc.getUTCDay()] ?? "";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "Tue, Sep 29" */
export function formatShortDate(date: Pick<ZonedParts, "year" | "month" | "day">): string {
  return `${weekdayOf(date)}, ${MONTHS[date.month - 1] ?? ""} ${date.day}`;
}
