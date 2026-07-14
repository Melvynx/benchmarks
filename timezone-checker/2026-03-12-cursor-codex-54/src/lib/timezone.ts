import { DateTime } from "luxon";

export type AppMode = "meeting" | "base";
export type TimeFormat = 12 | 24;

export type TimeRange = {
  start: number;
  end: number;
};

export type GridCell = {
  referenceHour: number;
  localHourValue: number;
  localLabel: string;
  dayOffset: number;
  isAwake: boolean;
};

export type PersistedState = {
  cityIds: string[];
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  mode: AppMode;
};

export const STORAGE_KEY = "gpt-5.4-timezone-checker";

export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `UTC${sign}${hours}`;
  }

  return `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatHourLabel(hour: number, timeFormat: TimeFormat): string {
  if (timeFormat === 24) {
    return String(hour).padStart(2, "0");
  }

  const normalized = hour % 24;
  const suffix = normalized >= 12 ? "p" : "a";
  const hour12 = normalized % 12 || 12;
  return `${hour12}${suffix}`;
}

export function formatHourRange(start: number, end: number, timeFormat: TimeFormat): string {
  return `${formatRangeBoundary(start, timeFormat)} - ${formatRangeBoundary(end, timeFormat)}`;
}

function formatRangeBoundary(hour: number, timeFormat: TimeFormat): string {
  const normalized = hour % 24;

  if (timeFormat === 24) {
    return `${String(normalized).padStart(2, "0")}:00`;
  }

  const suffix = normalized >= 12 ? "pm" : "am";
  const hour12 = normalized % 12 || 12;
  return `${hour12}${suffix}`;
}

export function isAwakeAtHour(localHourValue: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) {
    return true;
  }

  if (wakeHour < sleepHour) {
    return localHourValue >= wakeHour && localHourValue < sleepHour;
  }

  return localHourValue >= wakeHour || localHourValue < sleepHour;
}

export function buildReferenceHours(referenceZone: string, now: DateTime): DateTime[] {
  const startOfDay = now.setZone(referenceZone).startOf("day");
  return Array.from({ length: 24 }, (_, hour) => startOfDay.plus({ hours: hour }));
}

export function buildCityCells(
  referenceZone: string,
  cityZone: string,
  now: DateTime,
  wakeHour: number,
  sleepHour: number,
  timeFormat: TimeFormat,
): GridCell[] {
  return buildReferenceHours(referenceZone, now).map((referenceInstant, referenceHour) => {
    const localTime = referenceInstant.setZone(cityZone);
    const localHourValue = localTime.hour + localTime.minute / 60;
    const dayOffset = Math.round(
      localTime.startOf("day").diff(referenceInstant.startOf("day"), "days").days,
    );

    return {
      referenceHour,
      localHourValue,
      localLabel: formatLocalCellLabel(localTime, timeFormat),
      dayOffset,
      isAwake: isAwakeAtHour(localHourValue, wakeHour, sleepHour),
    };
  });
}

export function collectRanges(values: boolean[]): TimeRange[] {
  const ranges: TimeRange[] = [];
  let start = -1;

  values.forEach((value, index) => {
    if (value && start === -1) {
      start = index;
    }

    if (!value && start !== -1) {
      ranges.push({ start, end: index });
      start = -1;
    }
  });

  if (start !== -1) {
    ranges.push({ start, end: values.length });
  }

  return ranges;
}

export function formatCurrentTime(zone: string, now: DateTime, timeFormat: TimeFormat): string {
  return now
    .setZone(zone)
    .toFormat(timeFormat === 24 ? "HH:mm" : "h:mm a")
    .toLowerCase();
}

function formatLocalCellLabel(localTime: DateTime, timeFormat: TimeFormat): string {
  if (timeFormat === 24) {
    return localTime.toFormat(localTime.minute === 0 ? "HH" : "HH:mm");
  }

  return localTime
    .toFormat(localTime.minute === 0 ? "ha" : "h:mma")
    .toLowerCase();
}
