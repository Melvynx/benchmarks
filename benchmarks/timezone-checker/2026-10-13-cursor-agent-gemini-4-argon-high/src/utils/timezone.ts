import type { City } from '../data/cities';

export type AppMode = 'meeting' | 'base';
export type TimeFormat = '12h' | '24h';
export type CellState = 'sleeping' | 'awake' | 'overlap';

export interface LocalTimeSlot {
  refHour: number;
  localHour: number;
  localMinute: number;
  dayDelta: number;
  isAwake: boolean;
  state: CellState;
  label: string;
  minuteLabel: string | null;
}

export interface TimeRangeBadge {
  startHour: number;
  endHour: number;
  hoursCount: number;
  label: string;
}

export interface CityOverlapSummary {
  city: City;
  totalHours: number;
  ranges: TimeRangeBadge[];
}

function extractDateParts(timeZone: string, date: Date): Record<string, number> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = parseInt(part.value, 10);
    }
  }
  return map;
}

/**
 * Returns the UTC offset in minutes for the given IANA timezone at the given Date.
 * Automatically accounts for DST and fractional offsets (e.g. +330 for UTC+5:30, +345 for UTC+5:45).
 */
export function getUtcOffsetMinutes(timeZone: string, date: Date = new Date()): number {
  const tzParts = extractDateParts(timeZone, date);
  const utcParts = extractDateParts('UTC', date);

  const tzTimestamp = Date.UTC(
    tzParts.year,
    tzParts.month - 1,
    tzParts.day,
    tzParts.hour === 24 ? 0 : tzParts.hour,
    tzParts.minute,
    tzParts.second
  );
  const utcTimestamp = Date.UTC(
    utcParts.year,
    utcParts.month - 1,
    utcParts.day,
    utcParts.hour === 24 ? 0 : utcParts.hour,
    utcParts.minute,
    utcParts.second
  );

  return Math.round((tzTimestamp - utcTimestamp) / 60000);
}

/**
 * Formats an offset in minutes into "UTC+8", "UTC-7", "UTC+5:30", "UTC+5:45", "UTC+0"
 */
export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC+0';
  const sign = offsetMinutes > 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) {
    return `UTC${sign}${hours}`;
  }
  return `UTC${sign}${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formats current wall-clock time in a given timezone for live status display.
 */
export function formatCurrentCityTime(
  timeZone: string,
  timeFormat: TimeFormat,
  date: Date = new Date()
): string {
  const parts = extractDateParts(timeZone, date);
  const hour = parts.hour === 24 ? 0 : parts.hour;
  const minute = parts.minute;
  if (timeFormat === '24h') {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  const period = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${minute.toString().padStart(2, '0')}${period}`;
}

/**
 * Computes what local hour & minute it is in target city when it is `refHour`:00 in reference city.
 */
