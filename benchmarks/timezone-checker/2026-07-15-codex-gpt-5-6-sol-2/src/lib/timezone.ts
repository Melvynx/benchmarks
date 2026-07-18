import type { City } from "../data/cities";

export type TimeFormat = "12h" | "24h";
export type Mode = "meeting" | "base";

export type LocalTime = {
  hour: number;
  minute: number;
  totalMinutes: number;
};

export type HourRange = {
  start: number;
  end: number;
};

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string) {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function numericParts(date: Date, timeZone: string) {
  const values: Record<string, number> = {};
  for (const part of getPartsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return values as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

export function getOffsetMinutes(timeZone: string, instant = new Date()): number {
  const parts = numericParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return "UTC±00:00";
  const sign = minutes > 0 ? "+" : "−";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60).toString().padStart(2, "0");
  const mins = (absolute % 60).toString().padStart(2, "0");
  return `UTC${sign}${hours}:${mins}`;
}

export function buildTimeMatrix(cities: City[], now = new Date()): LocalTime[][] {
  if (cities.length === 0) return [];
  // A civil day can contain 23 or 25 physical hours at a DST boundary, while
  // this product deliberately presents 24 reference-hour columns. One shared
  // current-offset snapshot keeps that fixed visual contract deterministic.
  const referenceOffset = getOffsetMinutes(cities[0].timeZone, now);
  return cities.map((city) => {
    const offsetDelta = getOffsetMinutes(city.timeZone, now) - referenceOffset;
    return Array.from({ length: 24 }, (_, referenceHour) => {
      const totalMinutes = ((referenceHour * 60 + offsetDelta) % 1440 + 1440) % 1440;
      return {
        hour: Math.floor(totalMinutes / 60),
        minute: totalMinutes % 60,
        totalMinutes,
      };
    });
  });
}

export function isAwake(totalMinutes: number, wakeHour: number, sleepHour: number): boolean {
  const wake = wakeHour * 60;
  const sleep = sleepHour * 60;
  if (wake === sleep) return true;
  if (wake < sleep) return totalMinutes >= wake && totalMinutes < sleep;
  return totalMinutes >= wake || totalMinutes < sleep;
}

export function getMeetingOverlap(awakeMatrix: boolean[][]): boolean[] {
  if (awakeMatrix.length === 0) return Array(24).fill(false) as boolean[];
  if (awakeMatrix.length === 1) return awakeMatrix[0].slice(0, 24);
  return Array.from({ length: 24 }, (_, hour) => awakeMatrix.every((row) => row[hour]));
}

export function getBaseOverlap(awakeMatrix: boolean[][], cityIndex: number): boolean[] {
  if (!awakeMatrix[0] || !awakeMatrix[cityIndex] || cityIndex === 0) {
    return Array(24).fill(false) as boolean[];
  }
  return Array.from(
    { length: 24 },
    (_, hour) => awakeMatrix[0][hour] && awakeMatrix[cityIndex][hour],
  );
}

export function rangesFromHours(hours: boolean[]): HourRange[] {
  const active = hours.slice(0, 24);
  if (active.every(Boolean)) return [{ start: 0, end: 24 }];

  const ranges: HourRange[] = [];
  let start: number | null = null;
  for (let index = 0; index <= 24; index += 1) {
    const on = index < 24 ? Boolean(active[index]) : false;
    if (on && start === null) start = index;
    if (!on && start !== null) {
      ranges.push({ start, end: index });
      start = null;
    }
  }

  if (ranges.length > 1 && ranges[0].start === 0 && ranges.at(-1)?.end === 24) {
    const first = ranges.shift()!;
    const last = ranges.pop()!;
    ranges.unshift({ start: last.start, end: first.end + 24 });
  }
  return ranges;
}

export function countHours(hours: boolean[]): number {
  return hours.slice(0, 24).filter(Boolean).length;
}

export function formatHour(hour: number, format: TimeFormat, compact = false): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (format === "24h") return `${normalized.toString().padStart(2, "0")}${compact ? "" : ":00"}`;
  const suffix = normalized < 12 ? (compact ? "a" : "am") : compact ? "p" : "pm";
  const display = normalized % 12 || 12;
  return `${display}${suffix}`;
}

export function formatLocalTime(time: LocalTime, format: TimeFormat, compact = true): string {
  if (time.minute === 0) return formatHour(time.hour, format, compact);
  if (format === "24h") {
    return `${time.hour.toString().padStart(2, "0")}:${time.minute.toString().padStart(2, "0")}`;
  }
  const suffix = time.hour < 12 ? (compact ? "a" : "am") : compact ? "p" : "pm";
  const display = time.hour % 12 || 12;
  return `${display}:${time.minute.toString().padStart(2, "0")}${suffix}`;
}

export function formatRange(range: HourRange, format: TimeFormat): string {
  if (range.end - range.start >= 24) return "All day";
  return `${formatHour(range.start, format)} → ${formatHour(range.end, format)}`;
}

export function referenceDateLabel(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);
}
