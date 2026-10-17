import type { HourRange } from "./overlap";
import { MINUTES_PER_DAY, mod } from "./timezone";

export type TimeFormat = "12h" | "24h";

const MINUS = "\u2212";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const pad2 = (value: number) => String(value).padStart(2, "0");

function splitMinutes(minutesOfDay: number) {
  const minutes = mod(Math.round(minutesOfDay), MINUTES_PER_DAY);
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}

const to12 = (hour: number) => (hour % 12 === 0 ? 12 : hour % 12);
const meridiem = (hour: number) => (hour < 12 ? "am" : "pm");

/** "9am" / "09:00" */
export function formatHour(hour: number, format: TimeFormat): string {
  const h = mod(hour, 24);
  return format === "12h" ? `${to12(h)}${meridiem(h)}` : `${pad2(h)}:00`;
}

/** "4:26pm" / "16:26". Whole hours drop the minutes in 12h unless `withMinutes`. */
export function formatClock(minutesOfDay: number, format: TimeFormat, withMinutes = false): string {
  const { hour, minute } = splitMinutes(minutesOfDay);
  if (format === "24h") return `${pad2(hour)}:${pad2(minute)}`;
  const minutes = minute || withMinutes ? `:${pad2(minute)}` : "";
  return `${to12(hour)}${minutes}${meridiem(hour)}`;
}

export interface CellLabel {
  hour: string;
  /** Only set for fractional zones (":30", ":45"), so they stand out from whole hours. */
  minutes: string | null;
  meridiem: string | null;
}

export function formatCellLabel(minutesOfDay: number, format: TimeFormat): CellLabel {
  const { hour, minute } = splitMinutes(minutesOfDay);
  return {
    hour: format === "24h" ? pad2(hour) : String(to12(hour)),
    minutes: minute ? pad2(minute) : null,
    meridiem: format === "12h" ? meridiem(hour) : null,
  };
}

/** "9am — 12pm" (start inclusive, end exclusive). */
export function formatRange(range: HourRange, format: TimeFormat): string {
  if (range.length >= 24) return "All day";
  return `${formatHour(range.start, format)} — ${formatHour(range.start + range.length, format)}`;
}

/** Same window expressed in another city's local time. */
export function formatLocalRange(range: HourRange, diffMinutes: number, format: TimeFormat): string {
  if (range.length >= 24) return "All day";
  const start = range.start * 60 + diffMinutes;
  return `${formatClock(start, format)} — ${formatClock(start + range.length * 60, format)}`;
}

/** "UTC+5:30" / "UTC−7" */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? MINUS : "+";
  const abs = Math.abs(offsetMinutes);
  const minutes = abs % 60;
  return `UTC${sign}${Math.floor(abs / 60)}${minutes ? `:${pad2(minutes)}` : ""}`;
}

/** "+9h" / "−3h 30m" / "±0h" relative to the reference city. */
export function formatOffsetDiff(diffMinutes: number): string {
  if (diffMinutes === 0) return "±0h";
  const sign = diffMinutes < 0 ? MINUS : "+";
  const abs = Math.abs(diffMinutes);
  const minutes = abs % 60;
  return `${sign}${Math.floor(abs / 60)}h${minutes ? ` ${minutes}m` : ""}`;
}

export function formatHours(count: number): string {
  return `${count} ${count === 1 ? "hour" : "hours"}`;
}

export const formatWeekday = (weekday: number) => WEEKDAYS[mod(weekday, 7)] ?? "";

export const formatShortDate = (month: number, day: number) => `${MONTHS[month] ?? ""} ${day}`;
