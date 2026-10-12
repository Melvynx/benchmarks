import type { RangeChip, TimeFormat } from '../types';

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const DAY_MINUTES = 24 * 60;

/** Offset of `timeZone` at `date`, in minutes east of UTC. DST follows `date`. */
export function offsetMinutes(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const raw = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const name = raw.replace(/[−–—]/g, '-').replace(/\s+/g, '');
  if (name === 'GMT' || name === 'UTC') return 0;
  const match = name.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) throw new Error(`Unparsed offset "${raw}" for ${timeZone}`);
  const sign = match[1] === '+' ? 1 : -1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? '0'));
}

export function zoneAbbrev(timeZone: string, date: Date): string | null {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(date);
  const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  if (!name || /^(?:GMT|UTC)/i.test(name)) return null;
  return name;
}

export function zonedParts(date: Date, timeZone: string): { hour: number; minute: number; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  let hour = Number(read('hour'));
  if (hour === 24) hour = 0;
  return { hour, minute: Number(read('minute')), weekday: read('weekday') };
}

/**
 * Local wall time in a city when the reference zone is at `refHour`:00.
 * The whole column uses the offsets at a single instant, so a DST-transition
 * day does not grow or shrink inside the grid.
 */
export function cityLocal(
  refHour: number,
  refOffset: number,
  cityOffset: number,
): { hour: number; minute: number; dayDelta: number } {
  const total = refHour * 60 + (cityOffset - refOffset);
  const dayDelta = Math.floor(total / DAY_MINUTES);
  const mod = ((total % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return { hour: Math.floor(mod / 60), minute: mod % 60, dayDelta };
}

/** Wake is inclusive, sleep is exclusive. A later wake than sleep crosses midnight. Equal hours mean nobody is awake. */
export function isAwake(hour: number, wake: number, sleep: number): boolean {
  if (wake === sleep) return false;
  if (wake < sleep) return hour >= wake && hour < sleep;
  return hour >= wake || hour < sleep;
}

export function hourRuns(flags: readonly boolean[]): Array<{ start: number; end: number }> {
  if (flags.length !== 24) throw new Error('expected 24 hours');
  const runs: Array<{ start: number; end: number }> = [];
  let index = 0;
  while (index < 24) {
    if (!flags[index]) {
      index += 1;
      continue;
    }
    const start = index;
    while (index < 24 && flags[index]) index += 1;
    runs.push({ start, end: index });
  }
  if (runs.length >= 2 && runs[0]?.start === 0 && runs[runs.length - 1]?.end === 24) {
    const head = runs[0];
    const tail = runs[runs.length - 1];
    if (!head || !tail) return runs;
    return [...runs.slice(1, -1), { start: tail.start, end: head.end }];
  }
  return runs;
}

export function rangeHours(start: number, end: number): number[] {
  const hours: number[] = [];
  if (end > start) {
    for (let hour = start; hour < end; hour += 1) hours.push(hour);
  } else {
    for (let hour = start; hour < 24; hour += 1) hours.push(hour);
    for (let hour = 0; hour < end; hour += 1) hours.push(hour);
  }
  return hours;
}

export function formatClock(hour: number, minute: number, format: TimeFormat): string {
  const h = ((hour % 24) + 24) % 24;
  const m = ((minute % 60) + 60) % 60;
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (m === 0) return `${h12}${suffix}`;
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

/** Inclusive start, exclusive end. `end === 24` is midnight. `end < start` already crossed midnight. */
export function formatRange(start: number, end: number, format: TimeFormat): string {
  const endHour = end === 24 ? 0 : end;
  return `${formatClock(start, 0, format)} — ${formatClock(endHour, 0, format)}`;
}

export function clockParts(hour: number, minute: number, format: TimeFormat): { main: string; sub: string } {
  const h = ((hour % 24) + 24) % 24;
  const m = ((minute % 60) + 60) % 60;
  if (format === '24h') {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return m === 0 ? { main: hh, sub: '' } : { main: `${hh}:${mm}`, sub: '' };
  }
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const main = m === 0 ? String(h12) : `${h12}:${String(m).padStart(2, '0')}`;
  return { main, sub: suffix };
}

export function formatOffset(minutes: number): string {
  if (minutes === 0) return 'UTC+0';
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`;
}

export function describeRuns(flags: readonly boolean[], format: TimeFormat): RangeChip[] {
  if (flags.length !== 24) throw new Error('expected 24 hours');
  if (flags.every(Boolean)) {
    return [{ key: 'all', label: 'All day', title: 'All 24 hours' }];
  }
  return hourRuns(flags).map((run) => {
    const hours = rangeHours(run.start, run.end);
    return {
      key: `${run.start}-${run.end}`,
      label: formatRange(run.start, run.end, format),
      title: hours.map((hour) => formatClock(hour, 0, format)).join(', '),
    };
  });
}

export function windowLabel(wake: number, sleep: number, format: TimeFormat): string {
  if (wake === sleep) return 'No awake hours';
  return formatRange(wake, sleep, format);
}
