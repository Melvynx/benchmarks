export type HourFormat = '12h' | '24h';
export type Mode = 'meeting' | 'base';

export function getOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  let diff = (asUTC - at.getTime()) / 60000;
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  return Math.round(diff);
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (m === 0) return `UTC${sign}${h}`;
  return `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}

export function isAwake(hour: number, wake: number, sleep: number): boolean {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (wake === sleep) return true;
  if (wake < sleep) return h >= wake && h < sleep;
  return h >= wake || h < sleep;
}

/** Local hour (float, 0-24) in target city when it is `refHour` (exact hour) in reference city. */
export function localHourAt(refHour: number, diffMinutes: number): number {
  return (((refHour + diffMinutes / 60) % 24) + 24) % 24;
}

export function formatHour(h: number, fmt: HourFormat): string {
  const hour = ((Math.floor(h) % 24) + 24) % 24;
  const mins = Math.round(((((h % 1) + 1) % 1) * 60));
  const mm = mins === 60 ? 0 : mins;
  const hh = mins === 60 ? (hour + 1) % 24 : hour;
  const minStr = mm === 0 ? '' : `:${String(mm).padStart(2, '0')}`;
  if (fmt === '24h') return `${String(hh).padStart(2, '0')}${mm === 0 ? '' : `:${String(mm).padStart(2, '0')}`}`;
  const suffix = hh < 12 ? 'a' : 'p';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${minStr}${suffix}`;
}

export function formatRange(start: number, end: number, fmt: HourFormat): string {
  return `${formatHour(start, fmt)} — ${formatHour(end % 24 === 0 && end !== 0 ? 24 : end % 24, fmt)}`;
}

/** Collapse a 24-bool array into contiguous [start, end) ranges (end exclusive, may be 24). */
export function toRanges(mask: boolean[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let s = -1;
  for (let i = 0; i <= 24; i++) {
    const on = i < 24 ? mask[i] : false;
    if (on && s === -1) s = i;
    if (!on && s !== -1) {
      ranges.push([s, i]);
      s = -1;
    }
  }
  return ranges;
}
