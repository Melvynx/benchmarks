const DAY = 86_400_000;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Gmail list style: time today, "Sep 12" this year, "3/4/25" otherwise. */
export function formatListDate(ts: number, now = Date.now()) {
  const d = new Date(ts);
  const n = new Date(now);
  if (ts >= startOfDay(now) && ts < startOfDay(now) + DAY) return formatTime(ts);
  if (d.getFullYear() === n.getFullYear()) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
}

export function relativeAgo(ts: number, now = Date.now()) {
  const diff = now - ts;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const h = Math.round(abs / 3_600_000);
  const d = Math.round(abs / DAY);
  let s: string;
  if (m < 1) s = "just now";
  else if (m < 60) s = `${m} minute${m === 1 ? "" : "s"}`;
  else if (h < 24) s = `${h} hour${h === 1 ? "" : "s"}`;
  else if (d < 30) s = `${d} day${d === 1 ? "" : "s"}`;
  else if (d < 365) {
    const mo = Math.round(d / 30);
    s = `${mo} month${mo === 1 ? "" : "s"}`;
  } else {
    const y = Math.round(d / 365);
    s = `${y} year${y === 1 ? "" : "s"}`;
  }
  if (s === "just now") return s;
  return future ? `in ${s}` : `${s} ago`;
}

/** Thread view style: "Sep 12, 2026, 2:14 PM (3 days ago)". */
export function formatFullDate(ts: number, now = Date.now()) {
  const d = new Date(ts);
  const n = new Date(now);
  const sameYear = d.getFullYear() === n.getFullYear();
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const base = `${date}, ${formatTime(ts)}`;
  const rel = relativeAgo(ts, now);
  return now - ts < 30 * DAY ? `${base} (${rel})` : base;
}

export function formatLongDate(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatScheduleLabel(ts: number, now = Date.now()) {
  const d = new Date(ts);
  const today = startOfDay(now);
  const day = startOfDay(ts);
  let prefix: string;
  if (day === today) prefix = "Today";
  else if (day === today + DAY) prefix = "Tomorrow";
  else prefix = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${prefix}, ${formatTime(ts)}`;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name;
}

export function initials(name: string) {
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  return (clean[0] ?? "?").toUpperCase();
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<div data-skip[^>]*>[\s\S]*?<\/div>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Next occurrence helpers for snooze / schedule menus. */
export function atHour(base: number, dayOffset: number, hour: number, minute = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

export function nextWeekday(base: number, weekday: number, hour: number) {
  const d = new Date(base);
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  return atHour(base, diff, hour);
}

export function toLocalInputValue(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
