/**
 * Timezone primitives built on `Intl.DateTimeFormat`.
 *
 * Everything is derived from an actual instant, so DST transitions and
 * fractional offsets (UTC+05:30, UTC+05:45) fall out of the platform's IANA
 * database instead of being hardcoded.
 */

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
};

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
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

/** Wall-clock fields of `instant` as seen in `timeZone`. */
export function getZonedParts(timeZone: string, instant: Date): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year ?? 1970,
    month: values.month ?? 1,
    day: values.day ?? 1,
    // `h23` reports midnight as 00, but guard anyway: some engines emit 24.
    hour: (values.hour ?? 0) % 24,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

/** Offset from UTC in minutes at `instant`, e.g. -420 for PDT, 345 for Kathmandu. */
export function getUtcOffsetMinutes(timeZone: string, instant: Date): number {
  const parts = getZonedParts(timeZone, instant);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const truncated = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / MINUTE_MS);
}

/**
 * The instant at which `timeZone` reads the given wall-clock time.
 *
 * Two passes: guess with the offset at the naive timestamp, then re-check with
 * the offset at the candidate. Around a DST jump the two disagree, so we keep
 * whichever candidate actually round-trips to the requested hour.
 */
export function zonedTimeToInstant(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = getUtcOffsetMinutes(timeZone, new Date(naive));
  const first = new Date(naive - firstOffset * MINUTE_MS);

  const secondOffset = getUtcOffsetMinutes(timeZone, first);
  if (secondOffset === firstOffset) return first;

  const second = new Date(naive - secondOffset * MINUTE_MS);
  return getZonedParts(timeZone, second).hour === hour ? second : first;
}

/** Days since the epoch for a calendar date — lets us compare dates across zones. */
export function toDayNumber(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function dayNumberOf(parts: ZonedParts): number {
  return toDayNumber(parts.year, parts.month, parts.day);
}

/** "UTC+5:45", "UTC−7", "UTC". Uses a real minus sign for legibility. */
export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";
  const sign = offsetMinutes > 0 ? "+" : "−";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return minutes === 0
    ? `UTC${sign}${hours}`
    : `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}
