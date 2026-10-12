export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
const fullFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const longFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function atTime(ts: number, h: number, m = 0): number {
  const d = new Date(ts);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function formatTime(ts: number): string {
  return timeFmt.format(ts);
}

export function formatListDate(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  if (isSameDay(ts, now)) return timeFmt.format(ts);
  if (d.getFullYear() === n.getFullYear()) return monthDay.format(ts);
  return shortDate.format(ts);
}

export function formatFullDate(ts: number): string {
  return fullFmt.format(ts);
}

export function formatLongDate(ts: number): string {
  return longFmt.format(ts);
}

export function relativeAgo(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff < 0) {
    const ahead = -diff;
    if (ahead < HOUR) return `in ${Math.max(1, Math.round(ahead / MIN))} minutes`;
    if (ahead < DAY) return `in ${Math.round(ahead / HOUR)} hours`;
    return `in ${Math.round(ahead / DAY)} days`;
  }
  if (diff < MIN) return 'just now';
  if (diff < HOUR) {
    const m = Math.round(diff / MIN);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const h = Math.round(diff / HOUR);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(diff / DAY);
  if (days < 45) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

export function formatFuture(ts: number, now = Date.now()): string {
  const t = timeFmt.format(ts);
  if (isSameDay(ts, now)) return `Today, ${t}`;
  if (isSameDay(ts, now + DAY)) return `Tomorrow, ${t}`;
  if (ts - now < 6 * DAY) return `${weekdayFmt.format(ts)}, ${t}`;
  return `${monthDay.format(ts)}, ${t}`;
}

export interface TimePreset {
  id: string;
  label: string;
  at: number;
  detail: string;
}

function nextWeekday(now: number, weekday: number, hour: number): number {
  const d = new Date(now);
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  return atTime(now + diff * DAY, hour);
}

export function snoozePresets(now = Date.now()): TimePreset[] {
  const out: TimePreset[] = [];
  const hour = new Date(now).getHours();
  if (hour < 17) {
    const at = atTime(now, 18);
    out.push({ id: 'later', label: 'Later today', at, detail: formatTime(at) });
  }
  const tomorrow = atTime(now + DAY, 8);
  out.push({ id: 'tomorrow', label: 'Tomorrow', at: tomorrow, detail: `${weekdayFmt.format(tomorrow)}, ${formatTime(tomorrow)}` });
  const dow = new Date(now).getDay();
  if (dow >= 1 && dow <= 3) {
    const at = nextWeekday(now, 4, 8);
    out.push({ id: 'week', label: 'Later this week', at, detail: `${weekdayFmt.format(at)}, ${formatTime(at)}` });
  }
  if (dow >= 1 && dow <= 5) {
    const at = nextWeekday(now, 6, 8);
    out.push({ id: 'weekend', label: 'This weekend', at, detail: `${weekdayFmt.format(at)}, ${formatTime(at)}` });
  }
  const nextWeek = nextWeekday(now, 1, 8);
  out.push({ id: 'nextweek', label: 'Next week', at: nextWeek, detail: `${weekdayFmt.format(nextWeek)}, ${formatTime(nextWeek)}` });
  return out;
}

export function schedulePresets(now = Date.now()): TimePreset[] {
  const tm = atTime(now + DAY, 8);
  const ta = atTime(now + DAY, 13);
  const mon = nextWeekday(now, 1, 8);
  return [
    { id: 'tm', label: 'Tomorrow morning', at: tm, detail: `${monthDay.format(tm)}, ${formatTime(tm)}` },
    { id: 'ta', label: 'Tomorrow afternoon', at: ta, detail: `${monthDay.format(ta)}, ${formatTime(ta)}` },
    { id: 'mon', label: 'Monday morning', at: mon, detail: `${monthDay.format(mon)}, ${formatTime(mon)}` },
  ];
}

export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
