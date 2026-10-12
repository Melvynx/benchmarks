import type { HourRange } from "./schedule";
import { formatHour, type TimeFormat } from "./time";

export function formatRange(range: HourRange, format: TimeFormat): string {
  if (range.hours >= 24) return "All day";
  return `${formatHour(range.start, format)} — ${formatHour(range.end, format)}`;
}

export function formatHours(hours: number): string {
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}
