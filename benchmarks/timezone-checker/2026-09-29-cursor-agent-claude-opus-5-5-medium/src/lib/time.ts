import type { Settings, TimeFormat } from "../types";

export const MINUTES_PER_DAY = 1440;
export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export const mod = (value: number, base: number) => ((value % base) + base) % base;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function zonedFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
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
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function getZonedParts(timeZone: string, date: Date): ZonedParts & { second: number } {
  const parts: Record<string, number> = {};
  for (const part of zonedFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: mod(parts.hour ?? 0, 24),
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
}

/** UTC offset in minutes for `timeZone` at `date` (DST-aware, supports :30 / :45 zones). */
export function getOffsetMinutes(timeZone: string, date: Date): number {
  const p = getZonedParts(timeZone, date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC±0";
  const sign = offsetMinutes > 0 ? "+" : "−";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

/** Summary-style time, e.g. "9am", "9:30pm", "09:00". */
export function formatTime(minuteOfDay: number, format: TimeFormat): string {
  const m = mod(Math.round(minuteOfDay), MINUTES_PER_DAY);
  const hour = Math.floor(m / 60);
  const minute = m % 60;
  if (format === "24h") {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const h12 = hour % 12 || 12;
  const suffix = hour < 12 ? "am" : "pm";
  return `${h12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${suffix}`;
}

export const formatHour = (hour: number, format: TimeFormat) => formatTime(hour * 60, format);

/** Two-line cell label: a prominent number plus a small qualifier. */
export function formatCell(minuteOfDay: number, format: TimeFormat): { primary: string; secondary: string } {
  const m = mod(minuteOfDay, MINUTES_PER_DAY);
  const hour = Math.floor(m / 60);
  const minute = m % 60;
  const mm = String(minute).padStart(2, "0");
  if (format === "24h") {
    return { primary: String(hour).padStart(2, "0"), secondary: `:${mm}` };
  }
  const h12 = hour % 12 || 12;
  return {
    primary: minute ? `${h12}:${mm}` : String(h12),
    secondary: hour < 12 ? "am" : "pm",
  };
}

function isAwakeAt(minuteOfDay: number, { wakeHour, sleepHour }: Settings): boolean {
  if (wakeHour === sleepHour) return true;
  const m = mod(minuteOfDay, MINUTES_PER_DAY);
  const wake = wakeHour * 60;
  const sleep = sleepHour * 60;
  return wake < sleep ? m >= wake && m < sleep : m >= wake || m < sleep;
}

/**
 * A cell counts as awake only if the full local hour starting at `startMinute`
 * is inside the awake window. Matters for fractional offsets: at UTC+5:30 a
 * cell starting at 6:30 with a 7am wake-up is still sleeping.
 */
export function isHourAwake(startMinute: number, settings: Settings): boolean {
  return isAwakeAt(startMinute, settings) && isAwakeAt(startMinute + 59, settings);
}

export function awakeDuration({ wakeHour, sleepHour }: Settings): number {
  return mod(sleepHour - wakeHour, 24) || 24;
}
