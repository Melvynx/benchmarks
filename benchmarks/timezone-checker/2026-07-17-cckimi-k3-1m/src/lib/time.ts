/**
 * Timezone math built on Intl.DateTimeFormat.
 *
 * UTC offsets are always derived from a concrete instant (the current date),
 * so daylight-saving transitions are handled automatically — including
 * fractional offsets such as India (UTC+5:30) and Nepal (UTC+5:45).
 */

export const HOURS: number[] = Array.from({ length: 24 }, (_, h) => h);

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(tz, fmt);
  }
  return fmt;
}

/** Calendar/clock parts of an instant as observed in `tz`. */
export function getZonedParts(tz: string, utcTs: number): ZonedParts {
  const parts = getFormatter(tz).formatToParts(new Date(utcTs));
  const out: ZonedParts = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const p of parts) {
    if (p.type === 'year') out.year = Number(p.value);
    else if (p.type === 'month') out.month = Number(p.value);
    else if (p.type === 'day') out.day = Number(p.value);
    else if (p.type === 'hour') out.hour = Number(p.value);
    else if (p.type === 'minute') out.minute = Number(p.value);
    else if (p.type === 'second') out.second = Number(p.value);
  }
  return out;
}

/** Offset of `tz` from UTC in minutes at the given instant (DST-aware). */
export function getOffsetMinutes(tz: string, utcTs: number): number {
  const p = getZonedParts(tz, utcTs);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - utcTs) / 60000);
}

/**
 * UTC timestamp of `hour`:00 on the given local date in `tz`.
 * Two-pass offset lookup keeps it correct across DST transitions.
 */
export function localHourToUtc(tz: string, year: number, month: number, day: number, hour: number): number {
  const guess = Date.UTC(year, month - 1, day, hour);
  const off1 = getOffsetMinutes(tz, guess);
  const utc = guess - off1 * 60000;
  const off2 = getOffsetMinutes(tz, utc);
  return off2 === off1 ? utc : guess - off2 * 60000;
}

/**
 * Whether `localTime` (fractional hours, e.g. 21.75 for 21:45) falls inside
 * the awake window [wake, sleep). Supports overnight windows (wake 22 →
 * sleep 6) and wake === sleep meaning "awake around the clock".
 */
export function isAwake(localTime: number, wake: number, sleep: number): boolean {
  if (wake === sleep) return true;
  if (wake < sleep) return localTime >= wake && localTime < sleep;
  return localTime >= wake || localTime < sleep;
}

/** A contiguous run of columns. `end` is exclusive. */
export interface TimeRange {
  start: number;
  end: number;
}

/** Collapse a 24-slot boolean array into contiguous ranges (end exclusive). */
export function toRanges(flags: boolean[]): TimeRange[] {
  const ranges: TimeRange[] = [];
  let start = -1;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] && start === -1) start = i;
    else if (!flags[i] && start !== -1) {
      ranges.push({ start, end: i });
      start = -1;
    }
  }
  if (start !== -1) ranges.push({ start, end: flags.length });
  return ranges;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const to12 = (hour: number) => ((hour % 24) + 11) % 12 + 1;

/** Compact column-header label: `9a` / `2p`, or `9` / `14` in 24h. */
export function formatHourCompact(hour: number, hour12: boolean): string {
  if (!hour12) return String(hour);
  return `${to12(hour)}${hour % 24 < 12 ? 'a' : 'p'}`;
}

/** Grid cell label: `9am` / `2pm` (or compact `9a` / `2p`), or `9` / `14`. */
export function formatCellHour(hour: number, hour12: boolean, compact = false): string {
  if (!hour12) return String(hour);
  const suffix = hour % 24 < 12 ? (compact ? 'a' : 'am') : compact ? 'p' : 'pm';
  return `${to12(hour)}${suffix}`;
}

/** Full hour label for selects/tooltips: `7 am`, or `07:00` in 24h. */
export function formatHourLabel(hour: number, hour12: boolean): string {
  if (!hour12) return `${String(hour).padStart(2, '0')}:00`;
  return `${to12(hour)} ${hour % 24 < 12 ? 'am' : 'pm'}`;
}

/** Range badge: `9am – 12pm` (end exclusive), or `09:00 – 24:00` in 24h. */
export function formatRange(range: TimeRange, hour12: boolean): string {
  const fmt = (hour: number): string => {
    if (!hour12) return `${String(hour).padStart(2, '0')}:00`;
    const hh = hour % 24;
    return `${to12(hh)}${hh < 12 ? 'am' : 'pm'}`;
  };
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

/** Clock with minutes: `4:32 pm`, or `16:32` in 24h. */
export function formatClock(parts: { hour: number; minute: number }, hour12: boolean): string {
  const mm = String(parts.minute).padStart(2, '0');
  if (!hour12) return `${String(parts.hour).padStart(2, '0')}:${mm}`;
  return `${to12(parts.hour)}:${mm} ${parts.hour % 24 < 12 ? 'am' : 'pm'}`;
}

export function formatLocalTime(hour: number, minute: number, hour12: boolean): string {
  return formatClock({ hour, minute }, hour12);
}

/** `UTC+2`, `UTC−7`, `UTC+5:45` (uses the true minus sign U+2212). */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}
