export type TimeFormat = '12h' | '24h';
export type Mode = 'meeting' | 'base';
export interface Settings { wake: number; sleep: number; format: TimeFormat }
export interface TimeRange { start: number; end: number }

export const DAY = 1440;
export const HOURS = Array.from({ length: 24 }, (_, index) => index);
export const wrap = (minutes: number) => ((minutes % DAY) + DAY) % DAY;

/** IANA timezone data supplies the offset for the actual date, including DST. */
export function utcOffset(timezone: string, date: Date): number {
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, timeZoneName: 'longOffset',
  }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = offset.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

export function offsetLabel(offset: number): string {
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `UTC${offset < 0 ? '−' : '+'}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

export function isAwake(minutes: number, settings: Settings): boolean {
  const local = wrap(minutes);
  const start = settings.wake * 60;
  const end = settings.sleep * 60;
  if (start === end) return true;
  return start < end ? local >= start && local < end : local >= start || local < end;
}

/** Minute precision preserves half-hour and quarter-hour overlap boundaries. */
export function overlapRanges(offsets: number[], referenceOffset: number, settings: Settings): TimeRange[] {
  if (offsets.length < 2) return [];
  const ranges: TimeRange[] = [];
  let start: number | null = null;
  for (let minute = 0; minute <= DAY; minute++) {
    const overlap = minute < DAY && offsets.every(offset => isAwake(minute + offset - referenceOffset, settings));
    if (overlap && start === null) start = minute;
    if (!overlap && start !== null) {
      ranges.push({ start, end: minute });
      start = null;
    }
  }
  return ranges;
}

export function inRanges(minute: number, ranges: TimeRange[]): boolean {
  return ranges.some(range => minute >= range.start && minute < range.end);
}

export function formatTime(minutes: number, format: TimeFormat, compact = false): string {
  const normalized = wrap(minutes);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  if (format === '24h') return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  const suffix = hours < 12 ? 'am' : 'pm';
  return `${hours % 12 || 12}${mins ? `:${String(mins).padStart(2, '0')}` : ''}${compact ? '' : suffix}`;
}

export function duration(ranges: TimeRange[]): string {
  const total = ranges.reduce((sum, range) => sum + range.end - range.start, 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours ? `${hours}h` : ''}${hours && minutes ? ' ' : ''}${minutes ? `${minutes}m` : ''}${!total ? '0h' : ''}`;
}

export function localMinutes(timezone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Number(parts.find(part => part.type === 'hour')?.value) * 60 + Number(parts.find(part => part.type === 'minute')?.value);
}
