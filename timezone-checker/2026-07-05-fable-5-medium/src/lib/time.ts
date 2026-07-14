export type TimeFormat = '12h' | '24h';

/**
 * Current UTC offset in minutes for an IANA timezone. Derived from the
 * current date, so DST is handled automatically. Supports fractional
 * offsets (e.g. +5:30 India, +5:45 Nepal).
 */
export function getUtcOffsetMinutes(timeZone: string, date: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  });
  const offsetPart = dtf.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  // "GMT", "GMT+5:30", "GMT-07:00"
  const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3] ?? '0', 10));
}

/** "UTC+5:30", "UTC-8", "UTC+0" */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Local minutes-of-day in a city when it is `refHour`:00 in the reference
 * timezone. Result is in [0, 1440).
 */
export function localMinutesAt(refHour: number, refOffsetMin: number, cityOffsetMin: number): number {
  return mod(refHour * 60 + (cityOffsetMin - refOffsetMin), 24 * 60);
}

/**
 * Whether a local minutes-of-day falls inside the awake window
 * [wakeHour:00, sleepHour:00). Overnight windows (wake > sleep) wrap
 * around midnight. wake === sleep is treated as always awake.
 */
export function isAwake(minutesOfDay: number, wakeHour: number, sleepHour: number): boolean {
  const wake = wakeHour * 60;
  const sleep = sleepHour * 60;
  if (wake === sleep) return true;
  if (wake < sleep) return minutesOfDay >= wake && minutesOfDay < sleep;
  return minutesOfDay >= wake || minutesOfDay < sleep;
}

/** "9am", "12:30pm" or "09:00", "12:30" depending on format. */
export function formatMinutes(minutesOfDay: number, format: TimeFormat): string {
  const h = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

/** Compact cell label for a whole or fractional local time. */
export function formatCellLabel(minutesOfDay: number, format: TimeFormat): string {
  const h = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  if (format === '24h') {
    return m === 0 ? String(h) : `${h}:${String(m).padStart(2, '0')}`;
  }
  const suffix = h < 12 ? 'a' : 'p';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

export function formatHour(hour: number, format: TimeFormat): string {
  return formatMinutes(mod(hour, 24) * 60, format);
}

export interface HourRange {
  start: number; // inclusive hour in reference timezone
  end: number; // exclusive hour (may be 24, or wrap past 24 for overnight runs)
}

/**
 * Group a set of reference hours (0–23) into contiguous ranges,
 * inclusive start → exclusive end. A run that wraps midnight
 * (…22, 23, 0, 1…) is merged into a single range ending past 24.
 */
export function toRanges(hours: number[]): HourRange[] {
  if (hours.length === 0) return [];
  const set = new Set(hours);
  if (set.size === 24) return [{ start: 0, end: 24 }];

  const ranges: HourRange[] = [];
  const sorted = [...set].sort((a, b) => a - b);
  let start = sorted[0];
  let prev = sorted[0];
  for (const h of sorted.slice(1)) {
    if (h !== prev + 1) {
      ranges.push({ start, end: prev + 1 });
      start = h;
    }
    prev = h;
  }
  ranges.push({ start, end: prev + 1 });

  // Merge a midnight wrap: last range ends at 24 and first starts at 0.
  if (ranges.length > 1 && ranges[0].start === 0 && ranges[ranges.length - 1].end === 24) {
    const last = ranges.pop()!;
    ranges[0] = { start: last.start, end: ranges[0].end + 24 };
  }
  return ranges;
}

export function formatRange(range: HourRange, format: TimeFormat): string {
  return `${formatHour(range.start, format)} — ${formatHour(range.end, format)}`;
}
