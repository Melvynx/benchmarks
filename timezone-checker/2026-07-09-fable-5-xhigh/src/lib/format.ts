import type { TimeFormat } from '../types';
import type { HourRange } from './overlap';

const pad = (value: number) => String(value).padStart(2, '0');

const to12 = (hour: number) => (hour % 12 === 0 ? 12 : hour % 12);

/** Compact label for grid headers: "12a", "3p" / "0", "15". */
export function hourShort(hour: number, format: TimeFormat): string {
  if (format === '24h') return String(hour);
  return `${to12(hour)}${hour < 12 ? 'a' : 'p'}`;
}

/** Full label for ranges and settings: "9am", "12pm" / "09:00". */
export function hourLong(hour: number, format: TimeFormat): string {
  const h = ((hour % 24) + 24) % 24;
  if (format === '24h') return `${pad(h)}:00`;
  return `${to12(h)}${h < 12 ? 'am' : 'pm'}`;
}

/** Inclusive start → exclusive end: "9am — 12pm" covers hours 9, 10, 11. */
export function formatRange(range: HourRange, format: TimeFormat): string {
  if (range.end - range.start >= 24) return 'All day';
  return `${hourLong(range.start, format)} — ${hourLong(range.end, format)}`;
}

export interface CellParts {
  hour: string;
  /** Non-null for fractional offsets (":30", ":45"). */
  minute: string | null;
  /** "a" / "p" in 12h format. */
  meridiem: string | null;
}

/** Pieces of a grid-cell label, kept separate so minutes/meridiem can render small. */
export function cellParts(localMinutes: number, format: TimeFormat): CellParts {
  const hour = Math.floor(localMinutes / 60);
  const minutes = localMinutes % 60;
  const minute = minutes === 0 ? null : pad(minutes);
  if (format === '24h') return { hour: String(hour), minute, meridiem: null };
  return { hour: String(to12(hour)), minute, meridiem: hour < 12 ? 'a' : 'p' };
}

/** "6:30pm" / "18:30" — used in cell tooltips. */
export function localTimeLong(localMinutes: number, format: TimeFormat): string {
  const hour = Math.floor(localMinutes / 60);
  const minutes = localMinutes % 60;
  if (format === '24h') return `${pad(hour)}:${pad(minutes)}`;
  return `${to12(hour)}:${pad(minutes)}${hour < 12 ? 'am' : 'pm'}`;
}

/** "7am — 11pm", or "Awake 24h" for a degenerate window. */
export function awakeWindowLabel(wakeHour: number, sleepHour: number, format: TimeFormat): string {
  if (wakeHour === sleepHour) return 'Awake 24h';
  return `${hourLong(wakeHour, format)} — ${hourLong(sleepHour, format)}`;
}

export function awakeHoursCount(wakeHour: number, sleepHour: number): number {
  if (wakeHour === sleepHour) return 24;
  return (((sleepHour - wakeHour) % 24) + 24) % 24;
}
