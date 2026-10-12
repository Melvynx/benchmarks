import type { Person } from '../types';

export function cn(...parts: Array<string | false | null | undefined | 0>): string {
  return parts.filter(Boolean).join(' ');
}

let counter = 0;
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const AVATAR_COLORS = [
  '#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#c5221f', '#007b83', '#b06000',
  '#5f6368', '#1967d2', '#a142f4', '#e8710a', '#12b5cb', '#e52592', '#0d652d', '#795548',
];

export function avatarColor(seed: string): string {
  return AVATAR_COLORS[hash(seed.toLowerCase()) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (!clean) return '?';
  return clean[0].toUpperCase();
}

export function firstName(name: string): string {
  const n = name.trim();
  if (!n) return '';
  if (/\s/.test(n) && !/^(the|bright|sf|lumen)\b/i.test(n)) return n.split(/\s+/)[0];
  return n;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', rsquo: '’', lsquo: '‘', mdash: '—', ndash: '–', hellip: '…' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#?\w+);/g, (m, e) => ENTITY[e] ?? (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1))) : m));
}

export function stripQuote(html: string): string {
  return html.replace(/<div class="mail-quote"[\s\S]*$/, '');
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|li|h\d|tr)>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@<>(),;:]+@[^\s@<>(),;:]+\.[a-z]{2,}$/i.test(email.trim());
}

export function sameEmail(a: Person | string, b: Person | string): boolean {
  const ea = typeof a === 'string' ? a : a.email;
  const eb = typeof b === 'string' ? b : b.email;
  return ea.trim().toLowerCase() === eb.trim().toLowerCase();
}

export function personLabel(p: Person): string {
  return p.name ? `${p.name} <${p.email}>` : p.email;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement;
  root.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,textarea,select').forEach((el) => el.remove());
  root.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return root.innerHTML;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
