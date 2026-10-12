export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const monthDayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const monthDayYearFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fullFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const dayTimeFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });

/** Gmail-style list date: time today, weekday this week, "Oct 8" this year, else full date. */
export function formatListDate(ts: number, now: number): string {
  const today = startOfDay(now);
  if (ts >= today) return timeFmt.format(ts);
  if (ts >= today - 6 * DAY) return weekdayFmt.format(ts);
  if (new Date(ts).getFullYear() === new Date(now).getFullYear()) return monthDayFmt.format(ts);
  return monthDayYearFmt.format(ts);
}

export function formatTime(ts: number): string {
  return timeFmt.format(ts);
}

export function formatFullDate(ts: number): string {
  return fullFmt.format(ts);
}

export function formatSendAt(ts: number, now: number): string {
  const days = Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
  if (days === 0) return `Today, ${timeFmt.format(ts)}`;
  if (days === 1) return `Tomorrow, ${timeFmt.format(ts)}`;
  if (days > 1 && days < 7) return dayTimeFmt.format(ts);
  return fullFmt.format(ts);
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): number {
  return new Date(value).getTime();
}

export interface SnoozePreset {
  key: string;
  label: string;
  at: number;
}

export function snoozePresets(now: number): SnoozePreset[] {
  const at = (days: number, hour: number): number => {
    const d = new Date(startOfDay(now));
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  };
  const today = new Date(now);
  const laterToday = today.getHours() < 15 ? at(0, 18) : now + 3 * HOUR;
  const daysToSaturday = ((6 - today.getDay() + 7) % 7) || 7;
  const daysToMonday = ((1 - today.getDay() + 7) % 7) || 7;
  return [
    { key: 'later', label: 'Later today', at: laterToday },
    { key: 'tomorrow', label: 'Tomorrow', at: at(1, 8) },
    { key: 'weekend', label: 'This weekend', at: at(daysToSaturday, 8) },
    { key: 'nextweek', label: 'Next week', at: at(daysToMonday, 8) },
  ];
}
