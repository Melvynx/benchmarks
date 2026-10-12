import type { Category } from "../types";

export const HOUR = 60 * 60 * 1000;

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const out = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return out || "?";
}

const AVATAR_COLORS = [
  "#1a73e8",
  "#188038",
  "#d93025",
  "#e37400",
  "#9334e6",
  "#007b83",
  "#c5221f",
  "#1967d2",
  "#0d904f",
  "#b06000",
];

export function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatListDate(ts: number, now = Date.now()): string {
  const date = new Date(ts);
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  if (date.getFullYear() === today.getFullYear()) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatFull(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function formatShortWhen(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function snippetOf(body: string): string {
  const main = body.split("\n---\n")[0]?.split("\n--\n")[0] ?? "";
  return main.replace(/[*_`>#\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
}

export function cleanSubject(subject: string): string {
  const cleaned = subject.replace(/^(?:(?:re|fwd):\s*)+/i, "").trim();
  return cleaned || "(no subject)";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/(^|[\s(])((https?:\/\/[^\s<]+))/g, '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>');
}

export function bodyToHtml(text: string): string {
  const escaped = escapeHtml(text.trim());
  if (!escaped) return "<p class=\"muted\">(empty message)</p>";
  return escaped
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines.map((line) => `<li>${inlineFormat(line.slice(2))}</li>`).join("")}</ul>`;
      }
      return `<p>${lines.map((line) => inlineFormat(line)).join("<br/>")}</p>`;
    })
    .join("");
}

export function splitQuote(body: string): { main: string; quote: string | null; signature: string | null } {
  const quoteIdx = body.indexOf("\n---\n");
  const quoted = quoteIdx === -1 ? null : body.slice(quoteIdx + 5);
  const head = quoteIdx === -1 ? body : body.slice(0, quoteIdx);
  const sigIdx = head.indexOf("\n--\n");
  if (sigIdx === -1) return { main: head, quote: quoted, signature: null };
  return { main: head.slice(0, sigIdx), quote: quoted, signature: head.slice(sigIdx + 4) };
}

export function snoozePresets(now = Date.now()): { id: string; label: string; hint: string; until: number }[] {
  const date = new Date(now);
  const later = new Date(date);
  if (date.getHours() < 17) later.setHours(18, 0, 0, 0);
  else later.setTime(now + 3 * HOUR);
  if (later.getTime() <= now + 15 * 60 * 1000) later.setTime(now + 2 * HOUR);

  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const nextWeek = new Date(date);
  const day = nextWeek.getDay();
  const add = ((8 - day) % 7) || 7;
  nextWeek.setDate(nextWeek.getDate() + add);
  nextWeek.setHours(8, 0, 0, 0);

  return [
    { id: "later", label: "Later today", hint: formatShortWhen(later.getTime()), until: later.getTime() },
    { id: "tomorrow", label: "Tomorrow", hint: formatShortWhen(tomorrow.getTime()), until: tomorrow.getTime() },
    { id: "week", label: "Next week", hint: formatShortWhen(nextWeek.getTime()), until: nextWeek.getTime() },
  ];
}

export function isCategory(value: string): value is Category {
  return value === "primary" || value === "promotions" || value === "social" || value === "updates";
}
