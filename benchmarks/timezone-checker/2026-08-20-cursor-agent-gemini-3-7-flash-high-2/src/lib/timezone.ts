import { TimeFormat, OverlapRange } from '../types';

/**
 * Returns the UTC offset in minutes for a given IANA timezone at a specific Date.
 */
export function getTimezoneOffsetMinutes(timezone: string, date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    let year = 0;
    let month = 0;
    let day = 0;
    let hour = 0;
    let minute = 0;
    let second = 0;

    for (const part of parts) {
      if (part.type === 'year') year = parseInt(part.value, 10);
      if (part.type === 'month') month = parseInt(part.value, 10);
      if (part.type === 'day') day = parseInt(part.value, 10);
      if (part.type === 'hour') hour = parseInt(part.value, 10) % 24;
      if (part.type === 'minute') minute = parseInt(part.value, 10);
      if (part.type === 'second') second = parseInt(part.value, 10);
    }

    const localUtcTime = Date.UTC(year, month - 1, day, hour, minute, second);
    const offsetMs = localUtcTime - date.getTime();
    return Math.round(offsetMs / 60000);
  } catch (err) {
    console.error(`Invalid timezone: ${timezone}`, err);
    return 0;
  }
}

/**
 * Formats a timezone offset in minutes into UTC+X or UTC-X:YY string.
 */
export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC+0';
  const sign = offsetMinutes > 0 ? '+' : '-';
  const absMin = Math.abs(offsetMinutes);
  const hours = Math.floor(absMin / 60);
  const minutes = absMin % 60;

  if (minutes === 0) {
    return `UTC${sign}${hours}`;
  }
  return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Returns the current UTC offset info for a given city's timezone.
 */
export function getCityCurrentUtcOffset(timezone: string, date: Date = new Date()): {
  offsetMinutes: number;
  formatted: string;
} {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, date);
  return {
    offsetMinutes,
    formatted: formatUtcOffset(offsetMinutes),
  };
}

/**
 * Returns formatted current local time in city.
 */
export function getCurrentLocalTime(
  timezone: string,
  timeFormat: TimeFormat = '12h',
  date: Date = new Date()
): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    }).format(date);
  } catch {
    return '--:--';
  }
}

/**
 * Checks if a given local hour (0-23) falls inside the awake window.
 */
export function isHourAwake(localHour: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) return true; // full 24h awake
  if (wakeHour < sleepHour) {
    // Normal schedule, e.g. 7 to 23 (awake from 7:00 to 22:59)
    return localHour >= wakeHour && localHour < sleepHour;
  }
  // Overnight schedule, e.g. 22 to 6 (awake from 22:00 to 5:59)
  return localHour >= wakeHour || localHour < sleepHour;
}

/**
 * Computes the local time and day difference in targetTimezone when refTimezone is at refHour (0-23) on today's date.
 */
