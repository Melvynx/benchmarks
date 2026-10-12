import { describe, expect, it } from 'vitest';
import type { Contact } from '../lib/types';
import { CORE_CONTACTS, ME } from './contacts';
import { materialize, parseOffset } from './seedTypes';
import { contacts, threads } from './seedMailbox';

const VALID_LABELS = ['work', 'family', 'travel', 'finance', 'receipts', 'design', 'ideas'];
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

const byId = new Map<string, Contact>([...CORE_CONTACTS, ...contacts].map((c) => [c.id, c]));
byId.set('me', ME);

const isSentOnly = (t: (typeof threads)[number]) =>
  t.messages.every((m) => m.from === 'me' && !m.draft && !m.scheduledIn) &&
  !t.trashed &&
  !t.spam;

describe('seedMailbox', () => {
  it('materializes without throwing', () => {
    expect(() => materialize(threads, byId, NOW, 'm')).not.toThrow();
  });

  it('has extra contacts prefixed m_ with unique ids and emails', () => {
    expect(contacts.every((c) => c.id.startsWith('m_'))).toBe(true);
    expect(new Set(contacts.map((c) => c.id)).size).toBe(contacts.length);
    const all = [...CORE_CONTACTS, ...contacts];
    expect(new Set(all.map((c) => c.email)).size).toBe(all.length);
    expect(all.every((c) => c.email.endsWith('.example'))).toBe(true);
  });

  it('keeps message ago values strictly decreasing within each thread', () => {
    for (const t of threads) {
      const agos = t.messages.map((m) => parseOffset(m.ago));
      for (let i = 1; i < agos.length; i++) {
        expect(agos[i], `thread "${t.subject}" message ${i}`).toBeLessThan(agos[i - 1]);
      }
    }
  });

  it('only uses valid label ids', () => {
    for (const t of threads) for (const l of t.labels ?? []) expect(VALID_LABELS).toContain(l);
  });

  it('has 50-62 threads with unique non-empty subjects (except the blank draft) and no "Re:" prefixes', () => {
    expect(threads.length).toBeGreaterThanOrEqual(50);
    expect(threads.length).toBeLessThanOrEqual(62);
    const subjects = threads.map((t) => t.subject).filter(Boolean);
    expect(new Set(subjects).size).toBe(subjects.length);
    expect(threads.filter((t) => t.subject === '')).toHaveLength(1);
    for (const s of subjects) expect(/^(re|fwd?):/i.test(s)).toBe(false);
  });

  it('covers every mailbox state with the expected counts', () => {
    const sentOnly = threads.filter(isSentOnly).length;
    const draftMessages = threads.flatMap((t) => t.messages).filter((m) => m.draft).length;
    const scheduled = threads.filter((t) => t.messages.some((m) => m.scheduledIn));
    expect(sentOnly).toBeGreaterThanOrEqual(20);
    expect(draftMessages).toBeGreaterThanOrEqual(5);
    expect(scheduled).toHaveLength(2);
    expect(threads.filter((t) => t.snoozed)).toHaveLength(3);
    expect(threads.filter((t) => t.trashed).length).toBeGreaterThanOrEqual(6);
    expect(threads.filter((t) => t.spam).length).toBeGreaterThanOrEqual(5);
    expect(threads.filter((t) => t.archived).length).toBeGreaterThanOrEqual(8);
    expect(threads.filter((t) => t.starred).length).toBeGreaterThanOrEqual(4);
  });

  it('gives sent, draft and scheduled messages explicit recipients where required', () => {
    const emptyToDrafts = threads.flatMap((t) => t.messages).filter((m) => m.draft && m.to?.length === 0);
    expect(emptyToDrafts.length).toBeGreaterThanOrEqual(1);
    for (const t of threads.filter(isSentOnly)) {
      for (const m of t.messages) expect(m.to?.length, `thread "${t.subject}"`).toBeGreaterThan(0);
    }
    for (const t of threads.filter((x) => x.messages.some((m) => m.scheduledIn))) {
      expect(t.messages).toHaveLength(1);
      expect(t.messages[0].from).toBe('me');
      expect(t.messages[0].ago).toBe('0m');
    }
  });

  it('keeps drafts, snoozes and trash inside the requested ranges', () => {
    for (const m of threads.flatMap((t) => t.messages).filter((x) => x.draft)) {
      expect(parseOffset(m.ago)).toBeGreaterThanOrEqual(parseOffset('3m'));
      expect(parseOffset(m.ago)).toBeLessThanOrEqual(parseOffset('6d'));
    }
    for (const t of threads.filter((x) => x.trashed)) {
      const ago = parseOffset(t.trashedAgo ?? '');
      expect(ago, t.subject).toBeGreaterThanOrEqual(parseOffset('2h'));
      expect(ago, t.subject).toBeLessThanOrEqual(parseOffset('26d'));
    }
    const snoozes = threads.filter((t) => t.snoozed).map((t) => t.snoozed);
    expect(snoozes).toEqual(['4h', '1d 18h', '6d']);
  });

  it('marks inbox membership correctly after materializing', () => {
    const built = materialize(threads, byId, NOW, 'm');
    const bySubject = new Map(built.map((t) => [t.subject, t]));
    for (const t of built) {
      if (t.trashed || t.spam) expect(t.inbox, t.subject).toBe(false);
    }
    // reply threads appear in the inbox; sent-only ones do not
    expect(bySubject.get('Empty states: illustrations or icons for launch?')?.inbox).toBe(true);
    expect(bySubject.get('Running 10 min late')?.inbox).toBe(false);
    // exactly two of the back-and-forth replies are unread
    const unreadReplies = built
      .filter((t) => t.messages.some((m) => m.from.email === ME.email) && !t.messages.some((m) => m.draft))
      .filter((t) => t.messages.some((m) => m.unread));
    expect(unreadReplies).toHaveLength(2);
  });

  it('avoids weekday and month names so the seed stays date-agnostic', () => {
    const banned =
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|June|July|August|September|October|November|December)\b/;
    for (const t of threads) {
      expect(banned.test(t.subject), t.subject).toBe(false);
      for (const m of t.messages) expect(banned.test(m.md ?? ''), t.subject).toBe(false);
    }
  });
});
