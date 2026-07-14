const partsCache = new Map();
const offsetNameCache = new Map();
const timeFormatterCache = new Map();

function getFormatter(cache, key, factory) {
  if (!cache.has(key)) {
    cache.set(key, factory());
  }
  return cache.get(key);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function normalizeSearch(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function isHourInWindow(hour, start, end) {
  if (start === end) {
    return true;
  }
  if (start < end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
}

export function getZonedParts(date, timeZone) {
  const key = `${timeZone}|parts`;
  const formatter = getFormatter(partsCache, key, () =>
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  );

  const entries = formatter.formatToParts(date);
  const values = {};
  for (const entry of entries) {
    if (entry.type !== 'literal') {
      values[entry.type] = Number(entry.value);
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function addDaysToDateParts(parts, days) {
  const timestamp = Date.UTC(parts.year, parts.month - 1, parts.day) + days * 86400000;
  const next = new Date(timestamp);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function parseOffsetFromLabel(value) {
  const match = value.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return null;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}

export function getOffsetMinutes(timeZone, date = new Date()) {
  const formatter = getFormatter(offsetNameCache, `${timeZone}|offset`, () =>
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  );

  const parts = formatter.formatToParts(date);
  const label = parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  const parsed = parseOffsetFromLabel(label);
  if (parsed !== null) {
    return parsed;
  }

  const zoned = getZonedParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  return Math.round((zonedAsUtc - date.getTime()) / 60000);
}

export function formatUtcOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  const hourPart = Math.floor(absolute / 60);
  const minutePart = absolute % 60;
  return `UTC${sign}${pad(hourPart)}:${pad(minutePart)}`;
}

export function zonedDateTimeToUtcMs(timeZone, parts) {
  const localMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute ?? 0,
    parts.second ?? 0,
    0,
  );

  let utcMs = localMs;
  for (let index = 0; index < 4; index += 1) {
    const offset = getOffsetMinutes(timeZone, new Date(utcMs));
    const candidate = localMs - offset * 60000;
    if (Math.abs(candidate - utcMs) < 1) {
      return candidate;
    }
    utcMs = candidate;
  }

  return utcMs;
}

export function getHourIntervalUtc(timeZone, dateParts, hour) {
  const startDate = { ...dateParts };
  let endDate = { ...dateParts };
  let endHour = hour + 1;

  if (hour === 23) {
    endDate = addDaysToDateParts(dateParts, 1);
    endHour = 0;
  }

  const startUtc = zonedDateTimeToUtcMs(timeZone, {
    ...startDate,
    hour,
    minute: 0,
    second: 0,
  });

  let endUtc = zonedDateTimeToUtcMs(timeZone, {
    ...endDate,
    hour: endHour,
    minute: 0,
    second: 0,
  });

  if (endUtc <= startUtc) {
    endUtc = startUtc + 3600000;
  }

  return [startUtc, endUtc];
}

export function buildPrimaryUtcRange(primaryZone, workStart, workEnd, now) {
  const local = getZonedParts(now, primaryZone);
  const baseDate = { year: local.year, month: local.month, day: local.day };

  const startUtc = zonedDateTimeToUtcMs(primaryZone, {
    ...baseDate,
    hour: workStart,
    minute: 0,
    second: 0,
  });

  const wraps = workEnd <= workStart;
  const endDate = wraps ? addDaysToDateParts(baseDate, 1) : baseDate;

  const endUtc = zonedDateTimeToUtcMs(primaryZone, {
    ...endDate,
    hour: workEnd,
    minute: 0,
    second: 0,
  });

  return {
    startUtc,
    endUtc: endUtc > startUtc ? endUtc : startUtc + 3600000,
  };
}

export function computeOverlapHours(cardZone, primaryRange, now) {
  const local = getZonedParts(now, cardZone);
  const date = { year: local.year, month: local.month, day: local.day };

  const hours = Array.from({ length: 24 }, (_, hour) => {
    const [startUtc, endUtc] = getHourIntervalUtc(cardZone, date, hour);
    return startUtc < primaryRange.endUtc && endUtc > primaryRange.startUtc;
  });

  return {
    hours,
    hasOverlap: hours.some(Boolean),
  };
}

export function formatLocalTime(date, timeZone, timeFormat) {
  const mode = timeFormat === '12' ? '12' : '24';
  const key = `${timeZone}|${mode}`;
  const formatter = getFormatter(timeFormatterCache, key, () =>
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: mode === '12',
    }),
  );

  return formatter.format(date);
}

export function formatHourLabel(hour) {
  return `${pad(hour)}:00`;
}
