export const MINUTES_PER_DAY = 24 * 60;

export type TimeFormat = "12h" | "24h";

/** Compact labels fit tight grid cells ("7a", "5:30p", "17"). Full labels are for prose. */
export type ClockStyle = "compact" | "full";

/** Wraps any minute count into [0, 1440). */
export function wrapMinutes(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** Minute-of-day of a Date in UTC. */
export function utcMinuteOfDay(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

const partFormatters = new Map<string, Intl.DateTimeFormat>();

function getPartFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * UTC offset in whole minutes at `at` (e.g. -420 for UTC-7, 345 for UTC+5:45).
 * DST is resolved by the zone database, so the result is correct for the given date.
 */
export function getUtcOffsetMinutes(timeZone: string, at: Date): number {
  const parts = getPartFormatter(timeZone).formatToParts(at);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  const wallClockAsUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second"),
  );
  const instantSeconds = Math.floor(at.getTime() / 1000) * 1000;

  return Math.round((wallClockAsUtc - instantSeconds) / 60_000);
}

/** "UTC−7", "UTC+5:45", "UTC+0". Uses a real minus sign for typographic alignment. */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "−" : "+";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  const suffix = minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`;
  return `UTC${sign}${hours}${suffix}`;
}

/** Formats a minute-of-day as a clock time in the chosen format. */
export function formatClock(
  minuteOfDay: number,
  timeFormat: TimeFormat,
  style: ClockStyle = "full",
): string {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const mm = String(minute).padStart(2, "0");

  if (timeFormat === "24h") {
    const hh = String(hour).padStart(2, "0");
    return style === "compact" && minute === 0 ? hh : `${hh}:${mm}`;
  }

  const isPm = hour >= 12;
  const hour12 = hour % 12 || 12;
  const clock = minute === 0 ? `${hour12}` : `${hour12}:${mm}`;

  if (style === "compact") return `${clock}${isPm ? "p" : "a"}`;
  return `${clock}${isPm ? "pm" : "am"}`;
}

/**
 * Grid-cell label as one or two lines. Whole hours stay on one line ("7a").
 * Fractional hours ("5:30") split the meridiem onto a second line, because
 * "12:30p" doesn't fit a narrow cell.
 */
export function compactClockLines(minuteOfDay: number, timeFormat: TimeFormat): string[] {
  const minute = minuteOfDay % 60;
  if (timeFormat === "24h" || minute === 0) {
    return [formatClock(minuteOfDay, timeFormat, "compact")];
  }

  const hour = Math.floor(minuteOfDay / 60);
  const hour12 = hour % 12 || 12;
  return [`${hour12}:${String(minute).padStart(2, "0")}`, hour >= 12 ? "pm" : "am"];
}

/** Inclusive start, exclusive end. "9am — 12pm" covers hours 9, 10, 11. */
export function formatHourRange(
  range: { readonly startHour: number; readonly hourCount: number },
  timeFormat: TimeFormat,
): string {
  if (range.hourCount >= 24) return "All day";
  const start = range.startHour * 60;
  const end = ((range.startHour + range.hourCount) % 24) * 60;
  return `${formatClock(start, timeFormat)} — ${formatClock(end, timeFormat)}`;
}
