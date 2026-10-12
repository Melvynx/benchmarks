export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const monthDayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('en-US', { year: '2-digit', month: 'numeric', day: 'numeric' });
const fullFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const longDayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const weekdayTimeFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
const monthDayTimeFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function formatTime(ts: number): string {
  return timeFmt.format(ts);
}

export function formatListDate(ts: number, now = Date.now()): string {
  if (isSameDay(ts, now)) return timeFmt.format(ts);
  const a = new Date(ts);
  const b = new Date(now);
  if (a.getFullYear() === b.getFullYear()) return monthDayFmt.format(ts);
  return shortFmt.format(ts);
}

export function formatFull(ts: number): string {
  return fullFmt.format(ts).replace(' at ', ', ');
}

export function formatLongDay(ts: number): string {
  return longDayFmt.format(ts);
}

export function formatShortDateTime(ts: number, now = Date.now()): string {
  if (isSameDay(ts, now)) return `Today, ${timeFmt.format(ts)}`;
  if (isSameDay(ts, now + DAY)) return `Tomorrow, ${timeFmt.format(ts)}`;
  if (isSameDay(ts, now - DAY)) return `Yesterday, ${timeFmt.format(ts)}`;
  const diff = ts - now;
  if (diff > 0 && diff < 6 * DAY) return weekdayTimeFmt.format(ts);
  return monthDayTimeFmt.format(ts);
}

export function relativeAgo(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  if (diff < MIN) return 'just now';
  if (diff < HOUR) {
    const m = Math.floor(diff / MIN);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const d = Math.floor(diff / DAY);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const y = Math.floor(d / 365);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

export function formatEventRange(start: number, end: number): string {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(start);
  return `${day} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

export interface SnoozePreset {
  id: string;
  label: string;
  at: number;
  detail: string;
}

function at(base: Date, hour: number, minute = 0): number {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

export function snoozePresets(now = Date.now()): SnoozePreset[] {
  const d = new Date(now);
  const out: SnoozePreset[] = [];
  if (d.getHours() < 17) {
    const t = at(d, 18);
    out.push({ id: 'later', label: 'Later today', at: t, detail: timeFmt.format(t) });
  }
  const tomorrow = new Date(now + DAY);
  const tm = at(tomorrow, 8);
  out.push({ id: 'tomorrow', label: 'Tomorrow', at: tm, detail: weekdayTimeFmt.format(tm) });
  const sat = new Date(now);
  sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7 || 7));
  const st = at(sat, 8);
  out.push({ id: 'weekend', label: 'This weekend', at: st, detail: weekdayTimeFmt.format(st) });
  const mon = new Date(now);
  mon.setDate(mon.getDate() + ((1 - mon.getDay() + 7) % 7 || 7));
  const mt = at(mon, 8);
  out.push({ id: 'nextweek', label: 'Next week', at: mt, detail: weekdayTimeFmt.format(mt) });
  return out;
}

export function scheduleSendPresets(now = Date.now()): SnoozePreset[] {
  const tomorrow = new Date(now + DAY);
  const tm = at(tomorrow, 8);
  const ta = at(tomorrow, 13);
  const mon = new Date(now);
  mon.setDate(mon.getDate() + ((1 - mon.getDay() + 7) % 7 || 7));
  const mm = at(mon, 8);
  return [
    { id: 'tm', label: 'Tomorrow morning', at: tm, detail: weekdayTimeFmt.format(tm) },
    { id: 'ta', label: 'Tomorrow afternoon', at: ta, detail: weekdayTimeFmt.format(ta) },
    { id: 'mm', label: 'Monday morning', at: mm, detail: weekdayTimeFmt.format(mm) },
  ];
}

export function toLocalInputValue(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}
