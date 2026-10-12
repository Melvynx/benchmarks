import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const mem = new Map<string, string>();
  const storage: Storage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, String(v)),
    removeItem: (k) => void mem.delete(k),
    clear: () => mem.clear(),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
});

import { ME } from '../data/seed';
import { htmlToText } from '../lib/format';
import { parseQuery, threadMatches } from '../lib/search';
import { useMail } from './mail';
import { computeCounts, isDraftEmpty, rowsForRoute, stripSignature } from './selectors';

const s = () => useMail.getState();
const folder = (f: 'inbox' | 'starred' | 'sent' | 'drafts' | 'trash' | 'spam' | 'all' | 'snoozed' | 'scheduled') =>
  rowsForRoute(s(), { view: 'folder', folder: f, ...(f === 'inbox' ? { category: 'primary' as const } : {}) }, Date.now()).map((r) => r.id);
const search = (q: string) => rowsForRoute(s(), { view: 'search', query: q }, Date.now()).map((r) => r.id);
const firstInbox = () => folder('inbox')[0];

beforeEach(() => s().resetMailbox());

describe('conversation actions', () => {
  it('archives out of the inbox but keeps it in All Mail', () => {
    const id = firstInbox();
    s().archive([id]);
    expect(folder('inbox')).not.toContain(id);
    expect(folder('all')).toContain(id);
    s().moveToInbox([id]);
    expect(folder('inbox')).toContain(id);
  });

  it('trashes, restores and deletes forever', () => {
    const id = firstInbox();
    s().trash([id]);
    expect(folder('trash')).toContain(id);
    expect(folder('inbox')).not.toContain(id);
    expect(folder('all')).not.toContain(id);
    s().moveToInbox([id]);
    expect(folder('trash')).not.toContain(id);
    s().deleteForever([id]);
    expect(s().threads[id]).toBeUndefined();
  });

  it('undoes via snapshot/restore', () => {
    const id = firstInbox();
    const snap = s().snapshot([id]);
    s().trash([id]);
    s().restore(snap);
    expect(folder('inbox')).toContain(id);
  });

  it('stars, marks read/unread and updates counts', () => {
    const id = firstInbox();
    s().setStarred([id], true);
    expect(folder('starred')).toContain(id);
    s().setUnread([id], true);
    const before = computeCounts(s(), Date.now()).inbox;
    s().setUnread([id], false);
    expect(computeCounts(s(), Date.now()).inbox).toBe(before - 1);
  });

  it('labels, moves to a label, and survives label deletion', () => {
    const id = firstInbox();
    const label = s().createLabel('Launch plan');
    s().setLabel([id], label.id, true);
    expect(s().threads[id].labels).toContain(label.id);
    s().moveToLabel([id], label.id);
    expect(folder('inbox')).not.toContain(id);
    expect(rowsForRoute(s(), { view: 'label', labelId: label.id }, Date.now()).map((r) => r.id)).toContain(id);
    s().deleteLabel(label.id);
    expect(s().threads[id].labels).not.toContain(label.id);
    expect(s().labels.find((l) => l.id === label.id)).toBeUndefined();
  });

  it('reports spam and back', () => {
    const id = firstInbox();
    s().reportSpam([id]);
    expect(folder('spam')).toContain(id);
    s().notSpam([id]);
    expect(folder('inbox')).toContain(id);
  });

  it('snoozes and wakes up on tick', () => {
    const id = firstInbox();
    const until = Date.now() + 60_000;
    s().snooze([id], until);
    expect(folder('inbox')).not.toContain(id);
    expect(folder('snoozed')).toContain(id);
    const events = s().tick(until + 1);
    expect(events.some((e) => e.type === 'unsnoozed' && e.threadId === id)).toBe(true);
    expect(s().threads[id].unread).toBe(true);
    expect(s().threads[id].snoozedUntil).toBeNull();
  });
});

