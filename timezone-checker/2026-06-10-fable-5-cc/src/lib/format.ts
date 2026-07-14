import type { TimeFormat } from './appState';

/** Inclusive start, exclusive end. `end` may exceed 24 when a range wraps past midnight. */
export interface HourRange {
  start: number;
  end: number;
}

/** Collapses a sorted-or-not set of hours into contiguous ranges, merging across midnight. */
export function hoursToRanges(hours: number[]): HourRange[] {
  if (hours.length === 0) return [];
  const sorted = [...new Set(hours)].sort((a, b) => a - b);
  if (sorted.length === 24) return [{ start: 0, end: 24 }];

  const ranges: HourRange[] = [];
  for (const hour of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && last.end === hour) last.end = hour + 1;
    else ranges.push({ start: hour, end: hour + 1 });
  }

  // A range ending at 24 and another starting at 0 are one window across midnight.
  if (ranges.length > 1 && ranges[0].start === 0 && ranges[ranges.length - 1].end === 24) {
    ranges[ranges.length - 1].end = 24 + ranges[0].end;
    ranges.shift();
  }
  return ranges;
}

export function formatHour(hour: number, format: TimeFormat): string {
  const h = ((hour % 24) + 24) % 24;
  if (format === '24h') return `${String(h).padStart(2, '0')}:00`;
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}${h < 12 ? 'am' : 'pm'}`;
}

export function formatRange(range: HourRange, format: TimeFormat): string {
  if (range.start === 0 && range.end === 24) return 'All day';
  return `${formatHour(range.start, format)} — ${formatHour(range.end, format)}`;
}

/** Compact labels for grid axes: "12a" / "3p" or "00" / "15". */
export function formatHourShort(hour: number, format: TimeFormat): string {
  const h = ((hour % 24) + 24) % 24;
  if (format === '24h') return String(h).padStart(2, '0');
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}${h < 12 ? 'a' : 'p'}`;
}

export interface CellLabel {
  time: string;
  meridiem: string | null;
}

/** Label for one grid cell, e.g. {time: "9", meridiem: "a"} or {time: "21:45", meridiem: null}. */
export function formatCellLabel(localMinutes: number, format: TimeFormat): CellLabel {
  const h = Math.floor(localMinutes / 60);
  const m = localMinutes % 60;
  if (format === '24h') {
    const hh = String(h).padStart(2, '0');
    return { time: m === 0 ? hh : `${hh}:${String(m).padStart(2, '0')}`, meridiem: null };
  }
  const base = h % 12 === 0 ? 12 : h % 12;
  return {
    time: m === 0 ? String(base) : `${base}:${String(m).padStart(2, '0')}`,
    meridiem: h < 12 ? 'a' : 'p',
  };
}

/** Live wall clock for a timezone, e.g. "2:34pm" or "14:34". */
export function formatClock(date: Date, timeZone: string, format: TimeFormat): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
  })
    .format(date)
    .toLowerCase()
    .replace(' ', '');
}
