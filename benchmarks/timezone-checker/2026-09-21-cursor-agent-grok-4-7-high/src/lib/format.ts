import type { TimeFormat, TimeRange } from "../types";

export function formatClockParts(
  hour: number,
  minute: number,
  format: TimeFormat,
): { primary: string; secondary?: string } {
  const h = ((hour % 24) + 24) % 24;
  if (format === "24") {
    const hh = String(h).padStart(2, "0");
    if (minute === 0) return { primary: hh };
    return { primary: `${hh}:${String(minute).padStart(2, "0")}` };
  }
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  if (minute === 0) return { primary: `${h12}${suffix}` };
  return { primary: `${h12}:${String(minute).padStart(2, "0")}`, secondary: suffix };
}

export function formatClock(
  hour: number,
  minute: number,
  format: TimeFormat,
  compact = false,
): string {
  const h = ((hour % 24) + 24) % 24;
  if (format === "24") {
    const hh = String(h).padStart(2, "0");
    if (compact && minute === 0) return hh;
    return `${hh}:${String(minute).padStart(2, "0")}`;
  }
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  if (minute === 0) return `${h12}${suffix}`;
  return `${h12}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function formatClockTime(hour: number, minute: number, format: TimeFormat): string {
  const h = ((hour % 24) + 24) % 24;
  if (format === "24") return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function formatEndpoint(hour: number, format: TimeFormat): string {
  if (hour === 24) return format === "24" ? "24:00" : formatClock(0, 0, format);
  return format === "24" ? formatClock(hour, 0, format) : formatClock(hour, 0, format);
}

export function formatRange(range: TimeRange, format: TimeFormat): string {
  if (range.start === 0 && range.end === 24) return "All day";
  const end = range.end === 24 ? 24 : range.end;
  return `${formatEndpoint(range.start, format)} – ${formatEndpoint(end, format)}`;
}

export function formatOffset(minutes: number): string {
  if (minutes === 0) return "UTC+0";
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${String(mins).padStart(2, "0")}`;
}

export function hourCountLabel(count: number): string {
  return `${count} ${count === 1 ? "hour" : "hours"}`;
}
