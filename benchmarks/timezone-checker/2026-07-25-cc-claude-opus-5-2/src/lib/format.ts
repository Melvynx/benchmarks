import type { HourRange } from "./availability";

export type TimeFormat = "12h" | "24h";

export type ClockLabel = {
  /** "9", "9:30", "21", "21:45" — the part that carries the weight. */
  value: string;
  /** "AM"/"PM" in 12h mode, undefined in 24h mode. */
  meridiem?: "AM" | "PM";
};

/** Compact label for a grid cell: minutes only appear for fractional offsets. */
export function formatClock(hour: number, minute: number, format: TimeFormat): ClockLabel {
  if (format === "24h") {
    const value = minute === 0 ? pad(hour) : `${pad(hour)}:${pad(minute)}`;
    return { value };
  }
  const normalized = ((hour % 12) + 12) % 12;
  const hour12 = normalized === 0 ? 12 : normalized;
  const value = minute === 0 ? `${hour12}` : `${hour12}:${pad(minute)}`;
  return { value, meridiem: hour < 12 ? "AM" : "PM" };
}

/** Full label for headings and ranges: "9 AM" or "09:00". Accepts 24 for midnight. */
export function formatHourLabel(hour: number, format: TimeFormat): string {
  if (format === "24h") return `${pad(hour)}:00`;
  const label = formatClock(hour % 24, 0, "12h");
  return `${label.value} ${label.meridiem}`;
}

/** "9 AM → 12 PM" — start inclusive, end exclusive. */
export function formatHourRange(range: HourRange, format: TimeFormat): string {
  return `${formatHourLabel(range.start, format)} → ${formatHourLabel(range.end, format)}`;
}

/** "4:07 PM" / "16:07" — a city's live local time. */
export function formatTimeOfDay(hour: number, minute: number, format: TimeFormat): string {
  if (format === "24h") return `${pad(hour)}:${pad(minute)}`;
  const label = formatClock(hour, minute === 0 ? 0 : minute, "12h");
  const value = minute === 0 ? `${label.value}:00` : label.value;
  return `${value} ${label.meridiem}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
