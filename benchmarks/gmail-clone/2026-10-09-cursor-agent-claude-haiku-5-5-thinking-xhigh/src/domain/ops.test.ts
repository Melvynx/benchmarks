import { describe, expect, it } from 'vitest';
import { createSeedData } from './seed';
import * as ops from './ops';
import type { Draft, Outgoing, Thread, MailData } from './types';

const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);

function fresh(): MailData {
  return createSeedData(NOW);
}

function draftFixture(id: string, overrides: Partial<Draft> = {}): Draft {
  return {
    id,
    threadId: null,
    mode: 'new',
    to: [{ name: 'Ada', email: 'ada@example.com' }],
    cc: [],
    bcc: [],
    subject: 'Hello',
    html: '<p>Body text</p>',
    attachments: [],
    updatedAt: NOW,
    pristine: false,
    ...overrides,
  };
}

function outgoingFixture(draft: Draft, sendAt = NOW): Outgoing {
  return { id: `out-${draft.id}`, kind: 'undo', sendAt, createdAt: NOW, draft };
}

describe('moveThreads', () => {
  it('archives a conversation and clears its snooze', () => {
    const d = fresh();
    const snoozed = d.threads.find((t) => t.snoozedUntil !== null);
    expect(snoozed).toBeDefined();
    const next = ops.moveThreads(d, [snoozed!.id], 'archive');
    const moved = next.threads.find((t) => t.id === snoozed!.id)!;
    expect(moved.location).toBe('archive');
    expect(moved.snoozedUntil).toBeNull();
  });

  it('does not touch threads outside the id set', () => {
    const d = fresh();
    const target = d.threads[0];
    const next = ops.moveThreads(d, [target.id], 'trash');
    const others = next.threads.filter((t) => t.id !== target.id);
    expect(others).toEqual(d.threads.filter((t) => t.id !== target.id));
  });
});

describe('deliver', () => {
  it('appends a reply to the existing thread and brings archived threads back to the inbox', () => {
    const d = fresh();
    const archived = d.threads.find((t) => t.location === 'archive')!;
    const draft = draftFixture('d-reply', { threadId: archived.id, mode: 'reply', subject: `Re: ${archived.subject}` });
    const out = outgoingFixture(draft);
    const withOut = { ...d, outgoing: [out] };

    const next = ops.deliver(withOut, out, NOW);
    const thread = next.threads.find((t) => t.id === archived.id)!;

    expect(thread.messages.length).toBe(archived.messages.length + 1);
    expect(thread.messages.at(-1)!.from.email).toBe(d.account.email);
    expect(thread.location).toBe('inbox');
    expect(next.outgoing.find((o) => o.id === out.id)).toBeUndefined();
  });

  it('creates a new thread filed in All Mail when there is no source conversation', () => {
    const d = fresh();
    const draft = draftFixture('d-new', { subject: '  Quarterly notes  ' });
    const out = outgoingFixture(draft);
    const next = ops.deliver({ ...d, outgoing: [out] }, out, NOW);

    const created = next.threads.find((t) => t.subject === 'Quarterly notes');
    expect(created).toBeDefined();
    expect(created!.location).toBe('archive');
    expect(created!.messages[0].unread).toBe(false);
    expect(created!.messages[0].text).toContain('Body text');
  });

  it('falls back to a placeholder subject for empty subjects', () => {
    const d = fresh();
    const draft = draftFixture('d-empty', { subject: '' });
    const out = outgoingFixture(draft);
    const next = ops.deliver({ ...d, outgoing: [out] }, out, NOW);
    expect(next.threads.some((t) => t.subject === '(no subject)')).toBe(true);
  });
});

describe('cancelOutgoing', () => {
  it('returns the pending message to Drafts and removes it from the queue', () => {
    const d = fresh();
    const draft = draftFixture('d-cancel');
    const out = outgoingFixture(draft, NOW + 60_000);
    const { data, draft: restored } = ops.cancelOutgoing({ ...d, outgoing: [out] }, out.id, NOW);

    expect(restored).not.toBeNull();
    expect(restored!.id).toBe('d-cancel');
    expect(restored!.pristine).toBe(false);
    expect(data.outgoing.some((o) => o.id === out.id)).toBe(false);
    expect(data.drafts[0].id).toBe('d-cancel');
  });

  it('returns null for an unknown outgoing id', () => {
    const d = fresh();
    const result = ops.cancelOutgoing(d, 'missing', NOW);
    expect(result.draft).toBeNull();
    expect(result.data).toBe(d);
  });
});

describe('queueOutgoing', () => {
  it('removes the draft from Drafts when the send is queued', () => {
    const d = { ...fresh(), drafts: [draftFixture('d-queue')] };
    const out = outgoingFixture(draftFixture('d-queue'));
    const next = ops.queueOutgoing(d, out);
    expect(next.drafts.some((x) => x.id === 'd-queue')).toBe(false);
    expect(next.outgoing).toContainEqual(out);
  });
});

describe('snapshot restore (undo)', () => {
  it('restores threads exactly as they were before a move', () => {
    const d = fresh();
    const ids = d.threads.slice(0, 3).map((t) => t.id);
    const snapshot: Thread[] = d.threads.filter((t) => ids.includes(t.id));
    const moved = ops.moveThreads(d, ids, 'trash');
    const restored = ops.replaceThreads(moved, snapshot);
    expect(restored.threads).toEqual(d.threads);
  });
});

describe('wakeSnoozed', () => {
  it('returns due snoozed threads to the inbox with their last message unread', () => {
    const d = fresh();
    const due = { ...d, threads: d.threads.map((t) => (t.snoozedUntil !== null ? { ...t, snoozedUntil: NOW - 1 } : t)) };
    const next = ops.wakeSnoozed(due, NOW);
    expect(next.threads.every((t) => t.snoozedUntil === null)).toBe(true);
    const woken = next.threads.find((t) => t.id === due.threads.find((x) => x.snoozedUntil !== null)?.id);
    expect(woken).toBeDefined();
  });

  it('leaves threads that are still snoozed alone', () => {
    const d = fresh();
    const next = ops.wakeSnoozed(d, NOW);
    expect(next.threads.filter((t) => t.snoozedUntil !== null).length).toBe(d.threads.filter((t) => t.snoozedUntil !== null).length);
  });
});

describe('addRecentSearch', () => {
  it('moves repeated queries to the front and caps the list', () => {
    let d = fresh();
    for (const q of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'a']) d = ops.addRecentSearch(d, q);
    expect(d.recentSearches[0]).toBe('a');
    expect(d.recentSearches.length).toBeLessThanOrEqual(6);
    expect(new Set(d.recentSearches).size).toBe(d.recentSearches.length);
  });
});
