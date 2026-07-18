import type { City } from "../data/cities";

export type TimeFormat = "12h" | "24h";

export interface LocalTime {
  hour: number;
  minute: number;
  date: Date;
}

export interface HourRange {
  start: number;
  end: number;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timezone: string) {
  let formatter = partsFormatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsFormatterCache.set(timezone, formatter);
  }
  return formatter;
}

function offsetFormatter(timezone: string) {
  let formatter = offsetFormatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
      hour: "2-digit",
    });
    offsetFormatterCache.set(timezone, formatter);
  }
  return formatter;
}

function dateParts(date: Date, timezone: string) {
  const values: Record<string, number> = {};
  for (const part of partsFormatter(timezone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return values as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

export function getOffsetMinutes(timezone: string, date: Date): number {
  const label = offsetFormatter(timezone)
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = label?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (match) {
    const direction = match[1] === "+" ? 1 : -1;
    return direction * (Number(match[2]) * 60 + Number(match[3] ?? 0));
  }

  const parts = dateParts(date, timezone);
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUTC - date.getTime()) / 60_000);
}

export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "−";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

function zonedDateToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  timezone: string,
): Date {
  const approximate = Date.UTC(year, month - 1, day, hour, 0, 0);
  let offset = getOffsetMinutes(timezone, new Date(approximate));
  let instant = approximate - offset * 60_000;
  const correctedOffset = getOffsetMinutes(timezone, new Date(instant));
  if (correctedOffset !== offset) {
    offset = correctedOffset;
    instant = approximate - offset * 60_000;
  }
  return new Date(instant);
}

export function buildReferenceInstants(reference: City, now: Date): Date[] {
  const current = dateParts(now, reference.timezone);
  return Array.from({ length: 24 }, (_, hour) =>
    zonedDateToInstant(current.year, current.month, current.day, hour, reference.timezone),
  );
}

export function getLocalTime(instant: Date, timezone: string): LocalTime {
  const parts = dateParts(instant, timezone);
  return { hour: parts.hour, minute: parts.minute, date: instant };
}

export function isAwake(local: LocalTime, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) return true;
  const value = local.hour + local.minute / 60;
  return wakeHour < sleepHour
    ? value >= wakeHour && value < sleepHour
    : value >= wakeHour || value < sleepHour;
}

export function getHourRanges(flags: boolean[]): HourRange[] {
  if (flags.every(Boolean)) return [{ start: 0, end: 24 }];

  const ranges: HourRange[] = [];
  let start: number | null = null;
  for (let index = 0; index <= 24; index += 1) {
    const active = index < 24 && flags[index];
    if (active && start === null) start = index;
    if (!active && start !== null) {
      ranges.push({ start, end: index });
      start = null;
    }
  }

  if (ranges.length > 1 && ranges[0].start === 0 && ranges.at(-1)?.end === 24) {
    const first = ranges.shift();
    const last = ranges.pop();
    if (first && last) ranges.unshift({ start: last.start, end: first.end + 24 });
  }
  return ranges;
}

export function formatHour(hour: number, format: TimeFormat, compact = false): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (format === "24h") return compact ? String(normalized).padStart(2, "0") : `${String(normalized).padStart(2, "0")}:00`;
  const period = normalized < 12 ? "am" : "pm";
  const display = normalized % 12 || 12;
  return compact ? `${display}${period[0]}` : `${display}${period}`;
}

export function formatLocalTime(local: LocalTime, format: TimeFormat, compact = false): string {
  const minute = local.minute ? `:${String(local.minute).padStart(2, "0")}` : "";
  if (format === "24h") return `${String(local.hour).padStart(2, "0")}${minute}`;
  const period = local.hour < 12 ? "am" : "pm";
  const hour = local.hour % 12 || 12;
  return `${hour}${minute}${compact ? period[0] : period}`;
}

export function formatRange(range: HourRange, format: TimeFormat): string {
  if (range.start === 0 && range.end === 24) return "All day";
  return `${formatHour(range.start, format)} – ${formatHour(range.end, format)}`;
}

export function formatReferenceDate(reference: City, now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: reference.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);
}
