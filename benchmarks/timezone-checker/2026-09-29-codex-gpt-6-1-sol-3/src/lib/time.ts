import type { City } from './cities';

export type Mode = 'meeting' | 'base';
export type TimeFormat = '12h' | '24h';
export interface Settings {
  wake: number;
  sleep: number;
  format: TimeFormat;
}
export interface TimeRange {
  start: number;
  end: number;
}
export interface CitySchedule {
  city: City;
  offset: number;
  minutes: number[];
  awake: boolean[];
  overlap: boolean[];
}

export const HOURS = Array.from({ length: 24 }, (_, index) => index);
export const wrapMinutes = (minutes: number) => ((minutes % 1440) + 1440) % 1440;

export function utcOffset(timezone: string, date: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  return (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '+' ? 1 : -1);
}

export function formatOffset(offset: number): string {
  if (offset === 0) return 'UTC±0';
  const absolute = Math.abs(offset);
  return `UTC${offset < 0 ? '−' : '+'}${Math.floor(absolute / 60)}${absolute % 60 ? `:${String(absolute % 60).padStart(2, '0')}` : ''}`;
}

export function isAwake(minutes: number, wake: number, sleep: number): boolean {
  if (wake === sleep) return true;
  return wake < sleep
    ? minutes >= wake * 60 && minutes < sleep * 60
    : minutes >= wake * 60 || minutes < sleep * 60;
}

export function timeParts(minutes: number, format: TimeFormat): { number: string; period: string } {
  const wrapped = wrapMinutes(minutes);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  const hourText = format === '24h' ? String(hour).padStart(2, '0') : String(hour % 12 || 12);
  return {
    number: `${hourText}${minute ? `:${String(minute).padStart(2, '0')}` : ''}`,
    period: format === '12h' ? (hour < 12 ? 'am' : 'pm') : '',
  };
}

export function formatTime(minutes: number, format: TimeFormat): string {
  const parts = timeParts(minutes, format);
  return format === '24h' && !parts.number.includes(':')
    ? `${parts.number}:00`
    : `${parts.number}${parts.period}`;
}

export function rangesFromHours(overlap: boolean[]): TimeRange[] {
  const ranges: TimeRange[] = [];
  let start: number | null = null;
  for (let hour = 0; hour <= 24; hour++) {
    if (hour < 24 && overlap[hour]) {
      if (start === null) start = hour;
    } else if (start !== null) {
      ranges.push({ start, end: hour });
      start = null;
    }
  }
  return ranges;
}

export function buildSchedules(
  cities: City[],
  settings: Settings,
  mode: Mode,
  date: Date,
): CitySchedule[] {
  if (!cities.length) return [];
  const referenceOffset = utcOffset(cities[0].timezone, date);
  const schedules = cities.map((city) => {
    const offset = utcOffset(city.timezone, date);
    const minutes = HOURS.map((hour) => wrapMinutes(hour * 60 + offset - referenceOffset));
    return {
      city,
      offset,
      minutes,
      awake: minutes.map((minute) => isAwake(minute, settings.wake, settings.sleep)),
      overlap: [] as boolean[],
    };
  });
  const meetingOverlap = HOURS.map((hour) => schedules.every((schedule) => schedule.awake[hour]));
  return schedules.map((schedule, index) => ({
    ...schedule,
    overlap:
      mode === 'meeting'
        ? meetingOverlap
        : HOURS.map((hour) =>
            index === 0
              ? schedule.awake[hour] && schedules.slice(1).some((other) => other.awake[hour])
              : schedule.awake[hour] && schedules[0].awake[hour],
          ),
  }));
}
