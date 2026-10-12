import { describe, expect, it } from 'vitest';
import { kindFromName } from '../lib/format';
import { computeCounts, rowsForRoute } from '../store/selectors';
import { DEFAULT_SETTINGS } from '../store/mail';
import { CONTACTS, DEFAULT_LABELS, ME, buildDrafts, buildThreads, resolveAgo } from './seed';
import { SEED_DRAFTS, SEED_THREADS } from './seedThreads';

const NOW = new Date(2026, 8, 29, 10, 30).getTime();
const threads = buildThreads(NOW);
const drafts = buildDrafts(NOW, threads);
const state = { threads, drafts, labels: DEFAULT_LABELS, settings: DEFAULT_SETTINGS };
const ids = (folder: Parameters<typeof rowsForRoute>[1]) => rowsForRoute(state, folder, NOW).map((r) => r.id);

describe('seed integrity', () => {
  it('has unique thread ids', () => {
    const seen = new Set<string>();
    const dupes = SEED_THREADS.map((t) => t.id).filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(dupes).toEqual([]);
  });

  it('resolves every contact key', () => {
    const keys = new Set(Object.keys(CONTACTS));
    const missing = new Set<string>();
    const check = (k: string) => k !== 'me' && !keys.has(k) && missing.add(k);
    for (const t of SEED_THREADS) for (const m of t.messages) [m.from, ...m.to, ...(m.cc ?? [])].forEach(check);
    for (const d of SEED_DRAFTS) [...d.to, ...(d.cc ?? [])].forEach(check);
    expect([...missing]).toEqual([]);
  });

  it('never impersonates the user through a contact entry', () => {
    expect(Object.values(CONTACTS).filter((c) => c.email.toLowerCase() === ME.email)).toEqual([]);
  });

  it('uses only known labels and categories', () => {
    const labelIds = new Set(DEFAULT_LABELS.map((l) => l.id));
    const bad = SEED_THREADS.flatMap((t) => (t.labels ?? []).filter((l) => !labelIds.has(l)).map((l) => `${t.id}:${l}`));
    expect(bad).toEqual([]);
    for (const t of SEED_THREADS) expect(['primary', 'promotions', 'social', 'updates']).toContain(t.category);
  });

  it('uses valid relative timestamps, all in the past, authored in order', () => {
    const problems: string[] = [];
    for (const t of SEED_THREADS) {
      let prev = -Infinity;
      for (const [i, m] of t.messages.entries()) {
        if (!/^(\d+[mh]|\d+d@\d{1,2}:\d{2})$/.test(m.at)) problems.push(`${t.id}#${i} bad at "${m.at}"`);
        const ts = resolveAgo(m.at, NOW);
        if (ts > NOW) problems.push(`${t.id}#${i} in the future`);
        if (ts < prev) problems.push(`${t.id}#${i} earlier than the previous message`);
        prev = ts;
      }
    }
    expect(problems).toEqual([]);
  });

  it('has non-empty bodies and subjects', () => {
    const empty = SEED_THREADS.flatMap((t) => [
      ...(t.subject.trim() ? [] : [`${t.id}: subject`]),
      ...t.messages.filter((m) => !(m.body?.trim() || m.html?.trim())).map((_, i) => `${t.id}#${i}: body`),
    ]);
    expect(empty).toEqual([]);
  });

  it('starts "sent" conversations with a message from me', () => {
    const bad = SEED_THREADS.filter((t) => t.location === 'sent' && t.messages[0].from !== 'me').map((t) => t.id);
    expect(bad).toEqual([]);
  });

  it('gives attachments recognisable types and sizes', () => {
    const bad = SEED_THREADS.flatMap((t) =>
      t.messages.flatMap((m) => (m.attachments ?? []).filter((a) => kindFromName(a.name) === 'file' || a.size <= 0).map((a) => `${t.id}:${a.name}`)),
    );
    expect(bad).toEqual([]);
  });

  it('attaches reply drafts to existing threads', () => {
    const bad = SEED_DRAFTS.filter((d) => d.threadId && !threads[d.threadId]).map((d) => d.threadId);
    expect(bad).toEqual([]);
  });
});

describe('seeded mailbox shape', () => {
  it('is large and varied', () => {
    const list = Object.values(threads);
    expect(list.length).toBeGreaterThanOrEqual(90);
    expect(list.filter((t) => t.messages.length >= 3).length).toBeGreaterThanOrEqual(10);
    expect(list.filter((t) => t.messages.some((m) => m.attachments.length)).length).toBeGreaterThanOrEqual(15);
    expect(new Set(list.flatMap((t) => t.messages.map((m) => m.from.email))).size).toBeGreaterThanOrEqual(50);
    for (const c of ['primary', 'promotions', 'social', 'updates'] as const) {
      expect(list.filter((t) => t.category === c && t.inInbox).length, c).toBeGreaterThanOrEqual(4);
    }
  });

  it('populates every system folder', () => {
    expect(ids({ view: 'folder', folder: 'inbox' }).length).toBeGreaterThanOrEqual(20);
    expect(ids({ view: 'folder', folder: 'starred' }).length).toBeGreaterThanOrEqual(5);
    expect(ids({ view: 'folder', folder: 'sent' }).length).toBeGreaterThanOrEqual(15);
    expect(ids({ view: 'folder', folder: 'drafts' }).length).toBeGreaterThanOrEqual(3);
    expect(ids({ view: 'folder', folder: 'trash' }).length).toBeGreaterThanOrEqual(3);
    expect(ids({ view: 'folder', folder: 'spam' }).length).toBeGreaterThanOrEqual(3);
    expect(ids({ view: 'folder', folder: 'snoozed' }).length).toBeGreaterThanOrEqual(1);
    expect(ids({ view: 'folder', folder: 'important' }).length).toBeGreaterThanOrEqual(5);
    for (const l of DEFAULT_LABELS) expect(ids({ view: 'label', labelId: l.id }).length, l.id).toBeGreaterThanOrEqual(2);
  });

  it('mixes read and unread mail in the inbox', () => {
    const counts = computeCounts(state, NOW);
    expect(counts.inbox).toBeGreaterThanOrEqual(4);
    expect(counts.inbox).toBeLessThan(ids({ view: 'folder', folder: 'inbox' }).length);
    expect(counts.categories.promotions + counts.categories.social + counts.categories.updates).toBeGreaterThan(0);
  });

  it('keeps trash and spam out of the inbox and All Mail', () => {
    const inbox = new Set(ids({ view: 'folder', folder: 'inbox', category: 'primary' }));
    const all = new Set(ids({ view: 'folder', folder: 'all' }));
    for (const id of [...ids({ view: 'folder', folder: 'trash' }), ...ids({ view: 'folder', folder: 'spam' })]) {
      expect(inbox.has(id)).toBe(false);
      expect(all.has(id)).toBe(false);
    }
  });
});
