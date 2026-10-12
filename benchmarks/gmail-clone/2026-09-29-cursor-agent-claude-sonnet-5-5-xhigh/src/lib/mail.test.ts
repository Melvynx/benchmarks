import { beforeEach, describe, expect, it } from 'vitest';
import { buildSeed } from './seed';
import { createMailStore, DEFAULT_SETTINGS, draftIsEmpty } from './store';
import { hasToken, parseQuery, toggleToken, tokenize, buildQuery, parseAdvanced, emptyAdvanced } from './search';
import { threadsInView, unreadCountForInbox } from './selectors';
import { formatListDate, snoozePresets } from './date';
import { htmlToText, md, parseAddressList } from './text';
import type { Route } from './types';
import { ME } from './people';

const route = (over: Partial<Route>): Route => ({ view: 'inbox', page: 1, tab: 'primary', ...over });

function fresh() {
  const now = Date.now();
  return { now, store: createMailStore({ persist: false, seed: buildSeed(now), settings: { ...DEFAULT_SETTINGS } }) };
}

describe('seed data', () => {
  it('is internally consistent', () => {
    const data = buildSeed();
    const threads = Object.values(data.threads);
    expect(threads.length).toBeGreaterThan(90);
    for (const t of threads) {
      expect(t.messageIds.length).toBeGreaterThan(0);
      for (const id of t.messageIds) expect(data.messages[id]?.threadId).toBe(t.id);
    }
    expect(Object.keys(data.drafts).length).toBeGreaterThanOrEqual(4);
  });

  it('has enough inbox mail to paginate', () => {
    const { store, now } = fresh();
    const s = store.getState();
    const inbox = threadsInView(s, route({ view: 'inbox', tab: 'primary' }), s.settings, now);
    const all = threadsInView(s, route({ view: 'all' }), s.settings, now);
    expect(inbox.length).toBeGreaterThan(10);
    expect(all.length).toBeGreaterThan(80);
  });
});

describe('search parser', () => {
  it('tokenizes quotes and operators', () => {
    expect(tokenize('from:"Priya Nair" "board deck" -draft')).toEqual(['from:"Priya Nair"', '"board deck"', '-draft']);
  });

  it('parses OR groups', () => {
    const q = parseQuery('lisbon OR porto has:attachment');
    expect(q.nodes[0].type).toBe('or');
    expect(q.nodes).toHaveLength(2);
  });

  it('toggles tokens', () => {
    expect(toggleToken('invoice', 'has:attachment')).toBe('invoice has:attachment');
    expect(toggleToken('invoice has:attachment', 'has:attachment')).toBe('invoice');
    expect(hasToken('a is:unread', 'is:unread')).toBe(true);
  });

  it('round-trips advanced filters', () => {
    const q = buildQuery({ ...emptyAdvanced, from: 'Priya Nair', subject: 'deck', attachment: true, doesnt: 'draft' });
    expect(q).toContain('from:"Priya Nair"');
    const f = parseAdvanced(q);
    expect(f.from).toBe('Priya Nair');
    expect(f.attachment).toBe(true);
    expect(f.doesnt).toBe('draft');
  });
});

describe('search results', () => {
  const search = (q: string) => {
    const { store, now } = fresh();
    const s = store.getState();
    return threadsInView(s, route({ view: 'search', param: q }), s.settings, now).map((i) => (i.kind === 'thread' ? i.info.thread.subject : ''));
  };

  it('finds by sender', () => {
    const r = search('from:priya');
    expect(r.length).toBeGreaterThan(2);
    expect(r.some((s) => s.includes('Atlas onboarding'))).toBe(true);
  });

  it('finds by free text in body', () => {
    expect(search('canary').some((s) => s.includes('Postmortem'))).toBe(true);
  });

  it('filters attachments and combines terms', () => {
    const r = search('has:attachment from:diego');
    expect(r.every((s) => s)).toBe(true);
    expect(r.some((s) => s.includes('Invoice #2041'))).toBe(true);
    expect(search('from:diego -has:attachment').every((s) => !s.includes('Invoice #2041'))).toBe(true);
  });

  it('excludes spam and trash unless asked', () => {
    expect(search('gift card').length).toBe(0);
    expect(search('gift card in:spam').length).toBeGreaterThan(0);
    expect(search('lunch in:anywhere').some((s) => s === 'Re: lunch?')).toBe(true);
  });

  it('supports label and unread filters', () => {
    expect(search('label:travel').some((s) => s.includes('Lisbon'))).toBe(true);
    expect(search('is:unread').length).toBeGreaterThan(5);
  });

  it('handles exact phrases', () => {
    expect(search('"three headline options"').length).toBe(1);
  });
});

