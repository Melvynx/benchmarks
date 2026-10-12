import type {
  Address,
  Attachment,
  CategoryId,
  Contact,
  Label,
  MailState,
  Message,
  PendingDelivery,
  Settings,
  Thread,
} from './types';
import { ME } from '../data/contacts';
import { quoteFor } from '../data/seedTypes';
import { createSeedState, getState, replaceState, setState } from './store';
import { closeCompose, confirmDialog, openCompose, setUI, toast } from './ui';
import { deliveredMessages, isDelivered, isMeAddr, isUnread, uid } from './mail';
import { escapeHtml, htmlToText, md } from './md';
import { sanitizeHtml } from './sanitize';
import { composeReply, replyDelayMs } from './autoreply';
import { DAY, formatWhen } from './dates';
import { navigate, currentRoute, hrefFor } from './router';

export const meAddress = (): Address => ({ name: ME.name, email: ME.email });

/* ---------- helpers ---------- */

type ThreadFn = (t: Thread) => Thread;

function applyToThreads(ids: string[], fn: ThreadFn): Record<string, Thread> {
  const prev: Record<string, Thread> = {};
  setState((s) => {
    const threads = { ...s.threads };
    let changed = false;
    for (const id of ids) {
      const t = s.threads[id];
      if (!t) continue;
      const n = fn(t);
      if (n !== t) {
        prev[id] = t;
        threads[id] = n;
        changed = true;
      }
    }
    return changed ? { ...s, threads } : s;
  });
  return prev;
}

function restoreThreads(prev: Record<string, Thread>) {
  setState((s) => ({ ...s, threads: { ...s.threads, ...prev } }));
}

function withUndo(prev: Record<string, Thread>, message: string) {
  if (!Object.keys(prev).length) return;
  const undo = () => restoreThreads(prev);
  setUI({ lastUndo: undo });
  toast(message, { actions: [{ label: 'Undo', run: undo }] });
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many.replace('{n}', String(n)));
const conv = (n: number, verb: string) => plural(n, `Conversation ${verb}.`, `{n} conversations ${verb}.`);

const hasIncoming = (t: Thread) => t.messages.some((m) => isDelivered(m) && !isMeAddr(m.from));

/* ---------- triage ---------- */

export function archive(ids: string[]) {
  const prev = applyToThreads(ids, (t) => (t.inbox ? { ...t, inbox: false } : t));
  withUndo(prev, conv(Object.keys(prev).length, 'archived'));
  return Object.keys(prev).length;
}

export function moveToInbox(ids: string[]) {
  const prev = applyToThreads(ids, (t) => ({
    ...t,
    inbox: hasIncoming(t) || t.inbox,
    trashed: false,
    trashedAt: undefined,
    spam: false,
  }));
  withUndo(prev, conv(Object.keys(prev).length, 'moved to Inbox'));
}

export function trash(ids: string[]) {
  const now = Date.now();
  const prev = applyToThreads(ids, (t) => (t.trashed ? t : { ...t, trashed: true, trashedAt: now, inbox: false, snoozedUntil: undefined }));
  withUndo(prev, conv(Object.keys(prev).length, 'moved to Trash'));
}

export function deleteForever(ids: string[]) {
  const n = ids.filter((id) => getState().threads[id]).length;
  setState((s) => {
    const threads = { ...s.threads };
    for (const id of ids) delete threads[id];
    return { ...s, threads, pending: s.pending.filter((p) => !ids.includes(p.threadId)) };
  });
  if (n) toast(conv(n, 'deleted forever'));
}

export function emptyFolder(folder: 'trash' | 'spam') {
  const ids = Object.values(getState().threads)
    .filter((t) => (folder === 'trash' ? t.trashed : t.spam && !t.trashed))
    .map((t) => t.id);
  deleteForever(ids);
}

export function markSpam(ids: string[]) {
  const prev = applyToThreads(ids, (t) => (t.spam ? t : { ...t, spam: true, inbox: false, trashed: false, trashedAt: undefined }));
  withUndo(prev, conv(Object.keys(prev).length, 'reported as spam'));
}

