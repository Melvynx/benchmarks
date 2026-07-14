import type { City, HourRange, LocalTime, TimeFormat } from '../types';

const MINUTES_PER_DAY = 24 * 60;
const HOUR_COUNT = 24;

function normalizeMinuteOfDay(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const offsetName = formatter
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;

  if (!offsetName || offsetName === 'GMT' || offsetName === 'UTC') {
    return 0;
  }

  const match = offsetName.match(/(?:GMT|UTC)([+-])(\d{2}):(\d{2})/);
  if (!match) {
    throw new Error(`Unable to read UTC offset for ${timeZone}`);
  }

  const [, sign, hourText, minuteText] = match;
  const offset = Number(hourText) * 60 + Number(minuteText);
  return sign === '-' ? -offset : offset;
}

export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC';

  const sign = offsetMinutes > 0 ? '+' : '−';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  const minuteSuffix = minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : '';
  return `UTC${sign}${hours}${minuteSuffix}`;
}

export function getLocalTime(
  referenceHour: number,
  referenceOffsetMinutes: number,
  cityOffsetMinutes: number,
): LocalTime {
  const minuteOfDay = normalizeMinuteOfDay(
    referenceHour * 60 + cityOffsetMinutes - referenceOffsetMinutes,
  );

  return {
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
    minuteOfDay,
  };
}

export function isAwake(
  minuteOfDay: number,
  wakeHour: number,
  sleepHour: number,
): boolean {
  if (wakeHour === sleepHour) return true;

  const wakeMinute = wakeHour * 60;
  const sleepMinute = sleepHour * 60;
  if (wakeMinute < sleepMinute) {
    return minuteOfDay >= wakeMinute && minuteOfDay < sleepMinute;
  }

  return minuteOfDay >= wakeMinute || minuteOfDay < sleepMinute;
}

export function getCityAwakeMask(
  city: City,
  referenceCity: City,
  wakeHour: number,
  sleepHour: number,
  date: Date,
): boolean[] {
  const referenceOffset = getUtcOffsetMinutes(date, referenceCity.timeZone);
  const cityOffset = getUtcOffsetMinutes(date, city.timeZone);

  return Array.from({ length: HOUR_COUNT }, (_, referenceHour) => {
    const localTime = getLocalTime(referenceHour, referenceOffset, cityOffset);
    return isAwake(localTime.minuteOfDay, wakeHour, sleepHour);
  });
}

export function getMeetingOverlapMask(
  cities: City[],
  wakeHour: number,
  sleepHour: number,
  date: Date,
): boolean[] {
  const referenceCity = cities[0];
  if (!referenceCity || cities.length < 2) {
    return Array.from({ length: HOUR_COUNT }, () => false);
  }

  const awakeMasks = cities.map((city) =>
    getCityAwakeMask(city, referenceCity, wakeHour, sleepHour, date),
  );

  return Array.from({ length: HOUR_COUNT }, (_, hour) =>
    awakeMasks.every((mask) => mask[hour] === true),
  );
}

export function getBaseOverlapMask(
  referenceCity: City,
  city: City,
  wakeHour: number,
  sleepHour: number,
  date: Date,
): boolean[] {
  const referenceMask = getCityAwakeMask(
    referenceCity,
    referenceCity,
    wakeHour,
    sleepHour,
    date,
  );
  const cityMask = getCityAwakeMask(city, referenceCity, wakeHour, sleepHour, date);
  return referenceMask.map((isReferenceAwake, hour) =>
    Boolean(isReferenceAwake && cityMask[hour]),
  );
}

export function getHourRanges(mask: boolean[]): HourRange[] {
  const ranges: HourRange[] = [];
  let start: number | null = null;

  for (let hour = 0; hour <= HOUR_COUNT; hour += 1) {
    const isIncluded = hour < HOUR_COUNT && mask[hour] === true;
    if (isIncluded && start === null) start = hour;

    if (!isIncluded && start !== null) {
      ranges.push({ start, end: hour });
      start = null;
    }
  }

  return ranges;
}

export function countHours(mask: boolean[]): number {
  return mask.filter(Boolean).length;
}

export function formatHour(hour: number, format: TimeFormat): string {
  const normalizedHour = ((hour % HOUR_COUNT) + HOUR_COUNT) % HOUR_COUNT;
  if (format === '24h') return `${String(normalizedHour).padStart(2, '0')}:00`;

  const displayHour = normalizedHour % 12 || 12;
  const period = normalizedHour < 12 ? 'am' : 'pm';
  return `${displayHour}${period}`;
}

export function formatLocalTime(localTime: LocalTime, format: TimeFormat): string {
  const minuteSuffix = `:${String(localTime.minute).padStart(2, '0')}`;
  if (format === '24h') {
    return `${String(localTime.hour).padStart(2, '0')}${minuteSuffix}`;
  }

  const displayHour = localTime.hour % 12 || 12;
  const period = localTime.hour < 12 ? 'a' : 'p';
  return `${displayHour}${localTime.minute > 0 ? minuteSuffix : ''}${period}`;
}

export function formatDateForReference(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