export function calculateLocalTimeForRefHour(
  refTimezone: string,
  targetTimezone: string,
  refHour: number,
  baseDate: Date = new Date()
): {
  localHour: number;
  localMinute: number;
  dayOffset: number; // -1, 0, +1
  exactDate: Date;
} {
  try {
    // Get year/month/day in refTimezone
    const refDateParts = new Intl.DateTimeFormat('en-US', {
      timeZone: refTimezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour12: false,
    }).formatToParts(baseDate);

    let refYear = baseDate.getUTCFullYear();
    let refMonth = baseDate.getUTCMonth() + 1;
    let refDay = baseDate.getUTCDate();

    for (const part of refDateParts) {
      if (part.type === 'year') refYear = parseInt(part.value, 10);
      if (part.type === 'month') refMonth = parseInt(part.value, 10);
      if (part.type === 'day') refDay = parseInt(part.value, 10);
    }

    // Reference target instant:
    const tentativeDate = new Date(Date.UTC(refYear, refMonth - 1, refDay, refHour, 0, 0));
    const refOffset = getTimezoneOffsetMinutes(refTimezone, tentativeDate);
    const targetUtcTimestamp = tentativeDate.getTime() - refOffset * 60000;
    const targetInstant = new Date(targetUtcTimestamp);

    // Format targetInstant in targetTimezone
    const targetParts = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(targetInstant);

    let tgtYear = refYear;
    let tgtMonth = refMonth;
    let tgtDay = refDay;
    let tgtHour = refHour;
    let tgtMinute = 0;

    for (const part of targetParts) {
      if (part.type === 'year') tgtYear = parseInt(part.value, 10);
      if (part.type === 'month') tgtMonth = parseInt(part.value, 10);
      if (part.type === 'day') tgtDay = parseInt(part.value, 10);
      if (part.type === 'hour') tgtHour = parseInt(part.value, 10) % 24;
      if (part.type === 'minute') tgtMinute = parseInt(part.value, 10);
    }

    // Day offset calculation
    const refDayTimestamp = Date.UTC(refYear, refMonth - 1, refDay);
    const tgtDayTimestamp = Date.UTC(tgtYear, tgtMonth - 1, tgtDay);
    const dayDiff = Math.round((tgtDayTimestamp - refDayTimestamp) / (24 * 3600 * 1000));

    return {
      localHour: tgtHour,
      localMinute: tgtMinute,
      dayOffset: dayDiff,
      exactDate: targetInstant,
    };
  } catch (err) {
    console.error('Error calculating local time for ref hour:', err);
    return {
      localHour: refHour,
      localMinute: 0,
      dayOffset: 0,
      exactDate: baseDate,
    };
  }
}

/**
 * Formats an hour for display in grid cells (short compact format).
 */
export function formatCellHour(
  hour: number,
  minute: number,
  timeFormat: TimeFormat = '12h'
): { short: string; full: string; period?: string } {
  const normHour = ((hour % 24) + 24) % 24;
  const minuteStr = minute > 0 ? `:${minute.toString().padStart(2, '0')}` : '';

  if (timeFormat === '24h') {
    const hh = normHour.toString().padStart(2, '0');
    return {
      short: `${hh}${minute > 0 ? minuteStr : ''}`,
      full: `${hh}:${minute.toString().padStart(2, '0')}`,
    };
  }

  // 12-hour format
  const period = normHour < 12 ? 'am' : 'pm';
  const displayHour = normHour === 0 ? 12 : normHour > 12 ? normHour - 12 : normHour;

  return {
    short: `${displayHour}${minuteStr}${period}`,
    full: `${displayHour}:${minute.toString().padStart(2, '0')} ${period.toUpperCase()}`,
    period,
  };
}

/**
 * Formats a boundary hour for range summaries (inclusive start or exclusive end).
 * Hour can be 0 through 24.
 */
export function formatRangeHour(hour: number, timeFormat: TimeFormat = '12h'): string {
  const norm = hour % 24;
  if (timeFormat === '24h') {
    if (hour === 24) return '24:00';
    return `${norm.toString().padStart(2, '0')}:00`;
  }

  // 12h format
  if (hour === 0 || hour === 24) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

/**
 * Formats a single contiguous start-end window (inclusive start, exclusive end).
 * E.g., start=9, end=12 -> "9am — 12pm" or "09:00 — 12:00".
 */
export function formatTimeRange(startHour: number, endHour: number, timeFormat: TimeFormat = '12h'): string {
  const startStr = formatRangeHour(startHour, timeFormat);
  const endStr = formatRangeHour(endHour, timeFormat);
  return `${startStr} — ${endStr}`;
}

/**
 * Groups an array of column hours (0..23) into contiguous OverlapRanges.
 */
export function getOverlapRanges(hours: number[], timeFormat: TimeFormat = '12h'): OverlapRange[] {
  if (!hours || hours.length === 0) return [];

  // Sort unique hours
  const sorted = Array.from(new Set(hours)).sort((a, b) => a - b);
  const ranges: OverlapRange[] = [];

  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      const end = prev + 1;
      ranges.push({
        startHour: start,
        endHour: end,
        hoursCount: end - start,
        formatted: formatTimeRange(start, end, timeFormat),
      });
      start = current;
      prev = current;
    }
  }

  // Final range
  const end = prev + 1;
  ranges.push({
    startHour: start,
    endHour: end,
    hoursCount: end - start,
    formatted: formatTimeRange(start, end, timeFormat),
  });

  return ranges;
}
