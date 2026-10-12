import type { AttachmentKind, Contact } from '../data/types';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const TIME = { MIN, HOUR, DAY };

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Gmail list-style date: "3:42 PM" today, "Sep 12" this year, "9/12/25" otherwise. */
export function listDate(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  if (sameDay(d, n)) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.getFullYear() === n.getFullYear()) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}

export function fullDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relative(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const future = diff < 0;
  const abs = Math.abs(diff);
  let out: string;
  if (abs < MIN) out = 'just now';
  else if (abs < HOUR) {
    const m = Math.round(abs / MIN);
    out = `${m} minute${m === 1 ? '' : 's'}`;
  } else if (abs < DAY) {
    const h = Math.round(abs / HOUR);
    out = `${h} hour${h === 1 ? '' : 's'}`;
  } else if (abs < 30 * DAY) {
    const d = Math.round(abs / DAY);
    out = `${d} day${d === 1 ? '' : 's'}`;
  } else {
    const mo = Math.round(abs / (30 * DAY));
    if (mo < 12) out = `${mo} month${mo === 1 ? '' : 's'}`;
    else {
      const y = Math.round(abs / (365 * DAY));
      out = `${y} year${y === 1 ? '' : 's'}`;
    }
  }
  if (out === 'just now') return out;
  return future ? `in ${out}` : `${out} ago`;
}

/** "Sep 12, 2026, 3:42 PM (2 days ago)" */
export function messageDate(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const base = d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${base} (${relative(ts, now)})`;
}

export function scheduleLabel(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  const tomorrow = new Date(now + DAY);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (sameDay(d, n)) return `Today, ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function kindFromName(name: string, mime = ''): AttachmentKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'txt', 'md', 'rtf', 'pages'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv', 'numbers'].includes(ext)) return 'sheet';
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'slides';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
  if (mime.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'aac'].includes(ext)) return 'audio';
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) return 'video';
  return 'file';
}

const AVATAR_COLORS = [
  '#1a73e8', '#d93025', '#188038', '#e37400', '#a142f4', '#007b83', '#c5221f', '#b06000',
  '#1e8e3e', '#9334e6', '#d01884', '#129eaf', '#5f6368', '#3c4043', '#8430ce', '#185abc',
];

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function avatarColor(c: Pick<Contact, 'email' | 'color'>): string {
  return c.color ?? AVATAR_COLORS[hash(c.email) % AVATAR_COLORS.length];
}

export function initials(c: Pick<Contact, 'name' | 'email'>): string {
  const src = (c.name || c.email).trim();
  return (src[0] ?? '?').toUpperCase();
}

export function firstName(c: Pick<Contact, 'name' | 'email'>): string {
  const n = c.name?.trim();
  if (!n) return c.email.split('@')[0];
  return n.split(/\s+/)[0];
}

export function displayName(c: Pick<Contact, 'name' | 'email'>): string {
  return c.name?.trim() || c.email;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const URL_RE = /\b(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Converts seeded plain text (paragraphs, "- " bullets, URLs) to safe HTML. */
export function textToHtml(text: string): string {
  const blocks = text.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${linkify(escapeHtml(l.replace(/^\s*[-•]\s+/, '')))}</li>`).join('')}</ul>`;
      }
      if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
        return `<ol>${lines.map((l) => `<li>${linkify(escapeHtml(l.replace(/^\s*\d+[.)]\s+/, '')))}</li>`).join('')}</ol>`;
      }
      return `<p>${lines.map((l) => linkify(escapeHtml(l))).join('<br>')}</p>`;
    })
    .join('');
}

function linkify(s: string): string {
  return s.replace(URL_RE, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

/** Collapses HTML into readable plain text (used for snippets and search). */
export function htmlToText(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-4]|table)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
      .replace(/[ \t\u00a0]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  doc.querySelectorAll('style,script').forEach((n) => n.remove());
  doc.querySelectorAll('br').forEach((n) => n.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,tr,h1,h2,h3,h4,table').forEach((n) => n.append('\n'));
  return (doc.body.textContent ?? '').replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

export function snippetOf(text: string, len = 180): string {
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > len ? `${s.slice(0, len)}…` : s;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** Parses "Name <email>" or bare email strings typed in the recipient field. */
export function parseAddress(raw: string): Contact | null {
  const s = raw.trim().replace(/[,;]+$/, '');
  if (!s) return null;
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) {
    const email = m[2].trim();
    return isValidEmail(email) ? { name: m[1].trim(), email } : null;
  }
  return isValidEmail(s) ? { name: '', email: s } : null;
}
