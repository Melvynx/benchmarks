export type TimeFormat = '12h' | '24h';

export interface Settings {
  wakeHour: number;
  sleepHour: number;
  format: TimeFormat;
}

/** A single cell of the grid: what the city's local clock reads at a given reference hour. */
export interface Slot {
  /** Local minute-of-day, 0–1439. */
  minute: number;
  awake: boolean;
}

export interface Range {
  /** Start hour in reference time (0–23). */
  start: number;
  /** Length in hours. 24 means all day. */
  hours: number;
}

const MINUTES_PER_DAY = 1440;
const HOURS_PER_DAY = 24;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const mod = (n: number, m: number) => ((n % m) + m) % m;
const pad = (n: number) => String(n).padStart(2, '0');

/** UTC offset of an IANA zone at a given instant, in minutes. Handles DST and fractional zones. */
export function getUtcOffsetMinutes(timeZone: string, at: Date): number {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatterCache.set(timeZone, fmt);
  }

  const p: Record<string, number> = {};
  for (const part of fmt.formatToParts(at)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }

  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const instantTruncated = Math.floor(at.getTime() / 1000) * 1000;
  return Math.round((wallClockAsUtc - instantTruncated) / 60_000);
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${pad(m)}` : ''}`;
}

/**
 * Awake window: awake from wakeHour (inclusive) to sleepHour (exclusive).
 * Overnight windows wrap midnight (e.g. wake 22, sleep 6).
 * wake === sleep is treated as no sleep window (always awake).
 */
export function isAwake(hour: number, { wakeHour, sleepHour }: Pick<Settings, 'wakeHour' | 'sleepHour'>): boolean {
  if (wakeHour === sleepHour) return true;
  return wakeHour < sleepHour
    ? hour >= wakeHour && hour < sleepHour
    : hour >= wakeHour || hour < sleepHour;
}

/**
 * Builds the grid. `offsets[0]` is the reference city; column `col` is the reference city's hour `col`.
 * Returns `schedule[cityIndex][col]`.
 */
export function buildSchedule(offsets: readonly number[], settings: Settings): Slot[][] {
  if (offsets.length === 0) return [];
  const refOffset = offsets[0];

  return offsets.map((offset) => {
    const diff = offset - refOffset;
    return Array.from({ length: HOURS_PER_DAY }, (_, col) => {
      const minute = mod(col * 60 + diff, MINUTES_PER_DAY);
      return { minute, awake: isAwake(Math.floor(minute / 60), settings) };
    });
  });
}

/**
 * Overlap flags per city row, same indexing as `schedule`.
 * - meeting: every city shares the same overlap (all awake).
 * - base: each non-reference city overlaps only with the reference city.
 * The reference row in base mode is always all-false.
 */
export function computeOverlaps(schedule: Slot[][], mode: 'meeting' | 'base'): boolean[][] {
  const empty = () => Array.from({ length: HOURS_PER_DAY }, () => false);
  if (schedule.length < 2) return schedule.map(empty);

  if (mode === 'meeting') {
    const shared = Array.from({ length: HOURS_PER_DAY }, (_, col) =>
      schedule.every((row) => row[col].awake),
    );
    return schedule.map(() => shared);
  }

  const ref = schedule[0];
  return schedule.map((row, i) =>
    i === 0
      ? empty()
      : Array.from({ length: HOURS_PER_DAY }, (_, col) => ref[col].awake && row[col].awake),
  );
}

/** Groups true flags into contiguous ranges, wrapping around midnight. */
export function toRanges(flags: readonly boolean[]): Range[] {
  if (flags.every(Boolean)) return [{ start: 0, hours: HOURS_PER_DAY }];

  const ranges: Range[] = [];
  for (let i = 0; i < HOURS_PER_DAY; i++) {
    const isStart = flags[i] && !flags[mod(i - 1, HOURS_PER_DAY)];
    if (!isStart) continue;
    let hours = 0;
    while (flags[mod(i + hours, HOURS_PER_DAY)]) hours++;
    ranges.push({ start: i, hours });
  }
  return ranges;
}

/** Full hour label for ranges and settings: "9am", "12pm", "09:00". */
export function formatHour(hour: number, format: TimeFormat): string {
  if (format === '24h') return `${pad(hour)}:00`;
  const period = hour < 12 ? 'am' : 'pm';
  return `${hour % 12 || 12}${period}`;
}

/** Full clock label: "9:30am", "09:30". */
export function formatClock(minute: number, format: TimeFormat): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  if (format === '24h') return `${pad(h)}:${pad(m)}`;
  const period = h < 12 ? 'am' : 'pm';
  return `${h % 12 || 12}:${pad(m)}${period}`;
}

/** Compact cell label: "9a", "5:30a", "09", "05:30". */
export function formatCell(minute: number, format: TimeFormat): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const suffix = m ? `:${pad(m)}` : '';
  if (format === '24h') return `${pad(h)}${suffix}`;
  return `${h % 12 || 12}${suffix}${h < 12 ? 'a' : 'p'}`;
}

/** Range label with end exclusive: hours 9, 10, 11 → "9am — 12pm". */
export function formatRange(range: Range, format: TimeFormat): string {
  if (range.hours >= HOURS_PER_DAY) return 'All day';
  const end = (range.start + range.hours) % HOURS_PER_DAY;
  return `${formatHour(range.start, format)} — ${formatHour(end, format)}`;
}