describe('mailbox actions', () => {
  let ctx: ReturnType<typeof fresh>;
  beforeEach(() => {
    ctx = fresh();
  });

  const firstInboxId = () => {
    const s = ctx.store.getState();
    const item = threadsInView(s, route({ view: 'inbox' }), s.settings, ctx.now)[0];
    return item.id;
  };

  it('archives and undoes', () => {
    const id = firstInboxId();
    const undo = ctx.store.getState().archive([id]);
    let s = ctx.store.getState();
    expect(threadsInView(s, route({ view: 'inbox' }), s.settings, ctx.now).some((i) => i.id === id)).toBe(false);
    expect(threadsInView(s, route({ view: 'all' }), s.settings, ctx.now).some((i) => i.id === id)).toBe(true);
    undo();
    s = ctx.store.getState();
    expect(threadsInView(s, route({ view: 'inbox' }), s.settings, ctx.now).some((i) => i.id === id)).toBe(true);
  });

  it('trashes and restores', () => {
    const id = firstInboxId();
    ctx.store.getState().trash([id]);
    const s = ctx.store.getState();
    expect(threadsInView(s, route({ view: 'trash' }), s.settings, ctx.now).some((i) => i.id === id)).toBe(true);
    ctx.store.getState().moveToInbox([id]);
    const s2 = ctx.store.getState();
    expect(threadsInView(s2, route({ view: 'trash' }), s2.settings, ctx.now).some((i) => i.id === id)).toBe(false);
  });

  it('marks read and unread', () => {
    const before = unreadCountForInbox(ctx.store.getState(), ctx.now);
    const s = ctx.store.getState();
    const unread = threadsInView(s, route({ view: 'inbox' }), s.settings, ctx.now).find((i) => i.kind === 'thread' && i.info.unread)!;
    ctx.store.getState().markRead([unread.id], true);
    expect(unreadCountForInbox(ctx.store.getState(), ctx.now)).toBe(before - 1);
    ctx.store.getState().markRead([unread.id], false);
    expect(unreadCountForInbox(ctx.store.getState(), ctx.now)).toBe(before);
  });

  it('stars threads', () => {
    const id = firstInboxId();
    ctx.store.getState().toggleStarThread(id);
    let s = ctx.store.getState();
    expect(threadsInView(s, route({ view: 'starred' }), s.settings, ctx.now).some((i) => i.id === id)).toBe(true);
    ctx.store.getState().toggleStarThread(id);
    s = ctx.store.getState();
    expect(threadsInView(s, route({ view: 'starred' }), s.settings, ctx.now).some((i) => i.id === id)).toBe(false);
  });

  it('creates and applies labels', () => {
    const id = firstInboxId();
    const label = ctx.store.getState().createLabel('Read later', '#4a86e8');
    ctx.store.getState().applyLabel([id], label, true);
    const s = ctx.store.getState();
    expect(threadsInView(s, route({ view: 'label', param: label }), s.settings, ctx.now).map((i) => i.id)).toEqual([id]);
    ctx.store.getState().deleteLabel(label);
    expect(ctx.store.getState().threads[id].labelIds).not.toContain(label);
  });

  it('snoozes and wakes', () => {
    const id = firstInboxId();
    ctx.store.getState().snooze([id], ctx.now + 60_000);
    let s = ctx.store.getState();
    expect(threadsInView(s, route({ view: 'inbox' }), s.settings, ctx.now).some((i) => i.id === id)).toBe(false);
    expect(threadsInView(s, route({ view: 'snoozed' }), s.settings, ctx.now).some((i) => i.id === id)).toBe(true);
    const res = ctx.store.getState().tick(ctx.now + 120_000);
    expect(res.woken.map((t) => t.id)).toContain(id);
    s = ctx.store.getState();
    expect(threadsInView(s, route({ view: 'inbox' }), s.settings, ctx.now + 120_000).some((i) => i.id === id)).toBe(true);
  });

  it('sends a new message, lands in Sent, and can be undone', () => {
    const st = ctx.store.getState();
    const d = st.createDraft({ to: [{ name: 'Priya Nair', email: 'priya.nair@brightlane.io' }], subject: 'Hello there', html: '<p>Test body</p>' });
    const sent = ctx.store.getState().sendDraft(d)!;
    let s = ctx.store.getState();
    expect(s.drafts[d]).toBeUndefined();
    const sentList = threadsInView(s, route({ view: 'sent' }), s.settings, ctx.now);
    expect(sentList[0].id).toBe(sent.threadId);
    sent.undo();
    s = ctx.store.getState();
    expect(s.threads[sent.threadId]).toBeUndefined();
    expect(s.drafts[d]).toBeDefined();
  });

  it('sends a reply into the same thread and schedules an auto-reply', () => {
    const s0 = ctx.store.getState();
    const target = Object.values(s0.threads).find((t) => t.subject.startsWith('Sunday dinner'))!;
    const before = target.messageIds.length;
    const draftId = s0.startReply(target.id, 'reply');
    expect(ctx.store.getState().drafts[draftId].to[0].email).toContain('grace');
    ctx.store.getState().updateDraft(draftId, { html: '<p>See you at 6, will bring bread?</p>' });
    const res = ctx.store.getState().sendDraft(draftId)!;
    expect(res.threadId).toBe(target.id);
    const s1 = ctx.store.getState();
    expect(s1.threads[target.id].messageIds.length).toBe(before + 1);
    expect(s1.pending.length).toBe(1);
    const tick = ctx.store.getState().tick(Date.now() + 60_000);
    expect(tick.arrived).toHaveLength(1);
    expect(ctx.store.getState().threads[target.id].messageIds.length).toBe(before + 2);
  });

  it('delivers to self into the inbox', () => {
    const st = ctx.store.getState();
    const d = st.createDraft({ to: [ME], subject: 'Note to self', html: '<p>remember</p>' });
    const res = ctx.store.getState().sendDraft(d)!;
    const s = ctx.store.getState();
    expect(s.threads[res.threadId].inbox).toBe(true);
    expect(s.messages[res.messageId].unread).toBe(true);
  });

  it('sends scheduled drafts when due', () => {
    const s0 = ctx.store.getState();
    const d = s0.createDraft({ to: [{ name: 'Tom', email: 'tom.adeyemi@brightlane.io' }], subject: 'Later', html: '<p>hi</p>' });
    ctx.store.getState().scheduleDraft(d, ctx.now + 3600_000);
    const s1 = ctx.store.getState();
    expect(threadsInView(s1, route({ view: 'scheduled' }), s1.settings, ctx.now).some((i) => i.id === d)).toBe(true);
    const res = ctx.store.getState().tick(ctx.now + 3600_001);
    expect(res.sent.map((x) => x.id)).toContain(d);
    expect(ctx.store.getState().drafts[d]).toBeUndefined();
  });

  it('detects empty drafts', () => {
    const st = ctx.store.getState();
    const id = st.createDraft({});
    expect(draftIsEmpty(ctx.store.getState().drafts[id], st.settings.signature)).toBe(true);
    ctx.store.getState().updateDraft(id, { subject: 'x' });
    expect(draftIsEmpty(ctx.store.getState().drafts[id], st.settings.signature)).toBe(false);
  });
});

describe('helpers', () => {
  it('formats list dates', () => {
    const now = new Date('2026-09-30T10:00:00').getTime();
    expect(formatListDate(new Date('2026-09-30T07:41:00').getTime(), now)).toBe('7:41 AM');
    expect(formatListDate(new Date('2026-09-12T07:41:00').getTime(), now)).toBe('Sep 12');
    expect(formatListDate(new Date('2025-03-12T07:41:00').getTime(), now)).toBe('3/12/25');
  });

  it('offers snooze presets in the future', () => {
    const now = Date.now();
    for (const p of snoozePresets(now)) expect(p.at).toBeGreaterThan(now);
  });

  it('converts markdown-ish text', () => {
    expect(md('Hello **world**')).toBe('<p>Hello <b>world</b></p>');
    expect(md('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(htmlToText('<p>Hi</p><div class="q"><blockquote>old</blockquote></div>')).toBe('Hi');
  });

  it('parses address lists', () => {
    expect(parseAddressList('Ada <ada@x.io>, bob@y.com')).toEqual([
      { name: 'Ada', email: 'ada@x.io' },
      { name: '', email: 'bob@y.com' },
    ]);
  });
});
