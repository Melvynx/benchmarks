import type { TimeFormat } from './types';

export interface Range {
  start: number;
  end: number;
}

export function formatHour(h: number, fmt: TimeFormat): string {
  const hour = ((h % 24) + 24) % 24;
  if (fmt === '24h') {
    return `${String(hour).padStart(2, '0')}:00`;
  }
  const period = hour < 12 ? 'am' : 'pm';
  let display = hour % 12;
  if (display === 0) display = 12;
  return `${display}${period}`;
}

export function formatCellTime(minutes: number, fmt: TimeFormat): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  if (fmt === '24h') {
    const hh = String(h24).padStart(2, '0');
    return m ? `${hh}:${String(m).padStart(2, '0')}` : hh;
  }
  const period = h24 < 12 ? 'a' : 'p';
  let display = h24 % 12;
  if (display === 0) display = 12;
  return m ? `${display}:${String(m).padStart(2, '0')}${period}` : `${display}${period}`;
}

export function formatRange(range: Range, fmt: TimeFormat): string {
  return `${formatHour(range.start, fmt)} — ${formatHour(range.end, fmt)}`;
}

export function hoursToRanges(hours: number[]): Range[] {
  if (hours.length === 0) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: Range[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      ranges.push({ start, end: prev + 1 });
      start = cur;
      prev = cur;
    }
  }
  ranges.push({ start, end: prev + 1 });
  return ranges;
}

export function formatRanges(hours: number[], fmt: TimeFormat): string[] {
  return hoursToRanges(hours).map((r) => formatRange(r, fmt));
}

export function awakeDurationHours(wake: number, sleep: number): number {
  if (wake === sleep) return 24;
  if (wake < sleep) return sleep - wake;
  return 24 - wake + sleep;
}