export function notSpam(ids: string[]) {
  const prev = applyToThreads(ids, (t) => ({ ...t, spam: false, inbox: hasIncoming(t) || t.inbox }));
  withUndo(prev, conv(Object.keys(prev).length, 'marked as not spam and moved to Inbox'));
}

export function setStarred(ids: string[], value: boolean) {
  applyToThreads(ids, (t) => (t.starred === value ? t : { ...t, starred: value }));
}

export function toggleStar(ids: string[]) {
  const s = getState();
  const all = ids.every((id) => s.threads[id]?.starred);
  setStarred(ids, !all);
}

export function setImportant(ids: string[], value: boolean) {
  applyToThreads(ids, (t) => (t.important === value ? t : { ...t, important: value }));
}

export function markRead(ids: string[], read: boolean) {
  applyToThreads(ids, (t) => {
    if (read) {
      if (!t.messages.some((m) => m.unread)) return t;
      return { ...t, messages: t.messages.map((m) => (m.unread ? { ...m, unread: false } : m)) };
    }
    const delivered = deliveredMessages(t);
    const last = delivered[delivered.length - 1];
    if (!last || isUnread(t)) return t;
    return { ...t, messages: t.messages.map((m) => (m.id === last.id ? { ...m, unread: true } : m)) };
  });
}

export function markMessageUnread(threadId: string, messageId: string) {
  applyToThreads([threadId], (t) => ({ ...t, messages: t.messages.map((m) => (m.id === messageId ? { ...m, unread: true } : m)) }));
}

export function snooze(ids: string[], until: number) {
  const prev = applyToThreads(ids, (t) => ({ ...t, snoozedUntil: until }));
  withUndo(prev, `${plural(Object.keys(prev).length, 'Conversation', '{n} conversations')} snoozed until ${formatWhen(until)}.`);
}

export function unsnooze(ids: string[]) {
  const prev = applyToThreads(ids, (t) => (t.snoozedUntil ? { ...t, snoozedUntil: undefined } : t));
  withUndo(prev, conv(Object.keys(prev).length, 'moved back to Inbox'));
}

export function muteThreads(ids: string[]) {
  const prev = applyToThreads(ids, (t) => ({ ...t, muted: true, inbox: false }));
  withUndo(prev, `${conv(Object.keys(prev).length, 'muted')}`);
}

export function applyLabels(ids: string[], add: string[], remove: string[]) {
  const prev = applyToThreads(ids, (t) => {
    const next = new Set(t.labelIds);
    add.forEach((l) => next.add(l));
    remove.forEach((l) => next.delete(l));
    if (next.size === t.labelIds.length && t.labelIds.every((l) => next.has(l))) return t;
    return { ...t, labelIds: [...next] };
  });
  const n = Object.keys(prev).length;
  if (n) withUndo(prev, n === 1 ? 'The conversation was labeled.' : `${n} conversations were labeled.`);
}

export type MoveDest = 'inbox' | 'spam' | 'trash' | `cat:${CategoryId}` | `label:${string}`;

export function moveTo(ids: string[], dest: MoveDest) {
  if (dest === 'inbox') return moveToInbox(ids);
  if (dest === 'spam') return markSpam(ids);
  if (dest === 'trash') return trash(ids);
  if (dest.startsWith('cat:')) {
    const cat = dest.slice(4) as CategoryId;
    const prev = applyToThreads(ids, (t) => ({ ...t, category: cat }));
    withUndo(prev, conv(Object.keys(prev).length, `moved to ${cat[0].toUpperCase()}${cat.slice(1)}`));
    return;
  }
  const labelId = dest.slice(6);
  const label = getState().labels.find((l) => l.id === labelId);
  const prev = applyToThreads(ids, (t) => ({
    ...t,
    inbox: false,
    labelIds: t.labelIds.includes(labelId) ? t.labelIds : [...t.labelIds, labelId],
  }));
  withUndo(prev, conv(Object.keys(prev).length, `moved to "${label?.name ?? 'label'}"`));
}

