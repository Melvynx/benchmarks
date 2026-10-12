import type { Range, TimeFormat } from '../types';

export function formatClock(hour: number, minute: number, format: TimeFormat): string {
  if (format === '24') {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const suffix = hour < 12 ? 'am' : 'pm';
  const h12 = hour % 12 || 12;
  if (minute === 0) return `${h12}${suffix}`;
  return `${h12}:${String(minute).padStart(2, '0')}${suffix}`;
}

export function clockParts(hour: number, minute: number, format: TimeFormat): { main: string; suffix: string } {
  if (format === '24') {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return { main: minute === 0 ? hh : `${hh}:${mm}`, suffix: '' };
  }
  const suffix = hour < 12 ? 'am' : 'pm';
  const h12 = hour % 12 || 12;
  const mm = String(minute).padStart(2, '0');
  return {
    main: minute === 0 ? String(h12) : `${h12}:${mm}`,
    suffix,
  };
}

export function formatRange(range: Range, format: TimeFormat): string {
  if (range.start === 0 && range.end === 0) return 'All day';
  return `${formatClock(range.start, 0, format)} \u2014 ${formatClock(range.end, 0, format)}`;
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '\u2212' : '+';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  const base = `UTC${sign}${hours}`;
  return mins === 0 ? base : `${base}:${String(mins).padStart(2, '0')}`;
}

export function formatZoneDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function hoursLabel(count: number): string {
  return count === 1 ? '1 hour' : `${count} hours`;
}

export function awakeWindowLabel(wake: number, sleep: number, format: TimeFormat): string {
  if (wake === sleep) return 'No awake hours';
  return `Awake ${formatRange({ start: wake, end: sleep }, format)}`;
}