export function getLocalTimeForRefHour(
  refHour: number,
  refOffsetMinutes: number,
  targetOffsetMinutes: number
): { hour: number; minute: number; dayDelta: number } {
  const diffMinutes = targetOffsetMinutes - refOffsetMinutes;
  const rawMinutes = refHour * 60 + diffMinutes;
  const dayDelta = Math.floor(rawMinutes / 1440);
  const totalMinutes = ((rawMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return { hour, minute, dayDelta };
}

/**
 * Determines if a given local hour (0-23) falls inside the user's [wakeHour, sleepHour) awake window.
 * Supports overnight ranges (e.g. wakeHour = 22, sleepHour = 6).
 */
export function isHourAwake(localHour: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) {
    return false;
  }
  if (wakeHour < sleepHour) {
    return localHour >= wakeHour && localHour < sleepHour;
  }
  // Overnight schedule (e.g. wake 22, sleep 6 -> awake at 22, 23, 0, 1, 2, 3, 4, 5)
  return localHour >= wakeHour || localHour < sleepHour;
}

/**
 * Formats an integer hour (0-23) for range summaries and settings selectors.
 * Examples:
 * - 12h: 0 -> "12am", 7 -> "7am", 12 -> "12pm", 23 -> "11pm"
 * - 24h: 0 -> "00:00", 7 -> "07:00", 23 -> "23:00"
 */
export function formatHourLabel(hour: number, timeFormat: TimeFormat, minute = 0): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  if (timeFormat === '24h') {
    return `${normalizedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  const period = normalizedHour >= 12 ? 'pm' : 'am';
  const h12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  if (minute === 0) {
    return `${h12}${period}`;
  }
  return `${h12}:${minute.toString().padStart(2, '0')}${period}`;
}

/**
 * Formats a cell's primary hour label and optional fractional minute label.
 */
export function formatCellHour(
  hour: number,
  minute: number,
  timeFormat: TimeFormat
): { label: string; minuteLabel: string | null } {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const minuteLabel = minute !== 0 ? `:${minute.toString().padStart(2, '0')}` : null;

  if (timeFormat === '24h') {
    return {
      label: normalizedHour.toString().padStart(2, '0'),
      minuteLabel,
    };
  }

  const period = normalizedHour >= 12 ? 'pm' : 'am';
  const h12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  return {
    label: `${h12}${period}`,
    minuteLabel,
  };
}

/**
 * Groups sorted reference hours (0-23) into contiguous inclusive-start -> exclusive-end ranges.
 * e.g. [9, 10, 11] -> [{ startHour: 9, endHour: 12, hoursCount: 3, label: "9am — 12pm" }]
 */
export function buildTimeRangeBadges(
  overlapHours: number[],
  timeFormat: TimeFormat
): TimeRangeBadge[] {
  if (overlapHours.length === 0) return [];
  const sorted = [...overlapHours].sort((a, b) => a - b);

  const segments: Array<{ start: number; endInclusive: number }> = [];
  let currentStart = sorted[0];
  let currentEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === currentEnd + 1) {
      currentEnd = sorted[i];
    } else {
      segments.push({ start: currentStart, endInclusive: currentEnd });
      currentStart = sorted[i];
      currentEnd = sorted[i];
    }
  }
  segments.push({ start: currentStart, endInclusive: currentEnd });

  return segments.map((seg) => {
    const startHour = seg.start;
    const endHour = (seg.endInclusive + 1) % 24;
    const hoursCount = seg.endInclusive - seg.start + 1;
    const startLabel = formatHourLabel(startHour, timeFormat);
    const endLabel = formatHourLabel(endHour, timeFormat);
    return {
      startHour,
      endHour,
      hoursCount,
      label: `${startLabel} — ${endLabel}`,
    };
  });
}

/**
 * Computes full grid and overlap data for the selected cities.
 */
export function computeScheduleData(
  cities: City[],
  mode: AppMode,
  wakeHour: number,
  sleepHour: number,
  timeFormat: TimeFormat,
  referenceDate: Date = new Date()
) {
  const offsetsByCityId: Record<string, number> = {};
  for (const city of cities) {
    offsetsByCityId[city.id] = getUtcOffsetMinutes(city.timeZone, referenceDate);
  }

  const refCity = cities[0];
  const refOffsetMinutes = refCity ? offsetsByCityId[refCity.id] : 0;

  // Precompute whether each city is awake at each reference hour (0..23)
  const awakeMatrix: Record<string, boolean[]> = {};
  const localTimeMatrix: Record<
    string,
    Array<{ hour: number; minute: number; dayDelta: number }>
  > = {};

  for (const city of cities) {
    const cityOffset = offsetsByCityId[city.id];
    awakeMatrix[city.id] = [];
    localTimeMatrix[city.id] = [];
    for (let refHour = 0; refHour < 24; refHour++) {
      const local = getLocalTimeForRefHour(refHour, refOffsetMinutes, cityOffset);
      localTimeMatrix[city.id][refHour] = local;
      awakeMatrix[city.id][refHour] = isHourAwake(local.hour, wakeHour, sleepHour);
    }
  }

  // Meeting mode overlap hours (reference city hours 0..23 where ALL cities are awake)
  const meetingOverlapHours: number[] = [];
  if (cities.length >= 2) {
    for (let refHour = 0; refHour < 24; refHour++) {
      const allAwake = cities.every((c) => awakeMatrix[c.id][refHour]);
      if (allAwake) {
        meetingOverlapHours.push(refHour);
      }
    }
  }

  // Base mode overlap hours per non-reference city (reference city hours 0..23 where refCity AND city are awake)
  const baseOverlapHoursByCityId: Record<string, number[]> = {};
  if (cities.length >= 2 && refCity) {
    for (let i = 1; i < cities.length; i++) {
      const targetCity = cities[i];
      const hours: number[] = [];
      for (let refHour = 0; refHour < 24; refHour++) {
        if (awakeMatrix[refCity.id][refHour] && awakeMatrix[targetCity.id][refHour]) {
          hours.push(refHour);
        }
      }
      baseOverlapHoursByCityId[targetCity.id] = hours;
    }

    // For the reference city itself in Base Mode, an hour is highlighted as overlap if the reference
    // city is awake and overlaps with at least one other city (or its base window).
    const refHours: number[] = [];
    for (let refHour = 0; refHour < 24; refHour++) {
      const hasAnyOtherAwake = cities
        .slice(1)
        .some((other) => awakeMatrix[other.id][refHour]);
      if (awakeMatrix[refCity.id][refHour] && hasAnyOtherAwake) {
        refHours.push(refHour);
      }
    }
    baseOverlapHoursByCityId[refCity.id] = refHours;
  }

  // Build rows of 24 slots per city
  const slotsByCityId: Record<string, LocalTimeSlot[]> = {};
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const slots: LocalTimeSlot[] = [];
    for (let refHour = 0; refHour < 24; refHour++) {
      const local = localTimeMatrix[city.id][refHour];
      const isAwake = awakeMatrix[city.id][refHour];
      let isOverlap = false;
      if (cities.length >= 2 && isAwake) {
        if (mode === 'meeting') {
          isOverlap = meetingOverlapHours.includes(refHour);
        } else {
          isOverlap = (baseOverlapHoursByCityId[city.id] || []).includes(refHour);
        }
      }

      const state: CellState = !isAwake ? 'sleeping' : isOverlap ? 'overlap' : 'awake';
      const { label, minuteLabel } = formatCellHour(local.hour, local.minute, timeFormat);

      slots.push({
        refHour,
        localHour: local.hour,
        localMinute: local.minute,
        dayDelta: local.dayDelta,
        isAwake,
        state,
        label,
        minuteLabel,
      });
    }
    slotsByCityId[city.id] = slots;
  }

  // Meeting summary
  const meetingRanges = buildTimeRangeBadges(meetingOverlapHours, timeFormat);

  // Base summaries (one per non-reference city)
  const baseSummaries: CityOverlapSummary[] =
    cities.length >= 2
      ? cities.slice(1).map((city) => {
          const hours = baseOverlapHoursByCityId[city.id] || [];
          return {
            city,
            totalHours: hours.length,
            ranges: buildTimeRangeBadges(hours, timeFormat),
          };
        })
      : [];

  return {
    offsetsByCityId,
    slotsByCityId,
    meetingOverlapHours,
    meetingRanges,
    baseSummaries,
  };
}
