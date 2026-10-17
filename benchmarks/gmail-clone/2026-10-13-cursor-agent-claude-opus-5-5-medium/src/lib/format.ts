const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function listDate(ts: number, now = Date.now()) {
  const d = new Date(ts);
  const n = new Date(now);
  if (sameDay(d, n)) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.getFullYear() === n.getFullYear()) return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { year: "2-digit", month: "numeric", day: "numeric" });
}

export function relative(ts: number, now = Date.now()) {
  const diff = now - ts;
  const future = diff < 0;
  const a = Math.abs(diff);
  const min = Math.round(a / 60000);
  const wrap = (s: string) => (future ? `in ${s}` : `${s} ago`);
  if (min < 1) return future ? "in a moment" : "just now";
  if (min < 60) return wrap(`${min} minute${min === 1 ? "" : "s"}`);
  const h = Math.round(min / 60);
  if (h < 24) return wrap(`${h} hour${h === 1 ? "" : "s"}`);
  const days = Math.round(h / 24);
  if (days < 30) return wrap(`${days} day${days === 1 ? "" : "s"}`);
  const mo = Math.round(days / 30);
  return wrap(`${mo} month${mo === 1 ? "" : "s"}`);
}

export function fullDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function shortDateTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, now)) return `Today, ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string) {
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  return (clean[0] ?? "?").toUpperCase();
}
