const dtfCache = new Map<string, Intl.DateTimeFormat>();

function dtf(timeZone: string): Intl.DateTimeFormat {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

export function getOffsetMinutes(timeZone: string, date: Date): number {
  const parts = dtf(timeZone).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = get('year');
  const mo = get('month');
  const d = get('day');
  let h = get('hour');
  const mi = get('minute');
  const s = get('second');
  if (h === 24) h = 0;
  const asUTC = Date.UTC(y, mo - 1, d, h, mi, s);
  return Math.round((asUTC - date.getTime()) / 60000);
}

export function formatOffset(timeZone: string, date: Date): string {
  const mins = getOffsetMinutes(timeZone, date);
  const sign = mins < 0 ? '−' : '+';
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (m === 0) return `UTC${sign}${h}`;
  return `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}

export function formatOffsetAscii(timeZone: string, date: Date): string {
  return formatOffset(timeZone, date).replace('−', '-');
}

interface YMD {
  y: number;
  m: number;
  d: number;
}

export function getYMD(timeZone: string, date: Date): YMD {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

function resolveUtcForRefLocal(refTimeZone: string, ymd: YMD, hour: number): Date {
  let guess = Date.UTC(ymd.y, ymd.m - 1, ymd.d, hour, 0, 0);
  for (let i = 0; i < 3; i++) {
    const off = getOffsetMinutes(refTimeZone, new Date(guess));
    guess = Date.UTC(ymd.y, ymd.m - 1, ymd.d, hour, 0, 0) - off * 60000;
  }
  return new Date(guess);
}

export function getReferenceDayInstants(refTimeZone: string, now: Date): Date[] {
  const ymd = getYMD(refTimeZone, now);
  const out: Date[] = [];
  for (let h = 0; h < 24; h++) out.push(resolveUtcForRefLocal(refTimeZone, ymd, h));
  return out;
}

export function getLocalDecimalHour(timeZone: string, instant: Date): number {
  const parts = dtf(timeZone).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  let h = get('hour');
  if (h === 24) h = 0;
  const mi = get('minute');
  return h + mi / 60;
}

export function getCurrentLocalDecimal(timeZone: string, now: Date): number {
  return getLocalDecimalHour(timeZone, now);
}

export function isAwake(decimalHour: number, wake: number, sleep: number): boolean {
  const h = ((decimalHour % 24) + 24) % 24;
  if (wake === sleep) return true;
  if (wake < sleep) return h >= wake - 1e-9 && h < sleep - 1e-9;
  return h >= wake - 1e-9 || h < sleep - 1e-9;
}

export function formatHourLabel(hour24: number, use24h: boolean, minutes = 0): string {
  const h = ((Math.round(hour24) % 24) + 24) % 24;
  const m = Math.round(minutes);
  if (use24h) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const suffix = h < 12 ? 'am' : 'pm';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  if (m === 0) return `${h12}${suffix}`;
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

export function formatDecimalLabel(decimal: number, use24h: boolean): string {
  const totalMins = Math.round(decimal * 60);
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return formatHourLabel(h, use24h, m);
}

export function formatRange(startInclusive: number, endExclusive: number, use24h: boolean): string {
  const s = ((startInclusive % 24) + 24) % 24;
  const e = ((endExclusive % 24) + 24) % 24;
  const sLabel = formatHourLabel(s, use24h, 0);
  const eLabel = formatHourLabel(e === 0 && endExclusive !== 0 ? 0 : e, use24h, 0);
  return `${sLabel} — ${eLabel}`;
}

export function groupContiguous(hours: number[]): { start: number; end: number }[] {
  if (hours.length === 0) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const groups: { start: number; end: number }[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      groups.push({ start, end: prev + 1 });
      start = sorted[i];
      prev = sorted[i];
    }
  }
  groups.push({ start, end: prev + 1 });
  return groups;
}
