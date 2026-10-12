import { describe, expect, it } from 'vitest';
import { buildSeed, SEED_LABELS } from './seed';
import { computeCounts, inFolder, listRowsForFolder } from '../lib/mail';
import type { MailState } from '../lib/types';
import { DEFAULT_SETTINGS } from './seed';

const NOW = Date.UTC(2026, 8, 29, 12, 0, 0);
const seed = buildSeed(NOW);

function stateOf(): MailState {
  return {
    version: 3,
    seededAt: NOW,
    threads: Object.fromEntries(seed.threads.map((t) => [t.id, t])),
    labels: seed.labels,
    contacts: seed.contacts,
    settings: { ...DEFAULT_SETTINGS },
    recentSearches: [],
    pending: [],
  };
}

describe('full seed mailbox', () => {
  it('has a realistic amount of mail', () => {
    expect(seed.threads.length).toBeGreaterThanOrEqual(120);
    const messages = seed.threads.reduce((n, t) => n + t.messages.length, 0);
    expect(messages).toBeGreaterThanOrEqual(220);
  });

  it('uses unique thread and message ids', () => {
    const tids = new Set(seed.threads.map((t) => t.id));
    expect(tids.size).toBe(seed.threads.length);
    const mids = seed.threads.flatMap((t) => t.messages.map((m) => m.id));
    expect(new Set(mids).size).toBe(mids.length);
  });

  it('only references known labels and never dates a delivered message in the future', () => {
    const labels = new Set(SEED_LABELS.map((l) => l.id));
    for (const t of seed.threads) {
      for (const l of t.labelIds) expect(labels.has(l), `${t.subject}: ${l}`).toBe(true);
      for (const m of t.messages) {
        if (!m.draft && !m.scheduledAt) expect(m.date, t.subject).toBeLessThanOrEqual(NOW);
      }
    }
  });

  it('populates every required mailbox and category', () => {
    const s = stateOf();
    for (const f of ['inbox', 'starred', 'sent', 'drafts', 'trash', 'spam', 'snoozed', 'scheduled', 'important'] as const) {
      expect(listRowsForFolder(s, f, NOW).length, f).toBeGreaterThan(0);
    }
    const c = computeCounts(s, NOW);
    for (const cat of ['primary', 'promotions', 'social', 'updates'] as const) {
      expect(listRowsForFolder(s, 'inbox', NOW, cat).length, cat).toBeGreaterThan(2);
    }
    expect(c.inbox).toBeGreaterThan(5);
  });

  it('has attachments, unread and read mail, and multi-message conversations', () => {
    expect(seed.threads.some((t) => t.messages.some((m) => m.attachments.length))).toBe(true);
    expect(seed.threads.filter((t) => t.messages.length >= 3).length).toBeGreaterThanOrEqual(10);
    const s = stateOf();
    const inbox = Object.values(s.threads).filter((t) => inFolder(t, 'inbox', NOW));
    expect(inbox.some((t) => t.messages.some((m) => m.unread))).toBe(true);
    expect(inbox.some((t) => t.messages.every((m) => !m.unread))).toBe(true);
  });

  it('gives every contact a unique email', () => {
    const emails = seed.contacts.map((c) => c.email.toLowerCase());
    expect(new Set(emails).size).toBe(emails.length);
  });
});
