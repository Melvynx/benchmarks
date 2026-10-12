import type { Address, Label, Thread } from '../domain/types';
import { isUnread, sentBy, threadBytes } from '../domain/threads';
import { DAY } from './time';

const SEARCH_KEYS = [
  'from',
  'to',
  'cc',
  'subject',
  'label',
  'has',
  'is',
  'in',
  'before',
  'after',
  'older_than',
  'newer_than',
  'larger',
  'smaller',
  'filename',
] as const;
export type SearchKey = (typeof SEARCH_KEYS)[number];

export interface SearchToken {
  negated: boolean;
  key: SearchKey | null;
  value: string;
}

/** Parses Gmail-style queries: from:x "exact phrase" -has:attachment is:unread in:trash. */
export function parseSearch(query: string): SearchToken[] {
  const tokens: SearchToken[] = [];
  for (const match of query.matchAll(/(-?)(?:([a-z_]+):)?(?:"([^"]*)"|(\S+))/gi)) {
    const [, minus, rawKey, quoted, bare] = match;
    const value = (quoted ?? bare ?? '').trim();
    const key = rawKey?.toLowerCase();
    const negated = minus === '-';
    if (key && (SEARCH_KEYS as readonly string[]).includes(key)) {
      if (value) tokens.push({ negated, key: key as SearchKey, value: value.toLowerCase() });
    } else {
      const text = `${rawKey ? `${rawKey}:` : ''}${value}`.trim().toLowerCase();
      if (text) tokens.push({ negated, key: null, value: text });
    }
  }
  return tokens;
}