export function deleteMessage(threadId: string, messageId: string) {
  const s = getState();
  const t = s.threads[threadId];
  if (!t) return;
  const remaining = t.messages.filter((m) => m.id !== messageId);
  const prev = { [threadId]: t };
  setState((st) => {
    const threads = { ...st.threads };
    if (remaining.length) threads[threadId] = { ...t, messages: remaining };
    else delete threads[threadId];
    return { ...st, threads };
  });
  const undo = () => restoreThreads(prev);
  setUI({ lastUndo: undo });
  toast('Message deleted.', { actions: [{ label: 'Undo', run: undo }] });
  if (!remaining.length && currentRoute().page === 'mail') {
    const r = currentRoute();
    if (r.page === 'mail' && r.threadId === threadId) navigate(hrefFor(r.view));
  }
}

export function unsubscribeMessage(threadId: string, messageId: string) {
  applyToThreads([threadId], (t) => ({ ...t, messages: t.messages.map((m) => (m.id === messageId ? { ...m, unsubscribe: false } : m)) }));
}

/* ---------- labels ---------- */

export function createLabel(name: string, color: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'label';
  let id = base;
  const ids = new Set(getState().labels.map((l) => l.id));
  let n = 2;
  while (ids.has(id)) id = `${base}-${n++}`;
  setState((s) => ({ ...s, labels: [...s.labels, { id, name: name.trim(), color }] }));
  return id;
}

