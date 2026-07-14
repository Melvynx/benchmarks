const formatterCache = new Map<string, Intl.DateTimeFormat>();

function zoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function wallClockParts(timeZone: string, date: Date) {
  const parts = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const part of zoneFormatter(timeZone).formatToParts(date)) {
    if (part.type in parts) parts[part.type as keyof typeof parts] = Number(part.value);
  }
  return parts;
}

/**
 * UTC offset (in minutes) of a timezone at a given instant. Derived from the
 * actual wall clock on that date, so DST is handled automatically.
 */
export function getOffsetMinutes(timeZone: string, date: Date): number {
  const p = wallClockParts(timeZone, date);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUTC - date.getTime()) / 60_000);
}

/** Minutes elapsed since local midnight in the given timezone. */
export function getMinutesOfDay(timeZone: string, date: Date): number {
  const p = wallClockParts(timeZone, date);
  return p.hour * 60 + p.minute;
}

/** "UTC+5:30", "UTC−8", "UTC+0" — fractional offsets included. */
export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return 'UTC+0';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  return rest === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(rest).padStart(2, '0')}`;
}
