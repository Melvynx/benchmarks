import {
  AppMode,
  AvailabilitySettings,
  CellState,
  City,
  CityOverlapSummary,
  HourCellInfo,
  TimeFormat,
  TimeRange,
} from '../types';

/**
 * Returns the current UTC offset in minutes for an IANA timezone at a given Date.
 * Positive for east of UTC (e.g., +330 for UTC+5:30), negative for west of UTC (e.g., -420 for UTC-7).
 */
export function getUtcOffsetMinutes(timezone: string, date: Date = new Date()): number {
  // Format parts in UTC and in target timezone for the exact same instant
  const getParts = (tz: string) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
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
    return Date.UTC(
      map.year,
      (map.month || 1) - 1,
      map.day || 1,
      map.hour || 0,
      map.minute || 0,
      map.second || 0
    );
  };

  const tzTimestamp = getParts(timezone);
  const utcTimestamp = getParts('UTC');
  return Math.round((tzTimestamp - utcTimestamp) / 60000);
}

/**
 * Formats an offset in minutes into "UTC+8", "UTC-7", "UTC+5:30", "UTC+5:45", or "UTC+0".
 */
export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC±0';
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
 * Formats relative difference between target city and reference city (e.g. "+15h", "-3.5h", "Ref").
 */
export function formatRelativeDiff(targetOffsetMins: number, refOffsetMins: number): string {
  const diffMins = targetOffsetMins - refOffsetMins;
  if (diffMins === 0) return 'Same time';
  const sign = diffMins > 0 ? '+' : '-';
  const abs = Math.abs(diffMins);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${mins}m`;
}

/**
 * Formats current live clock in the given timezone.
 */
export function formatLiveClock(
  timezone: string,
  timeFormat: TimeFormat,
  date: Date = new Date()
): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(date);
}

/**
 * Checks whether a local hour (can be fractional like 9.5 for 9:30, or integer 0..23)
 * falls inside the user's configured awake window [wakeHour, sleepHour).
 *
 * Rules:
 * - Standard daytime window (wakeHour < sleepHour, e.g. 7 to 23):
 *   awake when localHourFloat >= wakeHour && localHourFloat < sleepHour
 * - Overnight window (wakeHour > sleepHour, e.g. 22 to 6):
 *   awake when localHourFloat >= wakeHour || localHourFloat < sleepHour
 * - Equal hours (wakeHour === sleepHour):
 *   24h awake
 */
export function isLocalTimeAwake(
  localHour: number,
  localMinute: number,
  wakeHour: number,
  sleepHour: number
): boolean {
  if (wakeHour === sleepHour) return true;
  const timeInMinutes = localHour * 60 + localMinute;
  const wakeInMinutes = wakeHour * 60;
  const sleepInMinutes = sleepHour * 60;

  if (wakeInMinutes < sleepInMinutes) {
    return timeInMinutes >= wakeInMinutes && timeInMinutes < sleepInMinutes;
  } else {
    // Overnight schedule (e.g. wake at 22:00, sleep at 06:00)
    return timeInMinutes >= wakeInMinutes || timeInMinutes < sleepInMinutes;
  }
}

/**
 * Formats an hour (and optional minutes) according to 12h or 24h preference.
 * Used for headers, settings, and range summaries.
 */
export function formatHourLabel(
  hour: number,
  minute: number = 0,
  timeFormat: TimeFormat = '12h'
): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const minPart = minute > 0 ? `:${minute.toString().padStart(2, '0')}` : '';

  if (timeFormat === '24h') {
    const hStr = normalizedHour.toString().padStart(2, '0');
    return minute > 0 ? `${hStr}${minPart}` : `${hStr}:00`;
  }

  const suffix = normalizedHour >= 12 ? 'pm' : 'am';
  const h12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  return `${h12}${minPart}${suffix}`;
}

/**
 * Compact label for inside a 24-column cell so fractional & 12h/24h labels stay crisp and aligned.
 */
export function formatCellCompactLabel(
  hour: number,
  minute: number = 0,
  timeFormat: TimeFormat = '12h'
): { primary: string; sub?: string } {
  const normalizedHour = ((hour % 24) + 24) % 24;

  if (timeFormat === '24h') {
    const hStr = normalizedHour.toString().padStart(2, '0');
    if (minute > 0) {
      return { primary: hStr, sub: `:${minute.toString().padStart(2, '0')}` };
    }
    return { primary: hStr };
  }

  const suffix = normalizedHour >= 12 ? 'p' : 'a';
  const suffixFull = normalizedHour >= 12 ? 'pm' : 'am';
  const h12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;

  if (minute > 0) {
    return {
      primary: `${h12}:${minute.toString().padStart(2, '0')}`,
      sub: suffix,
    };
  }
  return {
    primary: `${h12}`,
    sub: suffixFull,
  };
}

/**
 * Given a reference city, a target city, and a reference hour (0..23),
 * computes the local time in the target city and whether it is awake.
 */
export function computeTargetLocalForRefHour(
  refHour: number,
  refOffsetMinutes: number,
  targetOffsetMinutes: number,
  settings: AvailabilitySettings
): Omit<HourCellInfo, 'state'> {
  const diffMinutes = targetOffsetMinutes - refOffsetMinutes;
  const totalMinutesFromRefMidnight = refHour * 60 + diffMinutes;

  const dayDelta = Math.floor(totalMinutesFromRefMidnight / 1440);
  const wrappedMinutes = ((totalMinutesFromRefMidnight % 1440) + 1440) % 1440;

  const localHour = Math.floor(wrappedMinutes / 60);
  const localMinuteOffset = wrappedMinutes % 60;

  const isAwake = isLocalTimeAwake(
    localHour,
    localMinuteOffset,
    settings.wakeHour,
    settings.sleepHour
  );

  const formattedLocal = formatHourLabel(localHour, localMinuteOffset, settings.timeFormat);
  const compact = formatCellCompactLabel(localHour, localMinuteOffset, settings.timeFormat);
  const formattedCompact = compact.sub ? `${compact.primary}${compact.sub}` : compact.primary;

  return {
    refHour,
    localHour,
    localMinuteOffset,
    formattedLocal,
    formattedCompact,
    dayDelta,
    isAwake,
  };
}

/**
 * Computes the complete 24-hour grid data for all selected cities.
 * First city is always the reference city.
 */
export function computeScheduleGrid(
  cities: City[],
  mode: AppMode,
  settings: AvailabilitySettings,
  date: Date = new Date()
): {
  offsetsByCityId: Record<string, number>;
  cellsByCityId: Record<string, HourCellInfo[]>;
  meetingOverlapHours: number[];
  meetingRanges: TimeRange[];
  baseSummaries: CityOverlapSummary[];
} {
  if (cities.length === 0) {
    return {
      offsetsByCityId: {},
      cellsByCityId: {},
      meetingOverlapHours: [],
      meetingRanges: [],
      baseSummaries: [],
    };
  }

  const offsetsByCityId: Record<string, number> = {};
  for (const city of cities) {
    offsetsByCityId[city.id] = getUtcOffsetMinutes(city.timezone, date);
  }

  const refCity = cities[0];
  const refOffset = offsetsByCityId[refCity.id];

  // First pass: calculate raw local hours & awake status for each city across refHours 0..23
  const rawByCityId: Record<string, Omit<HourCellInfo, 'state'>[]> = {};
  for (const city of cities) {
    const targetOffset = offsetsByCityId[city.id];
    const row: Omit<HourCellInfo, 'state'>[] = [];
    for (let h = 0; h < 24; h++) {
      row.push(computeTargetLocalForRefHour(h, refOffset, targetOffset, settings));
    }
    rawByCityId[city.id] = row;
  }

  // Meeting mode overlap: refHours where EVERY city in the list is awake (requires >= 2 cities for overlap, or if 1 city, awake hours)
  const meetingOverlapHours: number[] = [];
  for (let h = 0; h < 24; h++) {
    const allAwake = cities.every((city) => rawByCityId[city.id][h].isAwake);
    if (allAwake) {
      meetingOverlapHours.push(h);
    }
  }

  const meetingOverlapSet = new Set(meetingOverlapHours);

  // Build final cells with CellState ('sleeping' | 'awake' | 'overlap')
  const cellsByCityId: Record<string, HourCellInfo[]> = {};

  for (let idx = 0; idx < cities.length; idx++) {
    const city = cities[idx];
    const rawRow = rawByCityId[city.id];

    cellsByCityId[city.id] = rawRow.map((cell, h) => {
      if (!cell.isAwake) {
        return { ...cell, state: 'sleeping' as CellState };
      }

      if (cities.length === 1) {
        // When only 1 city is selected, highlight its awake hours or keep awake
        return { ...cell, state: 'overlap' as CellState };
      }

      if (mode === 'meeting') {
        const isOverlap = meetingOverlapSet.has(h);
        return {
          ...cell,
          state: isOverlap ? 'overlap' : 'awake',
        };
      } else {
        // Base mode:
        // For non-reference cities: overlap is when BOTH reference city AND this city are awake at refHour h.
        // For reference city: highlight hours where the reference city is awake AND at least one other city overlaps (or reference city awake window).
        // Let's check the spec:
        // "One city is the 'base' (the reference). Each other city gets its own independent overlap calculated only against the base. Different cities may highlight different hours."
        const refAwake = rawByCityId[refCity.id][h].isAwake;
        if (idx === 0) {
          // Reference city row: awake when refAwake; if any other city is also awake at h, it's an overlap hour for the base
          const anyOtherAwake = cities.slice(1).some((other) => rawByCityId[other.id][h].isAwake);
          return {
            ...cell,
            state: refAwake && anyOtherAwake ? 'overlap' : 'awake',
          };
        } else {
          const isPairOverlap = refAwake && cell.isAwake;
          return {
            ...cell,
            state: isPairOverlap ? 'overlap' : 'awake',
          };
        }
      }
    });
  }

  const meetingRanges = buildContiguousRanges(meetingOverlapHours, settings.timeFormat);

  const baseSummaries: CityOverlapSummary[] = cities.slice(1).map((city) => {
    const overlapHours: number[] = [];
    for (let h = 0; h < 24; h++) {
      if (rawByCityId[refCity.id][h].isAwake && rawByCityId[city.id][h].isAwake) {
        overlapHours.push(h);
      }
    }
    return {
      city,
      totalHours: overlapHours.length,
      ranges: buildContiguousRanges(overlapHours, settings.timeFormat),
    };
  });

  return {
    offsetsByCityId,
    cellsByCityId,
    meetingOverlapHours,
    meetingRanges,
    baseSummaries,
  };
}

/**
 * Converts a sorted list of hours (e.g. [9, 10, 11, 15, 16]) into contiguous inclusive-start -> exclusive-end ranges.
 * E.g. [9, 10, 11] => startHour: 9, endHour: 12, formatted: "9am — 12pm" (or "09:00 — 12:00").
 */
export function buildContiguousRanges(
  hours: number[],
  timeFormat: TimeFormat
): TimeRange[] {
  if (hours.length === 0) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: TimeRange[] = [];

  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      const end = prev + 1;
      ranges.push({
        startHour: start,
        endHour: end,
        hoursCount: end - start,
        formatted: `${formatRangeEndpoint(start, timeFormat)} — ${formatRangeEndpoint(end, timeFormat)}`,
      });
      start = curr;
      prev = curr;
    }
  }

  const end = prev + 1;
  ranges.push({
    startHour: start,
    endHour: end,
    hoursCount: end - start,
    formatted: `${formatRangeEndpoint(start, timeFormat)} — ${formatRangeEndpoint(end, timeFormat)}`,
  });

  return ranges;
}

function formatRangeEndpoint(hour: number, timeFormat: TimeFormat): string {
  // hour can be 0..24 (24 is midnight end of day)
  const normalized = hour % 24;
  return formatHourLabel(normalized, 0, timeFormat);
}
