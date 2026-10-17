import clsx, { type ClassValue } from "clsx";
import type { Address, AttachmentKind } from "./types";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

let counter = 0;
export function uid(prefix = "id") {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const AVATAR_COLORS = [
  "#1a73e8", "#e8710a", "#188038", "#d93025", "#9334e6", "#129eaf",
  "#c5221f", "#b06000", "#0d652d", "#a142f4", "#1967d2", "#e52592",
  "#5f6368", "#00796b", "#7b1fa2", "#3949ab",
];

export function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function colorFor(key: string) {
  return AVATAR_COLORS[hashString(key.toLowerCase()) % AVATAR_COLORS.length];
}

export function initials(name: string, email = "") {
  const clean = (name || email).replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  if (!clean) return "?";
  return clean[0]!.toUpperCase();
}

export function firstName(a: Address) {
  const n = a.name?.trim();
  if (!n) return a.email.split("@")[0];
  return n.split(/\s+/)[0];
}

export function displayName(a: Address) {
  return a.name?.trim() || a.email;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1).replace(/\.0$/, "")} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function htmlToText(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const el = document.createElement("div");
  el.innerHTML = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)\s*\/?>/gi, "$& ");
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatAddress(a: Address) {
  return a.name ? `${a.name} <${a.email}>` : a.email;
}

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;
export const isValidEmail = (s: string) => EMAIL_RE.test(s.trim());

/** Parses `Name <email>`, `email`, or a bare name into an address. */
export function parseAddress(raw: string): Address | null {
  const s = raw.trim().replace(/^["']|["']$/g, "");
  if (!s) return null;
  const m = s.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].replace(/^["']|["']$/g, "").trim(), email: m[2].trim() };
  return { name: "", email: s };
}

export function kindFromName(name: string, mime = ""): AttachmentKind {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "heic"].includes(ext)) return "image";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["csv", "xlsx", "xls", "numbers", "tsv"].includes(ext)) return "sheet";
  if (["doc", "docx", "pages", "rtf", "md"].includes(ext)) return "doc";
  if (ext === "ics") return "calendar";
  if (["txt", "log", "json"].includes(ext)) return "text";
  if (["zip", "rar", "7z", "gz", "tar"].includes(ext)) return "zip";
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a"].includes(ext)) return "audio";
  if (mime.startsWith("video/") || ["mp4", "mov", "webm"].includes(ext)) return "video";
  return "other";
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}