describe('drafts and sending', () => {
  it('creates, edits and lists a draft', () => {
    const d = s().createDraft({});
    s().updateDraft(d.id, { subject: 'Coffee?', html: '<div>Tomorrow at 10?</div>' });
    expect(folder('drafts')).toContain(d.id);
    expect(s().drafts[d.id].subject).toBe('Coffee?');
  });

  it('sends a new message into Sent and removes the draft', () => {
    const d = s().createDraft({ to: [{ name: 'Someone New', email: 'new.person@example.org' }], subject: 'Hello there', html: '<div>Hi!</div>' });
    const threadId = s().sendDraft(d.id)!;
    expect(s().drafts[d.id]).toBeUndefined();
    expect(folder('sent')).toContain(threadId);
    expect(folder('inbox')).not.toContain(threadId);
    const msg = s().threads[threadId].messages[0];
    expect(msg.from.email).toBe(ME.email);
    expect(msg.text).toContain('Hi!');
  });

  it('holds a message during the undo window, then sends on tick', () => {
    const d = s().createDraft({ to: [{ name: 'X', email: 'x@example.org' }], subject: 'Undo me', html: 'body' });
    const at = Date.now() + 5000;
    s().queueSend(d.id, at);
    expect(folder('drafts')).not.toContain(d.id);
    expect(folder('scheduled')).not.toContain(d.id);
    const events = s().tick(at);
    const sent = events.find((e) => e.type === 'sent');
    expect(sent && sent.type === 'sent' && !sent.scheduled).toBe(true);
    expect(s().drafts[d.id]).toBeUndefined();
  });

  it('schedules, cancels, and delivers scheduled sends', () => {
    const d = s().createDraft({ to: [{ name: 'X', email: 'x@example.org' }], subject: 'Later', html: 'body' });
    const at = Date.now() + 3_600_000;
    s().scheduleDraft(d.id, at);
    expect(folder('scheduled')).toContain(d.id);
    s().unscheduleDraft(d.id);
    expect(folder('drafts')).toContain(d.id);
    s().scheduleDraft(d.id, at);
    const events = s().tick(at + 1);
    expect(events.some((e) => e.type === 'sent' && e.scheduled)).toBe(true);
  });

  it('threads a reply into the conversation and queues a reply from a known contact', () => {
    const id = folder('inbox').find((tid) => s().threads[tid].messages.some((m) => m.from.kind !== 'brand' && m.from.email !== ME.email))!;
    const t = s().threads[id];
    const other = [...t.messages].reverse().find((m) => m.from.email !== ME.email)!.from;
    const d = s().createDraft({ threadId: id, mode: 'reply', to: [other], subject: `Re: ${t.subject}`, html: '<div>On it.</div>' });
    s().sendDraft(d.id);
    const after = s().threads[id];
    expect(after.messages.length).toBe(t.messages.length + 1);
    expect(after.messages[after.messages.length - 1].from.email).toBe(ME.email);
    const pending = s().incoming.find((i) => i.threadId === id);
    expect(pending).toBeDefined();
    const events = s().tick(pending!.deliverAt);
    expect(events.some((e) => e.type === 'incoming' && e.threadId === id)).toBe(true);
    expect(s().threads[id].unread).toBe(true);
  });

  it('hides untouched compose drafts and strips the signature from snippets', () => {
    const sig = s().settings.signature;
    const sigHtml = `<div><br></div><div>-- <br>${sig.split('\n').join('<br>')}</div>`;
    const blank = s().createDraft({ html: `<div><br></div>${sigHtml}` });
    expect(isDraftEmpty(s().drafts[blank.id], sig)).toBe(true);
    expect(folder('drafts')).not.toContain(blank.id);
    const before = computeCounts(s(), Date.now()).drafts;
    s().updateDraft(blank.id, { html: `<div><br></div>${sigHtml}<div>Ask about the venue.</div>` });
    expect(folder('drafts')).toContain(blank.id);
    expect(computeCounts(s(), Date.now()).drafts).toBe(before + 1);
    expect(stripSignature(htmlToText(s().drafts[blank.id].html), sig).trim()).toBe('Ask about the venue.');
  });

  it('sanitizes outgoing HTML', () => {
    const d = s().createDraft({ to: [{ name: 'X', email: 'x@example.org' }], subject: 'xss', html: '<img src=x onerror="alert(1)"><script>alert(2)</script>ok' });
    const id = s().sendDraft(d.id)!;
    const html = s().threads[id].messages[0].html;
    expect(html).not.toMatch(/onerror|<script/i);
  });
});

describe('search', () => {
  const now = Date.now();
  it('matches free text across subject and body', () => {
    const t = Object.values(s().threads)[0];
    const word = t.subject.split(/\s+/).find((w) => w.length > 4)!.replace(/[^\w]/g, '');
    expect(search(word)).toContain(t.id);
  });

  it('supports operators', () => {
    const all = Object.values(s().threads);
    const withAtt = search('has:attachment');
    expect(withAtt.length).toBeGreaterThan(0);
    for (const id of withAtt) expect(s().threads[id].messages.some((m) => m.attachments.length)).toBe(true);
    for (const id of search('is:unread')) expect(s().threads[id].unread).toBe(true);
    for (const id of search('is:starred')) expect(s().threads[id].starred).toBe(true);
    const fromMe = search('from:me');
    expect(fromMe.length).toBeGreaterThan(0);
    const labelled = search('label:work');
    expect(labelled.length).toBeGreaterThan(0);
    for (const id of labelled) expect(s().threads[id].labels).toContain('work');
    const pq = parseQuery('-has:attachment', now);
    const without = all.filter((t) => threadMatches(t, pq, { labels: s().labels, meEmail: ME.email, now }));
    expect(without.length).toBeGreaterThan(0);
    for (const t of without) expect(t.messages.some((m) => m.attachments.length)).toBe(false);
    for (const id of search('label:work -is:unread')) expect(s().threads[id].unread).toBe(false);
    const notInbox = search('in:anywhere -in:inbox');
    expect(notInbox).toEqual(expect.arrayContaining(folder('trash')));
    expect(notInbox.some((id) => folder('inbox').includes(id))).toBe(false);
  });

  it('excludes spam and trash unless asked', () => {
    const spamId = folder('spam')[0];
    const subj = s().threads[spamId].subject;
    expect(search(`"${subj}"`)).not.toContain(spamId);
    expect(search(`"${subj}" in:anywhere`)).toContain(spamId);
  });
});