function parseDate(value: string): number | null {
  const m = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

function parseDuration(value: string): number | null {
  const m = value.match(/^(\d+)([dwmy])$/);
  if (!m) return null;
  const unit = { d: DAY, w: 7 * DAY, m: 30 * DAY, y: 365 * DAY }[m[2] as 'd' | 'w' | 'm' | 'y'];
  return Number(m[1]) * unit;
}

function parseSize(value: string): number | null {
  const m = value.match(/^(\d+(?:\.\d+)?)([kmg]?)$/);
  if (!m) return null;
  const multiplier = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[m[2] as '' | 'k' | 'm' | 'g'];
  return Math.round(Number(m[1]) * multiplier);
}

export interface SearchContext {
  account: string;
  labels: Label[];
  now: number;
}

const addressMatches = (address: Address, value: string): boolean =>
  address.email.toLowerCase().includes(value) || address.name.toLowerCase().includes(value);

function textHolds(thread: Thread, value: string): boolean {
  return (
    thread.subject.toLowerCase().includes(value) ||
    thread.messages.some((m) => m.text.toLowerCase().includes(value) || addressMatches(m.from, value))
  );
}

function featureHolds(thread: Thread, value: string): boolean {
  const attachments = thread.messages.flatMap((m) => m.attachments);
  switch (value) {
    case 'attachment':
    case 'attachments':
      return attachments.length > 0;
    case 'link':
      return thread.messages.some((m) => /<a\s/i.test(m.html));
    case 'image':
      return attachments.some((a) => a.kind === 'image');
    case 'pdf':
      return attachments.some((a) => a.kind === 'pdf');
    default:
      return false;
  }
}

function flagHolds(thread: Thread, value: string): boolean {
  switch (value) {
    case 'unread':
      return isUnread(thread);
    case 'read':
      return !isUnread(thread);
    case 'starred':
      return thread.starred;
    case 'important':
      return thread.important;
    case 'snoozed':
      return thread.snoozedUntil !== null;
    default:
      return false;
  }
}

function tokenHolds(thread: Thread, token: SearchToken, ctx: SearchContext): boolean {
  const v = token.value;
  switch (token.key) {
    case null:
      return textHolds(thread, v);
    case 'from':
      return thread.messages.some((m) => addressMatches(m.from, v));
    case 'to':
      return thread.messages.some((m) => m.to.some((a) => addressMatches(a, v)));
    case 'cc':
      return thread.messages.some((m) => m.cc.some((a) => addressMatches(a, v)));
    case 'subject':
      return thread.subject.toLowerCase().includes(v);
    case 'label':
      return thread.labelIds.some((id) => {
        const label = ctx.labels.find((l) => l.id === id);
        return !!label && (label.name.toLowerCase() === v || label.id === v);
      });
    case 'has':
      return featureHolds(thread, v);
    case 'is':
      return flagHolds(thread, v);
    case 'filename':
      return thread.messages.some((m) => m.attachments.some((a) => a.name.toLowerCase().includes(v)));
    case 'before': {
      const cutoff = parseDate(v);
      return cutoff === null || thread.messages.some((m) => m.date < cutoff);
    }
    case 'after': {
      const cutoff = parseDate(v);
      return cutoff === null || thread.messages.some((m) => m.date >= cutoff);
    }
    case 'older_than': {
      const span = parseDuration(v);
      return span === null || thread.messages.some((m) => m.date < ctx.now - span);
    }
    case 'newer_than': {
      const span = parseDuration(v);
      return span === null || thread.messages.some((m) => m.date >= ctx.now - span);
    }
    case 'larger': {
      const bytes = parseSize(v);
      return bytes === null || threadBytes(thread) > bytes;
    }
    case 'smaller': {
      const bytes = parseSize(v);
      return bytes === null || threadBytes(thread) < bytes;
    }
    default:
      return true;
  }
}

function inScope(thread: Thread, scopes: string[], ctx: SearchContext): boolean {
  const explicit = scopes.some((s) => s === 'anywhere' || s === 'trash' || s === 'spam');
  if (!explicit && (thread.location === 'spam' || thread.location === 'trash')) return false;
  if (scopes.length === 0) return true;
  return scopes.some((scope) => {
    switch (scope) {
      case 'anywhere':
      case 'all':
        return true;
      case 'inbox':
        return thread.location === 'inbox' && thread.snoozedUntil === null;
      case 'archive':
        return thread.location === 'archive';
      case 'spam':
        return thread.location === 'spam';
      case 'trash':
        return thread.location === 'trash';
      case 'sent':
        return sentBy(thread, ctx.account);
      case 'starred':
        return thread.starred;
      case 'snoozed':
        return thread.snoozedUntil !== null;
      case 'important':
        return thread.important;
      default:
        return false;
    }
  });
}

export function threadMatches(thread: Thread, tokens: SearchToken[], ctx: SearchContext): boolean {
  const scopes = tokens.filter((t) => !t.negated && t.key === 'in').map((t) => t.value);
  if (!inScope(thread, scopes, ctx)) return false;
  return tokens.every((token) => {
    if (token.key === 'in') return true;
    const holds = tokenHolds(thread, token, ctx);
    return token.negated ? !holds : holds;
  });
}

/** Free-text terms, used to highlight matches in the list and reading view. */
export function highlightTerms(query: string): string[] {
  return parseSearch(query)
    .filter((t) => !t.negated && (t.key === null || t.key === 'subject'))
    .map((t) => t.value)
    .filter((v) => v.length > 1);
}

export function searchThreads(threads: Thread[], query: string, ctx: SearchContext): Thread[] {
  const tokens = parseSearch(query);
  if (tokens.length === 0) return [];
  return threads
    .filter((thread) => threadMatches(thread, tokens, ctx))
    .sort((a, b) => b.messages[b.messages.length - 1].date - a.messages[a.messages.length - 1].date);
}

const quote = (value: string): string => (/\s/.test(value) ? `"${value.replace(/"/g, '')}"` : value);

export interface AdvancedQuery {
  from?: string;
  to?: string;
  subject?: string;
  words?: string;
  exclude?: string;
  attachment?: boolean;
  within?: string;
  scope?: string;
}

export function buildQuery(a: AdvancedQuery): string {
  const parts: string[] = [];
  if (a.from?.trim()) parts.push(`from:${quote(a.from.trim())}`);
  if (a.to?.trim()) parts.push(`to:${quote(a.to.trim())}`);
  if (a.subject?.trim()) parts.push(`subject:${quote(a.subject.trim())}`);
  if (a.words?.trim()) parts.push(a.words.trim());
  if (a.exclude?.trim()) parts.push(`-${quote(a.exclude.trim())}`);
  if (a.attachment) parts.push('has:attachment');
  if (a.within) parts.push(`newer_than:${a.within}`);
  if (a.scope && a.scope !== 'all') parts.push(`in:${a.scope}`);
  return parts.join(' ');
}
