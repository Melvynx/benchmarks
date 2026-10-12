import type { Attachment, AttachmentKind, Contact } from "./types";

export const ME: Contact = { name: "Sam Carter", email: "sam.carter@fieldnote.io" };

export const isMe = (c: Contact) => c.email.toLowerCase() === ME.email;

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const time = { MIN, HOUR, DAY };

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function listDate(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  if (sameDay(d, n)) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.getFullYear() === n.getFullYear()) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" });
}

export function relative(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const future = diff < 0;
  const abs = Math.abs(diff);
  let out: string;
  if (abs < MIN) return future ? "in a moment" : "just now";
  if (abs < HOUR) out = `${Math.round(abs / MIN)} minute${Math.round(abs / MIN) === 1 ? "" : "s"}`;
  else if (abs < DAY) out = `${Math.round(abs / HOUR)} hour${Math.round(abs / HOUR) === 1 ? "" : "s"}`;
  else if (abs < 30 * DAY) out = `${Math.round(abs / DAY)} day${Math.round(abs / DAY) === 1 ? "" : "s"}`;
  else if (abs < 365 * DAY) out = `${Math.round(abs / (30 * DAY))} month${Math.round(abs / (30 * DAY)) === 1 ? "" : "s"}`;
  else out = `${Math.round(abs / (365 * DAY))} year${Math.round(abs / (365 * DAY)) === 1 ? "" : "s"}`;
  return future ? `in ${out}` : `${out} ago`;
}

export function fullDate(ts: number): string {
  return new Date(ts).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function shortDateTime(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  const tomorrow = new Date(now + DAY);
  const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, n)) return `Today, ${t}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${t}`;
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, ${t}`;
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function kindFromName(name: string): AttachmentKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic", "svg"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "txt", "md", "rtf", "pages"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv", "numbers"].includes(ext)) return "sheet";
  if (["ppt", "pptx", "key"].includes(ext)) return "slides";
  if (["zip", "rar", "7z", "gz", "tar"].includes(ext)) return "zip";
  if (ext === "ics") return "calendar";
  return "other";
}

export const kindColor: Record<AttachmentKind, string> = {
  pdf: "#d93025",
  image: "#d93025",
  doc: "#1a73e8",
  sheet: "#188038",
  slides: "#f9ab00",
  zip: "#5f6368",
  calendar: "#1a73e8",
  other: "#5f6368",
};

export function attachmentTotal(list: Attachment[]) {
  return list.reduce((s, a) => s + a.size, 0);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h\d)>/gi, " ")
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

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function firstName(c: Contact): string {
  if (isMe(c)) return "me";
  const n = c.name || c.email.split("@")[0];
  return n.split(" ")[0];
}

export function displayName(c: Contact): string {
  return c.name || c.email;
}

export function initials(c: Contact): string {
  const n = (c.name || c.email).replace(/[^\p{L}\p{N} ]/gu, "").trim();
  const parts = n.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#1a73e8", "#e8710a", "#188038", "#d93025", "#9334e6", "#12b5cb",
  "#c5221f", "#0b8043", "#795548", "#5c6bc0", "#ef6c00", "#00897b", "#ad1457", "#546e7a",
];

export function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function parseAddress(raw: string): Contact | null {
  const s = raw.trim().replace(/[,;]$/, "");
  if (!s) return null;
  const m = s.match(/^"?([^"<]*)"?\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: s.toLowerCase() };
}

export const uid = (p = "") => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
