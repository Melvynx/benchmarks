import type { CityOption } from "@/lib/city-catalog";

export type AppMode = "meeting" | "base";
export type TimeFormat = "12h" | "24h";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type TimeParts = {
  hour: number;
  minute: number;
};

const partFormatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartFormatter(timeZone: string) {
  if (!partFormatterCache.has(timeZone)) {
    partFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-GB-u-hc-h23", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }

  return partFormatterCache.get(timeZone)!;
}

function getOffsetFormatter(timeZone: string) {
  if (!offsetFormatterCache.has(timeZone)) {
    offsetFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "shortOffset",
      }),
    );
  }

  return offsetFormatterCache.get(timeZone)!;
}

function partsToRecord(parts: Intl.DateTimeFormatPart[]) {
  return parts.reduce<Record<string, string>>((record, part) => {
    if (part.type !== "literal") {
      record[part.type] = part.value;
    }

    return record;
  }, {});
}

function normalizeHour(hour: number) {
  return hour === 24 ? 0 : hour;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = partsToRecord(getPartFormatter(timeZone).formatToParts(date));

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: normalizeHour(Number(parts.hour)),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const zoned = getZonedParts(date, timeZone);
  const interpretedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );

  return interpretedAsUtc - date.getTime();
}

export function getReferenceDateParts(now: Date, timeZone: string) {
  const { year, month, day } = getZonedParts(now, timeZone);

  return { year, month, day };
}

export function zonedDateTimeToUtc(
  timeZone: string,
  input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute?: number;
    second?: number;
  },
) {
  const minute = input.minute ?? 0;
  const second = input.second ?? 0;
  const wallTimeUtc = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    minute,
    second,
  );

  let result = wallTimeUtc;

  for (let index = 0; index < 3; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(result), timeZone);
    const next = wallTimeUtc - offset;

    if (next === result) {
      break;
    }

    result = next;
  }

  return new Date(result);
}

export function buildReferenceInstants(now: Date, city: CityOption) {
  const referenceDate = getReferenceDateParts(now, city.timeZone);

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    instant: zonedDateTimeToUtc(city.timeZone, { ...referenceDate, hour }),
  }));
}

export function getLocalTimeParts(date: Date, timeZone: string): TimeParts {
  const { hour, minute } = getZonedParts(date, timeZone);

  return { hour, minute };
}

export function isAwakeAtLocalTime(
  time: TimeParts,
  wakeHour: number,
  sleepHour: number,
) {
  if (wakeHour === sleepHour) {
    return true;
  }

  const current = time.hour * 60 + time.minute;
  const wake = wakeHour * 60;
  const sleep = sleepHour * 60;

  if (wake < sleep) {
    return current >= wake && current < sleep;
  }

  return current >= wake || current < sleep;
}

export function getUtcOffsetLabel(date: Date, timeZone: string) {
  const parts = getOffsetFormatter(timeZone).formatToParts(date);
  const raw = parts.find((part) => part.type === "timeZoneName")?.value;

  if (raw) {
    return raw.replace("GMT", "UTC");
  }

  const offsetMinutes = Math.round(getTimeZoneOffsetMs(date, timeZone) / 60000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60)
    .toString()
    .padStart(2, "0");
  const minutes = absolute % 60;

  if (minutes === 0) {
    return `UTC${sign}${hours}`;
  }

  return `UTC${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}

function padTwo(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatCellTime(time: TimeParts, timeFormat: TimeFormat) {
  if (timeFormat === "24h") {
    if (time.minute === 0) {
      return padTwo(time.hour);
    }

    return `${padTwo(time.hour)}:${padTwo(time.minute)}`;
  }

  const period = time.hour >= 12 ? "p" : "a";
  const normalizedHour = time.hour % 12 || 12;

  if (time.minute === 0) {
    return `${normalizedHour}${period}`;
  }

  return `${normalizedHour}:${padTwo(time.minute)}${period}`;
}

export function formatAxisHour(hour: number, timeFormat: TimeFormat) {
  if (timeFormat === "24h") {
    return padTwo(hour);
  }

  const period = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour}${period}`;
}

export function formatRangeLabel(
  startHour: number,
  endHour: number,
  timeFormat: TimeFormat,
) {
  const start = formatSummaryTime(startHour, timeFormat);
  const end = formatSummaryTime(endHour % 24, timeFormat);

  return `${start} - ${end}`;
}

function formatSummaryTime(hour: number, timeFormat: TimeFormat) {
  if (timeFormat === "24h") {
    return `${padTwo(hour)}:00`;
  }

  const period = hour >= 12 ? "pm" : "am";
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour}${period}`;
}

export function summarizeOverlap(hours: boolean[]) {
  const segments: Array<{ start: number; end: number }> = [];
  let start: number | null = null;

  hours.forEach((value, index) => {
    if (value && start === null) {
      start = index;
    }

    if (!value && start !== null) {
      segments.push({ start, end: index });
      start = null;
    }
  });

  if (start !== null) {
    segments.push({ start, end: hours.length });
  }

  return {
    count: hours.filter(Boolean).length,
    segments,
  };
}

export function formatReferenceDate(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);
}
