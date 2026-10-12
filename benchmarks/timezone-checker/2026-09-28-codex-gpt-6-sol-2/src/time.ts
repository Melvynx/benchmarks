import type { City } from "./cities";

export type TimeFormat = "12h" | "24h";
export type Mode = "meeting" | "base";
export type HourCell = { hour: number; minute: number; awake: boolean };
export type HourRow = { city: City; cells: HourCell[]; overlap: boolean[] };
export type TimeRange = { start: number; end: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let value = formatterCache.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, value);
  }
  return value;
}

function partsAt(date: Date, timeZone: string) {
  const fields = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
  return {
    year: fields.year,
    month: fields.month,
    day: fields.day,
    hour: fields.hour,
    minute: fields.minute,
    second: fields.second,
  };
}

export function utcOffsetMinutes(date: Date, timeZone: string) {
  const local = partsAt(date, timeZone);
  const utcEquivalent = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );
  return Math.round(
    (utcEquivalent - Math.floor(date.getTime() / 1000) * 1000) / 60000,
  );
}

export function formatUtcOffset(minutes: number) {
  const sign = minutes < 0 ? "−" : "+";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return `UTC${sign}${hours}${remainder ? `:${String(remainder).padStart(2, "0")}` : ""}`;
}

function instantForReferenceHour(
  day: ReturnType<typeof partsAt>,
  hour: number,
  timeZone: string,
  now: Date,
) {
  const wallTimeAsUtc = Date.UTC(day.year, day.month - 1, day.day, hour);
  const candidateOffsets = new Set([
    utcOffsetMinutes(now, timeZone),
    utcOffsetMinutes(new Date(wallTimeAsUtc - 36 * 3600_000), timeZone),
    utcOffsetMinutes(new Date(wallTimeAsUtc), timeZone),
    utcOffsetMinutes(new Date(wallTimeAsUtc + 36 * 3600_000), timeZone),
  ]);

  // A local hour can occur twice on a DST change day. Use its first occurrence.
  const matching = [...candidateOffsets]
    .map((offset) => new Date(wallTimeAsUtc - offset * 60_000))
    .filter((candidate) => {
      const value = partsAt(candidate, timeZone);
      return (
        value.year === day.year &&
        value.month === day.month &&
        value.day === day.day &&
        value.hour === hour
      );
    })
    .sort((a, b) => a.getTime() - b.getTime());

  // For a nonexistent hour during the spring DST jump, use the following instant.
  return (
    matching[0] ??
    new Date(wallTimeAsUtc - Math.min(...candidateOffsets) * 60_000)
  );
}

export function isAwake(
  hour: number,
  minute: number,
  wake: number,
  sleep: number,
) {
  const time = hour * 60 + minute;
  if (wake === sleep) return true;
  if (wake < sleep) return time >= wake * 60 && time < sleep * 60;
  return time >= wake * 60 || time < sleep * 60;
}

export function buildRows(
  cities: City[],
  wake: number,
  sleep: number,
  mode: Mode,
  now: Date,
): HourRow[] {
  if (!cities.length) return [];
  const reference = cities[0];
  const day = partsAt(now, reference.timeZone);
  const instants = Array.from({ length: 24 }, (_, hour) =>
    instantForReferenceHour(day, hour, reference.timeZone, now),
  );
  const rows = cities.map((city) => ({
    city,
    cells: instants.map((instant) => {
      const { hour, minute } = partsAt(instant, city.timeZone);
      return { hour, minute, awake: isAwake(hour, minute, wake, sleep) };
    }),
    overlap: Array(24).fill(false) as boolean[],
  }));

  if (rows.length < 2) return rows;
  if (mode === "meeting") {
    const common = Array.from({ length: 24 }, (_, hour) =>
      rows.every((row) => row.cells[hour].awake),
    );
    rows.forEach((row) => {
      row.overlap = common;
    });
  } else {
    rows.slice(1).forEach((row) => {
      row.overlap = row.cells.map(
        (cell, hour) => cell.awake && rows[0].cells[hour].awake,
      );
    });
    rows[0].overlap = rows[0].cells.map((_, hour) =>
      rows.slice(1).some((row) => row.overlap[hour]),
    );
  }
  return rows;
}

export function getRanges(mask: boolean[]): TimeRange[] {
  if (!mask.some(Boolean)) return [];
  if (mask.every(Boolean)) return [{ start: 0, end: 24 }];
  const ranges: TimeRange[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    if (!mask[hour] || mask[(hour + 23) % 24]) continue;
    let end = (hour + 1) % 24;
    while (mask[end]) end = (end + 1) % 24;
    ranges.push({ start: hour, end });
  }
  return ranges;
}

export function formatHour(hour: number, format: TimeFormat, compact = false) {
  const normalized = hour % 24;
  if (format === "24h") return `${String(normalized).padStart(2, "0")}:00`;
  const number = normalized % 12 || 12;
  return `${number}${compact ? (normalized < 12 ? "a" : "p") : normalized < 12 ? "am" : "pm"}`;
}

export function formatCellTime(
  hour: number,
  minute: number,
  format: TimeFormat,
) {
  if (!minute)
    return format === "24h"
      ? String(hour).padStart(2, "0")
      : formatHour(hour, format, true);
  const suffix = format === "12h" ? (hour < 12 ? "a" : "p") : "";
  const number =
    format === "12h" ? hour % 12 || 12 : String(hour).padStart(2, "0");
  return `${number}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function formatRange(range: TimeRange, format: TimeFormat) {
  return `${formatHour(range.start, format)} — ${formatHour(range.end, format)}`;
}

export function formatReferenceDate(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}
