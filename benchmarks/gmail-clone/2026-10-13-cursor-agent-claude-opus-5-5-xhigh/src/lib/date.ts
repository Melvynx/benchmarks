export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const numeric = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
const full = new Intl.DateTimeFormat("en-US", {
  weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
});
const fullNoYear = new Intl.DateTimeFormat("en-US", {
  weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});
const weekdayTime = new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
const longDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });
const headerDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
});

export function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function sameDay(a: number, b: number) {
  return startOfDay(a) === startOfDay(b);
}

/** Gmail list format: time today, "Oct 12" this year, "10/12/25" otherwise. */
export function listDate(t: number, now = Date.now()) {
  if (sameDay(t, now)) return time.format(t);
  if (new Date(t).getFullYear() === new Date(now).getFullYear()) return monthDay.format(t);
  return numeric.format(t);
}

export function relative(t: number, now = Date.now()) {
  const diff = now - t;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const fmt = (n: number, unit: string) => {
    const s = `${n} ${unit}${n === 1 ? "" : "s"}`;
    return future ? `in ${s}` : `${s} ago`;
  };
  if (abs < MINUTE) return future ? "in a moment" : "now";
  if (abs < HOUR) return fmt(Math.round(abs / MINUTE), "minute");
  if (abs < DAY) return fmt(Math.round(abs / HOUR), "hour");
  if (abs < 30 * DAY) return fmt(Math.round(abs / DAY), "day");
  if (abs < 365 * DAY) return fmt(Math.round(abs / (30 * DAY)), "month");
  return fmt(Math.round(abs / (365 * DAY)), "year");
}

/** Thread view format: "Wed, Oct 14, 3:14 PM (2 hours ago)". */
export function messageDate(t: number, now = Date.now()) {
  const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear();
  const base = sameYear ? fullNoYear.format(t) : full.format(t);
  return `${base} (${relative(t, now)})`;
}

export function shortMessageDate(t: number, now = Date.now()) {
  if (sameDay(t, now)) return time.format(t);
  return monthDay.format(t);
}

export const formatTime = (t: number) => time.format(t);
export const formatWeekdayTime = (t: number) => weekdayTime.format(t);
export const formatLongDate = (t: number) => longDate.format(t);
export const formatHeaderDate = (t: number) => headerDate.format(t);
export const formatMonthDay = (t: number) => monthDay.format(t);

export function at(dayOffset: number, hours: number, minutes = 0, base = Date.now()) {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

export function nextWeekday(weekday: number, hours: number, base = Date.now()) {
  const d = new Date(base);
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hours, 0, 0, 0);
  return d.getTime();
}

export interface TimeOption {
  id: string;
  label: string;
  detail: string;
  at: number;
}

export function snoozeOptions(now = Date.now()): TimeOption[] {
  const opts: TimeOption[] = [];
  const later = at(0, 18, 0, now);
  if (later - now > HOUR) opts.push({ id: "later", label: "Later today", detail: formatWeekdayTime(later), at: later });
  const tomorrow = at(1, 8, 0, now);
  opts.push({ id: "tomorrow", label: "Tomorrow", detail: formatWeekdayTime(tomorrow), at: tomorrow });
  const day = new Date(now).getDay();
  if (day !== 6 && day !== 0 && day !== 5) {
    const weekend = nextWeekday(6, 8, now);
    opts.push({ id: "weekend", label: "This weekend", detail: formatWeekdayTime(weekend), at: weekend });
  }
  const nextWeek = nextWeekday(1, 8, now);
  opts.push({ id: "week", label: "Next week", detail: formatWeekdayTime(nextWeek), at: nextWeek });
  return opts;
}

export function scheduleOptions(now = Date.now()): TimeOption[] {
  const tm = at(1, 8, 0, now);
  const ta = at(1, 13, 0, now);
  const mon = nextWeekday(1, 8, now);
  const fmt = (t: number) => `${monthDay.format(t)}, ${time.format(t)}`;
  const opts: TimeOption[] = [
    { id: "tm", label: "Tomorrow morning", detail: fmt(tm), at: tm },
    { id: "ta", label: "Tomorrow afternoon", detail: fmt(ta), at: ta },
  ];
  if (new Date(now).getDay() !== 0) opts.push({ id: "mon", label: "Monday morning", detail: fmt(mon), at: mon });
  return opts;
}

export function toLocalInput(t: number) {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function fromLocalInput(date: string, timeStr: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}
