import { describe, expect, it } from 'vitest';
import { createSeedData } from './seed';
import { folderThreads, listThreads, visibleDrafts, scheduledItems, sidebarCounts, PAGE_SIZE } from './selectors';
import { FOLDERS } from './types';

const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);

describe('seed data', () => {
  const data = createSeedData(NOW);

  it('gives every thread, message, draft and label a unique id', () => {
    const ids = [
      ...data.threads.map((t) => t.id),
      ...data.threads.flatMap((t) => t.messages.map((m) => m.id)),
      ...data.drafts.map((d) => d.id),
      ...data.outgoing.map((o) => o.id),
      ...data.labels.map((l) => l.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fills every folder so navigation never lands on an empty demo', () => {
    for (const folder of FOLDERS) {
      if (folder === 'drafts' || folder === 'scheduled') continue;
      expect(folderThreads(data, folder).length, folder).toBeGreaterThan(0);
    }
  });

  it('has enough mail to paginate and some attachments, labels and threads in multiple messages', () => {
    expect(data.threads.length).toBeGreaterThan(PAGE_SIZE);
    expect(data.threads.some((t) => t.messages.some((m) => m.attachments.length > 0))).toBe(true);
    expect(data.labels.length).toBeGreaterThanOrEqual(3);
    expect(data.threads.some((t) => t.messages.length > 2)).toBe(true);
  });

  it('seeds drafts and a scheduled message that show up in their sections', () => {
    expect(visibleDrafts(data).length).toBeGreaterThan(0);
    expect(scheduledItems(data).length).toBeGreaterThan(0);
    const counts = sidebarCounts(data);
    expect(counts.drafts).toBe(visibleDrafts(data).length);
    expect(counts.scheduled).toBe(scheduledItems(data).length);
  });

  it('keeps every search-section result inside the Gmail-style query model', () => {
    const hits = listThreads(data, { kind: 'search', q: 'has:attachment' }, 'primary', NOW);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((t) => t.messages.some((m) => m.attachments.length > 0))).toBe(true);
  });

  it('is deterministic for the same clock', () => {
    const a = createSeedData(NOW);
    const b = createSeedData(NOW);
    expect(a.threads.map((t) => t.subject)).toEqual(b.threads.map((t) => t.subject));
  });
});
