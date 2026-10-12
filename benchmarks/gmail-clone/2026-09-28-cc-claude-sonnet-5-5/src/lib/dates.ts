const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** Gmail list style: time today, "Sep 12" this year, "9/12/25" before. */
export function formatListDate(ts: number, now = Date.now()): string {
  if (isSameDay(ts, now)) return formatTime(ts);
  const d = new Date(ts);
  const n = new Date(now);
  if (d.getFullYear() === n.getFullYear()) return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

/** Message header style: "Mon, Sep 29, 10:12 AM (3 hours ago)". */
export function formatFullDate(ts: number, now = Date.now(), withAgo = true): string {
  const d = new Date(ts);
  const n = new Date(now);
  const year = d.getFullYear() === n.getFullYear() ? '' : `, ${d.getFullYear()}`;
  const base = `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}${year}, ${formatTime(ts)}`;
  return withAgo ? `${base} (${relativeAgo(ts, now)})` : base;
}

export function formatLongDate(ts: number): string {
  const d = new Date(ts);
  return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${formatTime(ts)}`;
}

export function relativeAgo(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff < 0) return 'in the future';
  const mins = Math.floor(diff / MINUTE);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(diff / HOUR);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(diff / DAY);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/** "Tomorrow, 8:00 AM" / "Mon, Sep 30, 8:00 AM" / "Today, 6:00 PM" */
export function formatWhen(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  if (isSameDay(ts, now)) return `Today, ${formatTime(ts)}`;
  if (isSameDay(ts, now + DAY)) return `Tomorrow, ${formatTime(ts)}`;
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : `, ${d.getFullYear()}`;
  return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}${year}, ${formatTime(ts)}`;
}

export function formatShortWhen(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  if (isSameDay(ts, now)) return formatTime(ts);
  if (isSameDay(ts, now + DAY)) return `Tomorrow, ${formatTime(ts)}`;
  return `${DAYS_SHORT[d.getDay()]}, ${formatTime(ts)}`;
}

function atHour(base: number, dayOffset: number, hour: number, minute = 0): number {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

export interface TimePreset {
  id: string;
  label: string;
  ts: number;
}

export function snoozePresets(now = Date.now()): TimePreset[] {
  const d = new Date(now);
  const out: TimePreset[] = [];
  if (d.getHours() < 17) out.push({ id: 'later', label: 'Later today', ts: atHour(now, 0, 18) });
  out.push({ id: 'tomorrow', label: 'Tomorrow', ts: atHour(now, 1, 8) });
  const daysToSat = (6 - d.getDay() + 7) % 7 || 7;
  out.push({ id: 'weekend', label: 'This weekend', ts: atHour(now, daysToSat, 8) });
  const daysToMon = (1 - d.getDay() + 7) % 7 || 7;
  out.push({ id: 'nextweek', label: 'Next week', ts: atHour(now, daysToMon, 8) });
  return out;
}

export function scheduleSendPresets(now = Date.now()): TimePreset[] {
  const d = new Date(now);
  const out: TimePreset[] = [
    { id: 'tomorrow-am', label: 'Tomorrow morning', ts: atHour(now, 1, 8) },
    { id: 'tomorrow-pm', label: 'Tomorrow afternoon', ts: atHour(now, 1, 13) },
  ];
  const daysToMon = (1 - d.getDay() + 7) % 7 || 7;
  if (daysToMon > 1) out.push({ id: 'monday', label: 'Monday morning', ts: atHour(now, daysToMon, 8) });
  return out;
}

export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toTimeInputValue(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fromInputs(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).getTime();
}

export function formatDayHeading(ts: number, now = Date.now()): string {
  if (isSameDay(ts, now)) return 'Today';
  if (isSameDay(ts, now - DAY)) return 'Yesterday';
  const d = new Date(ts);
  return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