export function updateLabel(id: string, patch: Partial<Pick<Label, 'name' | 'color'>>) {
  setState((s) => ({ ...s, labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
}

export function deleteLabel(id: string) {
  setState((s) => {
    const threads: Record<string, Thread> = {};
    for (const [tid, t] of Object.entries(s.threads)) {
      threads[tid] = t.labelIds.includes(id) ? { ...t, labelIds: t.labelIds.filter((l) => l !== id) } : t;
    }
    return { ...s, labels: s.labels.filter((l) => l.id !== id), threads };
  });
}

/* ---------- contacts / settings / search history ---------- */

export function ensureContacts(addrs: Address[]) {
  setState((s) => {
    const known = new Set(s.contacts.map((c) => c.email.toLowerCase()));
    const add: Contact[] = [];
    for (const a of addrs) {
      const e = a.email.toLowerCase();
      if (known.has(e) || isMeAddr(a)) continue;
      known.add(e);
      add.push({ id: uid('c'), name: a.name || e.split('@')[0], email: e });
    }
    return add.length ? { ...s, contacts: [...s.contacts, ...add] } : s;
  });
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function pushRecentSearch(q: string) {
  const query = q.trim();
  if (!query) return;
  setState((s) => ({ ...s, recentSearches: [query, ...s.recentSearches.filter((x) => x !== query)].slice(0, 8) }));
}

export function removeRecentSearch(q: string) {
  setState((s) => ({ ...s, recentSearches: s.recentSearches.filter((x) => x !== q) }));
}

export function resetMailbox() {
  replaceState(createSeedState());
  setUI({ selection: { keys: [], allInView: false }, composes: [], cursor: null, lastUndo: null });
  navigate('#/inbox');
  toast('Mailbox reset to the original demo data.');
}

export function confirmReset() {
  confirmDialog(
    { title: 'Reset mailbox?', body: 'This restores the original demo mailbox and settings. Your changes in this browser will be lost.', confirmLabel: 'Reset', danger: true },
    resetMailbox,
  );
}

/* ---------- drafts & sending ---------- */

export interface DraftInput {
  id: string;
  threadId: string;
  subject: string;
  to: Address[];
  cc: Address[];
  bcc: Address[];
  html: string;
  quoteHtml?: string;
  attachments: Attachment[];
}

function buildMessage(input: DraftInput, extra: Partial<Message>): Message {
  const html = input.html;
  return {
    id: input.id,
    threadId: input.threadId,
    from: meAddress(),
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    date: Date.now(),
    html,
    quoteHtml: input.quoteHtml,
    text: htmlToText(html),
    attachments: input.attachments,
    unread: false,
    draft: true,
    ...extra,
  };
}

export function saveDraft(input: DraftInput) {
  const msg = buildMessage(input, { draft: true });
  setState((s) => {
    const t = s.threads[input.threadId];
    if (!t) {
      const thread: Thread = {
        id: input.threadId,
        subject: input.subject,
        messages: [msg],
        labelIds: [],
        category: 'primary',
        inbox: false,
        starred: false,
        important: false,
        trashed: false,
        spam: false,
      };
      return { ...s, threads: { ...s.threads, [thread.id]: thread } };
    }
    const exists = t.messages.some((m) => m.id === msg.id);
    const messages = exists ? t.messages.map((m) => (m.id === msg.id ? msg : m)) : [...t.messages, msg];
    const onlyDraft = messages.every((m) => m.draft);
    return { ...s, threads: { ...s.threads, [t.id]: { ...t, messages, subject: onlyDraft ? input.subject : t.subject } } };
  });
}

export function discardDraft(draftId: string, threadId: string, opts: { silent?: boolean } = {}) {
  const s = getState();
  const t = s.threads[threadId];
  if (!t || !t.messages.some((m) => m.id === draftId)) return;
  const prev = { [threadId]: t };
  setState((st) => {
    const cur = st.threads[threadId];
    if (!cur) return st;
    const messages = cur.messages.filter((m) => m.id !== draftId);
    const threads = { ...st.threads };
    if (messages.length) threads[threadId] = { ...cur, messages };
    else delete threads[threadId];
    return { ...st, threads };
  });
  if (!opts.silent) {
    const undo = () => restoreThreads(prev);
    setUI({ lastUndo: undo });
    toast('Draft discarded.', { actions: [{ label: 'Undo', run: undo }] });
  }
}

export function validateRecipients(input: Pick<DraftInput, 'to' | 'cc' | 'bcc'>): string | null {
  const all = [...input.to, ...input.cc, ...input.bcc];
  if (!all.length) return 'Please specify at least one recipient.';
  return null;
}

export function sendDraft(input: DraftInput, opts: { scheduledAt?: number } = {}): string {
  const now = Date.now();
  const settings = getState().settings;
  const html = sanitizeHtml(input.html);
  const scheduled = opts.scheduledAt && opts.scheduledAt > now + 1000 ? opts.scheduledAt : undefined;
  const recipients = [...input.to, ...input.cc, ...input.bcc];
  const toSelf = recipients.some(isMeAddr);
  const msg = buildMessage({ ...input, html }, { draft: false, date: now, unread: toSelf && !scheduled, scheduledAt: scheduled });
  const undoMs = settings.undoSendSeconds * 1000;

  setState((s) => {
    const t = s.threads[input.threadId];
    let thread: Thread;
    if (!t) {
      thread = {
        id: input.threadId,
        subject: input.subject.trim() || '',
        messages: [msg],
        labelIds: [],
        category: 'primary',
        inbox: toSelf && !scheduled,
        starred: false,
        important: false,
        trashed: false,
        spam: false,
      };
    } else {
      const others = t.messages.filter((m) => m.id !== input.id).map((m) => (!scheduled && isDelivered(m) && m.unread && !toSelf ? { ...m, unread: false } : m));
      const messages = [...others, msg].sort((a, b) => (a.draft ? 1 : 0) - (b.draft ? 1 : 0) || a.date - b.date);
      thread = {
        ...t,
        messages,
        subject: t.messages.every((m) => m.id === input.id) ? input.subject.trim() : t.subject,
        inbox: toSelf && !scheduled ? true : t.inbox,
      };
    }

    // Simulated replies from known contacts.
    const pending: PendingDelivery[] = [...s.pending];
    const seen = new Set<string>();
    for (const a of [...input.to, ...input.cc]) {
      if (isMeAddr(a) || seen.size >= 2) continue;
      const c = s.contacts.find((x) => x.email.toLowerCase() === a.email.toLowerCase());
      if (!c?.replies || seen.has(c.id)) continue;
      seen.add(c.id);
      const base = scheduled ?? now + undoMs;
      pending.push({ id: uid('p'), at: base + replyDelayMs(msg) + seen.size * 4000, threadId: thread.id, contactId: c.id, inReplyTo: msg.id });
    }
    return { ...s, threads: { ...s.threads, [thread.id]: thread }, pending };
  });
  ensureContacts(recipients);

  const threadId = input.threadId;
  const undo = () => undoSend(msg.id, threadId);
  setUI({ lastUndo: undo });
  if (scheduled) {
    toast(`Send scheduled for ${formatWhen(scheduled)}.`, {
      actions: [
        { label: 'Undo', run: undo },
        { label: 'View all scheduled', run: () => navigate('#/scheduled') },
      ],
      duration: Math.max(6000, undoMs),
    });
  } else {
    toast('Message sent.', {
      actions: [
        { label: 'Undo', run: undo },
        { label: 'View message', run: () => navigate(`#/sent/${encodeURIComponent(threadId)}`) },
      ],
      duration: Math.max(5000, undoMs),
    });
  }
  return msg.id;
}

export function undoSend(messageId: string, threadId: string) {
  const t = getState().threads[threadId];
  const msg = t?.messages.find((m) => m.id === messageId);
  if (!t || !msg) return;
  setState((s) => {
    const cur = s.threads[threadId];
    if (!cur) return s;
    const messages = cur.messages.map((m) => (m.id === messageId ? { ...m, draft: true, scheduledAt: undefined, unread: false } : m));
    return {
      ...s,
      threads: { ...s.threads, [threadId]: { ...cur, messages, inbox: hasIncoming({ ...cur, messages }) ? cur.inbox : false } },
      pending: s.pending.filter((p) => p.inReplyTo !== messageId),
    };
  });
  const replyMode = t.messages.length > 1 ? 'reply' : 'new';
  openCompose({ draftId: messageId, threadId, mode: replyMode });
  toast('Sending undone.');
}

export function cancelScheduled(messageId: string, threadId: string) {
  const t = getState().threads[threadId];
  if (!t) return;
  setState((s) => {
    const cur = s.threads[threadId];
    if (!cur) return s;
    const messages = cur.messages.map((m) => (m.id === messageId ? { ...m, draft: true, scheduledAt: undefined } : m));
    return { ...s, threads: { ...s.threads, [threadId]: { ...cur, messages } }, pending: s.pending.filter((p) => p.inReplyTo !== messageId) };
  });
  toast('Scheduled send canceled. The message was moved to Drafts.');
}

/* ---------- time-driven events: snooze, scheduled sends, simulated replies ---------- */

export interface TickEvent {
  kind: 'reply' | 'snooze' | 'scheduled' | 'incoming';
  threadId: string;
  from?: string;
}

const INCOMING_POOL: { from: string; subject: string; body: string }[] = [
  { from: 'tom', subject: 'quick favor', body: 'Can you take a 10 minute look at the investor deck before 3? Mostly the pricing slide. Thanks.\n\nSent from my phone' },
  { from: 'hannah', subject: 'Customer quote for the case study', body: 'Rachel signed off on the quote we discussed:\n\n> "The new onboarding cut our setup time in half."\n\nCan we put it above the fold on the case study page?\n\nHannah' },
  { from: 'kenji', subject: 'Staging is green again', body: 'Fixed the flaky migration and redeployed. Staging is green again, so you can retry the flow you were reviewing this morning.\n\nKenji' },
  { from: 'riley', subject: 'ok but have you seen this', body: 'Found the exact armchair. It is in the 1970s-dentist-waiting-room shade of orange. I need you to talk me out of it. Or into it.\n\nR' },
  { from: 'elena', subject: 'Funnel numbers, week over week', body: 'Fresh numbers are in the dashboard. Activation is up 4.2% since the new checklist shipped, which is a bigger lift than I expected.\n\nWorth a slide in Thursday\'s review?\n\nElena' },
  { from: 'linda', subject: 'Sunday', body: 'Are you coming Sunday? Dad is doing his famous risotto and I need a headcount. Bring Chloé if she is around!\n\nLove, Mom' },
];

let incomingCursor = 0;
let lastIncomingAt = Date.now();

function deliverPending(s: MailState, now: number, events: TickEvent[]): MailState {
  const due = s.pending.filter((p) => p.at <= now);
  if (!due.length) return s;
  const threads = { ...s.threads };
  for (const p of due) {
    const t = threads[p.threadId];
    const c = s.contacts.find((x) => x.id === p.contactId);
    if (!t || !c) continue;
    const orig = t.messages.find((m) => m.id === p.inReplyTo);
    if (!orig || !isDelivered(orig)) continue;
    const html = md(composeReply(c, orig));
    const reply: Message = {
      id: uid('m'),
      threadId: t.id,
      from: { name: c.name, email: c.email },
      to: [meAddress()],
      cc: [],
      bcc: [],
      date: p.at,
      html,
      quoteHtml: quoteFor(orig),
      text: htmlToText(html),
      attachments: [],
      unread: true,
      draft: false,
    };
    threads[t.id] = { ...t, messages: [...t.messages.filter((m) => !m.draft), reply, ...t.messages.filter((m) => m.draft)], inbox: true, trashed: false, trashedAt: undefined, snoozedUntil: undefined };
    events.push({ kind: 'reply', threadId: t.id, from: c.name });
  }
  return { ...s, threads, pending: s.pending.filter((p) => p.at > now) };
}

export function tick(now = Date.now()): TickEvent[] {
  const events: TickEvent[] = [];
  let s = getState();
  let threads = s.threads;
  const touch = () => {
    if (threads === s.threads) threads = { ...s.threads };
  };

  for (const t of Object.values(s.threads)) {
    // Snooze expiry
    if (t.snoozedUntil && t.snoozedUntil <= now) {
      touch();
      const delivered = deliveredMessages(t);
      const last = delivered[delivered.length - 1];
      threads[t.id] = {
        ...t,
        snoozedUntil: undefined,
        inbox: true,
        messages: t.messages.map((m) => (last && m.id === last.id ? { ...m, unread: true } : m)),
      };
      events.push({ kind: 'snooze', threadId: t.id });
      continue;
    }
    // Scheduled sends
    const due = t.messages.filter((m) => m.scheduledAt && m.scheduledAt <= now);
    if (due.length) {
      touch();
      const cur = threads[t.id];
      const messages = cur.messages
        .map((m) => (m.scheduledAt && m.scheduledAt <= now ? { ...m, date: m.scheduledAt, scheduledAt: undefined, unread: [...m.to, ...m.cc, ...m.bcc].some(isMeAddr) } : m))
        .sort((a, b) => (a.draft ? 1 : 0) - (b.draft ? 1 : 0) || a.date - b.date);
      threads[t.id] = { ...cur, messages };
      events.push({ kind: 'scheduled', threadId: t.id });
    }
    // Trash retention (30 days)
    if (t.trashed && t.trashedAt && now - t.trashedAt > 30 * DAY) {
      touch();
      delete threads[t.id];
    }
  }

  if (threads !== s.threads) {
    s = { ...s, threads };
    setState(() => s);
  }

  const afterReplies = deliverPending(getState(), now, events);
  if (afterReplies !== getState()) setState(() => afterReplies);

  // Optional simulated incoming mail.
  const cur = getState();
  if (cur.settings.simulateIncoming && now - lastIncomingAt > 75_000) {
    lastIncomingAt = now;
    const tpl = INCOMING_POOL[incomingCursor++ % INCOMING_POOL.length];
    const c = cur.contacts.find((x) => x.id === tpl.from);
    if (c) {
      const id = uid('t');
      const html = md(tpl.body);
      const msg: Message = {
        id: uid('m'),
        threadId: id,
        from: { name: c.name, email: c.email },
        to: [meAddress()],
        cc: [],
        bcc: [],
        date: now,
        html,
        text: htmlToText(html),
        attachments: [],
        unread: true,
        draft: false,
      };
      const thread: Thread = {
        id,
        subject: tpl.subject,
        messages: [msg],
        labelIds: c.org ? ['work'] : [],
        category: 'primary',
        inbox: true,
        starred: false,
        important: false,
        trashed: false,
        spam: false,
      };
      setState((st) => ({ ...st, threads: { ...st.threads, [id]: thread } }));
      events.push({ kind: 'incoming', threadId: id, from: c.name });
    }
  }
  return events;
}

/* ---------- compose entry points ---------- */

export function composeNew(seed?: { to?: Address[]; subject?: string }) {
  return openCompose({ mode: 'new', seed });
}

function subjectWith(prefix: 'Re: ' | 'Fwd: ', subject: string): string {
  const s = subject.trim();
  const re = prefix === 'Re: ' ? /^re:\s*/i : /^(fwd?|fw):\s*/i;
  return re.test(s) ? s : `${prefix}${s}`;
}

export function replyTargets(message: Message, all: boolean): { to: Address[]; cc: Address[] } {
  const replyToSelf = isMeAddr(message.from);
  const to: Address[] = replyToSelf ? [...message.to] : [message.from];
  let cc: Address[] = [];
  if (all) {
    const seen = new Set(to.map((a) => a.email.toLowerCase()));
    for (const a of [...message.to, ...message.cc]) {
      const e = a.email.toLowerCase();
      if (isMeAddr(a) || seen.has(e)) continue;
      seen.add(e);
      cc.push(a);
    }
    if (replyToSelf) cc = cc.filter((a) => !to.some((t) => t.email === a.email));
  }
  return { to, cc };
}

export function composeReplyTo(threadId: string, messageId: string, mode: 'reply' | 'replyAll' | 'forward', body?: string) {
  const t = getState().threads[threadId];
  const m = t?.messages.find((x) => x.id === messageId);
  if (!t || !m) return;
  const existingDraft = mode === 'forward' ? undefined : t.messages.find((x) => x.draft);
  if (existingDraft) {
    openCompose({ mode, threadId, draftId: existingDraft.id });
    return;
  }
  if (mode === 'forward') {
    const fwdHtml = `<div class="mail-quote-attr">---------- Forwarded message ---------<br>From: <strong>${m.from.name}</strong> &lt;${m.from.email}&gt;<br>Date: ${new Date(m.date).toLocaleString()}<br>Subject: ${t.subject}<br>To: ${m.to.map((a) => `${a.name || a.email}`).join(', ')}</div><blockquote>${m.html}</blockquote>`;
    // Forward creates a new thread so it never mixes into the source conversation.
    openCompose({
      mode,
      seed: { subject: subjectWith('Fwd: ', t.subject), quoteHtml: fwdHtml, attachments: m.attachments.map((a) => ({ ...a, id: uid('a') })) },
    });
    return;
  }
  const { to, cc } = replyTargets(m, mode === 'replyAll');
  openCompose({
    mode,
    threadId,
    seed: { to, cc, subject: subjectWith('Re: ', t.subject), quoteHtml: quoteFor(m), replyToMessageId: m.id, html: body ? `<div>${escapeHtml(body)}</div>` : undefined },
  });
}

export function closeComposeWindow(id: string) {
  closeCompose(id);
}

export function getContactSuggestions(state: MailState, query: string, exclude: Address[] = [], limit = 6): Address[] {
  const q = query.trim().toLowerCase();
  const freq = new Map<string, number>();
  for (const t of Object.values(state.threads)) {
    for (const m of t.messages) {
      if (isMeAddr(m.from)) for (const a of m.to) freq.set(a.email.toLowerCase(), (freq.get(a.email.toLowerCase()) ?? 0) + 2);
      else freq.set(m.from.email.toLowerCase(), (freq.get(m.from.email.toLowerCase()) ?? 0) + 1);
    }
  }
  const taken = new Set(exclude.map((a) => a.email.toLowerCase()));
  return state.contacts
    .filter((c) => !taken.has(c.email.toLowerCase()) && !c.email.startsWith('no-reply') && !c.email.startsWith('noreply'))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    .sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(q) || a.email.toLowerCase().startsWith(q) ? 1 : 0;
      const bs = b.name.toLowerCase().startsWith(q) || b.email.toLowerCase().startsWith(q) ? 1 : 0;
      return bs - as || (freq.get(b.email.toLowerCase()) ?? 0) - (freq.get(a.email.toLowerCase()) ?? 0);
    })
    .slice(0, limit)
    .map((c) => ({ name: c.name, email: c.email }));
}

