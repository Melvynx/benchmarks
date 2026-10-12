import type { Contact, Draft, Message, Thread } from '../data/types';
import { ME } from '../data/seed';
import { useMail } from '../store/mail';
import { useUI } from '../store/ui';
import { TIME, escapeHtml, messageDate, scheduleLabel } from './format';
import { rowsForRoute } from '../store/selectors';
import { getRoute, listRoute, navigate, withThread, type Route } from './router';

export type BulkAction =
  | 'archive' | 'inbox' | 'trash' | 'deleteForever' | 'spam' | 'notSpam' | 'read' | 'unread' | 'star' | 'unstar'
  | 'important' | 'notImportant' | 'mute' | 'unmute' | 'unsnooze';

function noun(n: number) {
  return n === 1 ? 'Conversation' : `${n} conversations`;
}

function withUndo(ids: string[], message: string) {
  const mail = useMail.getState();
  const snap = mail.snapshot(ids);
  return () => {
    useUI.getState().showToast(message, [
      {
        label: 'Undo',
        run: () => {
          useMail.getState().restore(snap);
          useUI.getState().showToast('Action undone.');
        },
      },
    ]);
  };
}

/** Actions that move the conversation out of the current list, so an open thread should close. */
const LEAVES_VIEW: BulkAction[] = ['archive', 'trash', 'deleteForever', 'spam', 'notSpam', 'mute', 'inbox', 'unsnooze'];

export function runAction(ids: string[], action: BulkAction) {
  if (!ids.length) return;
  const mail = useMail.getState();
  const n = ids.length;
  const messages: Partial<Record<BulkAction, string>> = {
    archive: `${noun(n)} archived.`,
    inbox: `${noun(n)} moved to Inbox.`,
    trash: `${noun(n)} moved to Trash.`,
    deleteForever: `${noun(n)} deleted forever.`,
    spam: `${noun(n)} marked as spam.`,
    notSpam: `${noun(n)} unmarked as spam and moved to Inbox.`,
    read: n > 1 ? `${noun(n)} marked as read.` : undefined,
    unread: `${noun(n)} marked as unread.`,
    important: `${noun(n)} marked as important.`,
    notImportant: `${noun(n)} marked as not important.`,
    mute: `${noun(n)} muted.`,
    unmute: `${noun(n)} unmuted.`,
    unsnooze: `${noun(n)} unsnoozed.`,
  };
  const announce = messages[action] ? withUndo(ids, messages[action]!) : null;
  const target = LEAVES_VIEW.includes(action) || action === 'unread' ? exitTarget(ids) : null;
  switch (action) {
    case 'archive': mail.archive(ids); break;
    case 'inbox': mail.moveToInbox(ids); break;
    case 'trash': mail.trash(ids); break;
    case 'deleteForever': mail.deleteForever(ids); break;
    case 'spam': mail.reportSpam(ids); break;
    case 'notSpam': mail.notSpam(ids); break;
    case 'read': mail.setUnread(ids, false); break;
    case 'unread': mail.setUnread(ids, true); break;
    case 'star': mail.setStarred(ids, true); break;
    case 'unstar': mail.setStarred(ids, false); break;
    case 'important': mail.setImportant(ids, true); break;
    case 'notImportant': mail.setImportant(ids, false); break;
    case 'mute': mail.setMuted(ids, true); break;
    case 'unmute': mail.setMuted(ids, false); break;
    case 'unsnooze': mail.unsnooze(ids); break;
  }
  announce?.();
  useUI.getState().clearSelection();
  leave(action === 'unread' && target?.view !== 'settings' && target?.threadId ? listRoute(target) : target);
}

/** Where to go after the open conversation leaves the list: back to the list, or auto-advance. */
function exitTarget(ids: string[]): Route | null {
  const route = getRoute();
  if (route.view === 'settings' || !route.threadId || !ids.includes(route.threadId)) return null;
  const mail = useMail.getState();
  const adv = mail.settings.autoAdvance;
  if (adv !== 'list') {
    const rows = rowsForRoute(mail, listRoute(route), Date.now()).filter((r) => r.kind === 'thread');
    const i = rows.findIndex((r) => r.id === route.threadId);
    const step = adv === 'newer' ? -1 : 1;
    for (let j = i + step; i >= 0 && j >= 0 && j < rows.length; j += step) {
      if (!ids.includes(rows[j].id)) return withThread(route, rows[j].id);
    }
  }
  return listRoute(route);
}

function leave(target: Route | null) {
  if (!target) return;
  if (target.view !== 'settings' && target.threadId) openThread(target.threadId, target);
  else navigate(target);
}

export function toggleStar(t: Thread) {
  useMail.getState().setStarred([t.id], !t.starred);
}

export function setLabel(ids: string[], labelId: string, on: boolean, quiet = false) {
  const mail = useMail.getState();
  const label = mail.labels.find((l) => l.id === labelId);
  const announce = withUndo(ids, on ? `${noun(ids.length)} added to "${label?.name}".` : `${noun(ids.length)} removed from "${label?.name}".`);
  mail.setLabel(ids, labelId, on);
  if (!quiet) announce();
}

export type MoveTarget = 'inbox' | 'trash' | 'spam' | { labelId: string };

export function moveTo(ids: string[], target: MoveTarget) {
  if (target === 'inbox') return runAction(ids, 'inbox');
  if (target === 'trash') return runAction(ids, 'trash');
  if (target === 'spam') return runAction(ids, 'spam');
  const mail = useMail.getState();
  const label = mail.labels.find((l) => l.id === target.labelId);
  const announce = withUndo(ids, `${noun(ids.length)} moved to "${label?.name}".`);
  const exit = exitTarget(ids);
  mail.moveToLabel(ids, target.labelId);
  announce();
  useUI.getState().clearSelection();
  leave(exit);
}

export function snooze(ids: string[], until: number) {
  const mail = useMail.getState();
  const announce = withUndo(ids, `${noun(ids.length)} snoozed until ${scheduleLabel(until)}.`);
  const exit = exitTarget(ids);
  mail.snooze(ids, until);
  announce();
  useUI.getState().clearSelection();
  leave(exit);
}

export function openThread(threadId: string, base: Route = getRoute()) {
  const route = base;
  const mail = useMail.getState();
  if (mail.threads[threadId]?.unread) mail.setUnread([threadId], false);
  useUI.getState().setCursor(threadId);
  navigate(withThread(route, threadId));
}

/* ---------------- Time presets ---------------- */

function atTime(base: Date, h: number, m = 0) {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export interface Preset {
  id: string;
  label: string;
  at: number;
}

export function snoozePresets(now = Date.now()): Preset[] {
  const n = new Date(now);
  const out: Preset[] = [];
  const laterToday = atTime(n, 18);
  if (laterToday.getTime() - now > TIME.HOUR) out.push({ id: 'later', label: 'Later today', at: laterToday.getTime() });
  else out.push({ id: 'later', label: 'Later today', at: now + 3 * TIME.HOUR });
  const tomorrow = atTime(new Date(now + TIME.DAY), 8);
  out.push({ id: 'tomorrow', label: 'Tomorrow', at: tomorrow.getTime() });
  const day = n.getDay();
  if (day !== 6 && day !== 0 && day !== 5) {
    const sat = atTime(new Date(now + ((6 - day + 7) % 7) * TIME.DAY), 8);
    out.push({ id: 'weekend', label: 'This weekend', at: sat.getTime() });
  }
  const mon = atTime(new Date(now + (((8 - day) % 7) || 7) * TIME.DAY), 8);
  out.push({ id: 'nextweek', label: 'Next week', at: mon.getTime() });
  return out;
}

export function schedulePresets(now = Date.now()): Preset[] {
  const tomorrow = new Date(now + TIME.DAY);
  const day = new Date(now).getDay();
  const mon = atTime(new Date(now + (((8 - day) % 7) || 7) * TIME.DAY), 8);
  return [
    { id: 'tm', label: 'Tomorrow morning', at: atTime(tomorrow, 8).getTime() },
    { id: 'ta', label: 'Tomorrow afternoon', at: atTime(tomorrow, 13).getTime() },
    { id: 'mon', label: 'Monday morning', at: mon.getTime() },
  ];
}

/* ---------------- Compose ---------------- */

function signatureHtml(): string {
  const sig = useMail.getState().settings.signature.trim();
  if (!sig) return '';
  return `<div><br></div><div>-- <br>${sig.split('\n').map(escapeHtml).join('<br>')}</div>`;
}

export function composeNew(init: Partial<Draft> = {}) {
  const mail = useMail.getState();
  const draft = mail.createDraft({ html: `<div><br></div>${signatureHtml()}`, ...init });
  useUI.getState().openCompose(draft.id);
  return draft;
}

export function openDraft(draftId: string) {
  const d = useMail.getState().drafts[draftId];
  if (!d) return;
  if (d.threadId && useMail.getState().threads[d.threadId]) {
    // Reply drafts open inline inside their conversation, like Gmail.
    navigate({ view: 'folder', folder: 'drafts', threadId: d.threadId });
    return;
  }
  useUI.getState().openCompose(draftId);
}

function quoteBlock(m: Message) {
  const who = m.from.name ? `${escapeHtml(m.from.name)} &lt;${escapeHtml(m.from.email)}&gt;` : escapeHtml(m.from.email);
  return `<div>On ${escapeHtml(messageDate(m.date).replace(/ \(.*\)$/, ''))}, ${who} wrote:</div><blockquote>${m.html}</blockquote>`;
}

function forwardBlock(m: Message, subject: string) {
  const fmt = (c: Contact) => (c.name ? `${escapeHtml(c.name)} &lt;${escapeHtml(c.email)}&gt;` : escapeHtml(c.email));
  return (
    `<div>---------- Forwarded message ---------</div>` +
    `<div>From: <b>${fmt(m.from)}</b></div>` +
    `<div>Date: ${escapeHtml(messageDate(m.date).replace(/ \(.*\)$/, ''))}</div>` +
    `<div>Subject: ${escapeHtml(subject)}</div>` +
    `<div>To: ${m.to.map(fmt).join(', ')}</div><br>${m.html}`
  );
}

const isMe = (c: Contact) => c.email.toLowerCase() === ME.email;

function dedupe(list: Contact[]) {
  const seen = new Set<string>();
  return list.filter((c) => {
    const k = c.email.toLowerCase();
    if (seen.has(k) || isMe(c)) return false;
    seen.add(k);
    return true;
  });
}

export function startReply(threadId: string, mode: 'reply' | 'replyAll' | 'forward', messageId?: string, bodyText?: string) {
  const mail = useMail.getState();
  const t = mail.threads[threadId];
  if (!t) return null;
  const m = t.messages.find((x) => x.id === messageId) ?? [...t.messages].reverse().find((x) => !isMe(x.from)) ?? t.messages[t.messages.length - 1];
  const existing = Object.values(mail.drafts).find((d) => d.threadId === threadId && !d.scheduledAt && !d.outgoing);
  if (existing && mode !== 'forward') {
    useUI.getState().closeComposeForDraft(existing.id);
    return existing;
  }
  const baseSubject = t.subject.replace(/^(re|fwd?):\s*/i, '');
  let to: Contact[] = [];
  let cc: Contact[] = [];
  if (mode === 'reply') to = isMe(m.from) ? m.to : [m.from];
  if (mode === 'replyAll') {
    to = dedupe(isMe(m.from) ? m.to : [m.from, ...m.to]);
    cc = dedupe(m.cc).filter((c) => !to.some((x) => x.email === c.email));
  }
  const body = bodyText ? `<div>${escapeHtml(bodyText)}</div>` : '<div><br></div>';
  const draft = mail.createDraft({
    threadId,
    mode,
    to,
    cc,
    subject: mode === 'forward' ? `Fwd: ${baseSubject}` : `Re: ${baseSubject}`,
    html: `${body}${signatureHtml()}`,
    quoted: mode === 'forward' ? forwardBlock(m, t.subject) : quoteBlock(m),
    attachments: mode === 'forward' ? m.attachments : [],
  });
  return draft;
}

export function sendWithUndo(draftId: string) {
  const mail = useMail.getState();
  const ui = useUI.getState();
  const delay = Math.max(0, mail.settings.undoSeconds) * 1000;
  ui.closeComposeForDraft(draftId);
  if (!delay) {
    const threadId = mail.sendDraft(draftId);
    if (threadId) ui.showToast('Message sent', [{ label: 'View message', run: () => viewSent(threadId) }]);
    return;
  }
  mail.queueSend(draftId, Date.now() + delay);
  ui.showToast(
    'Message sent',
    [
      {
        label: 'Undo',
        run: () => {
          const d = useMail.getState().drafts[draftId];
          if (!d) {
            useUI.getState().showToast('Too late to undo — the message was already sent.');
            return;
          }
          useMail.getState().unscheduleDraft(draftId);
          useUI.getState().showToast('Sending undone.');
          if (!d.threadId) useUI.getState().openCompose(draftId);
          else navigate(withThread(listRoute(getRoute()), d.threadId));
        },
      },
      {
        label: 'View message',
        run: () => {
          const threadId = useMail.getState().drafts[draftId] ? useMail.getState().sendDraft(draftId) : lastSentThread;
          if (threadId) viewSent(threadId);
        },
      },
    ],
    delay + 400,
  );
}

let lastSentThread: string | null = null;

/** Called by the ticker when an undo-window send completes. */
export function onSendCompleted(threadId: string) {
  lastSentThread = threadId;
  const ui = useUI.getState();
  if (ui.toast?.message === 'Message sent') {
    ui.showToast('Message sent', [{ label: 'View message', run: () => viewSent(threadId) }], 5000);
  }
}

export function viewSent(threadId: string) {
  navigate({ view: 'folder', folder: 'sent', threadId });
}

export function scheduleSend(draftId: string, at: number) {
  const mail = useMail.getState();
  mail.scheduleDraft(draftId, at);
  useUI.getState().closeComposeForDraft(draftId);
  useUI.getState().showToast(`Send scheduled for ${scheduleLabel(at)}`, [
    {
      label: 'Undo',
      run: () => {
        useMail.getState().unscheduleDraft(draftId);
        const d = useMail.getState().drafts[draftId];
        if (d && !d.threadId) useUI.getState().openCompose(draftId);
      },
    },
    { label: 'View message', run: () => navigate({ view: 'folder', folder: 'scheduled' }) },
  ]);
}

export function discardDraft(draftId: string) {
  const mail = useMail.getState();
  const d = mail.drafts[draftId];
  if (!d) return;
  mail.deleteDraft(draftId);
  useUI.getState().closeComposeForDraft(draftId);
  useUI.getState().showToast('Draft discarded.', [
    {
      label: 'Undo',
      run: () => {
        useMail.getState().restoreDraft(d);
        if (!d.threadId) useUI.getState().openCompose(d.id);
      },
    },
  ]);
}

export function discardDrafts(ids: string[]) {
  const mail = useMail.getState();
  const saved = ids.map((id) => mail.drafts[id]).filter(Boolean) as Draft[];
  for (const d of saved) mail.deleteDraft(d.id);
  useUI.getState().clearSelection();
  useUI.getState().showToast(saved.length === 1 ? 'Draft discarded.' : `${saved.length} drafts discarded.`, [
    { label: 'Undo', run: () => saved.forEach((d) => useMail.getState().restoreDraft(d)) },
  ]);
}

export function cancelScheduled(draftId: string) {
  const mail = useMail.getState();
  const d = mail.drafts[draftId];
  if (!d) return;
  mail.unscheduleDraft(draftId);
  useUI.getState().showToast('Send cancelled. Message saved to Drafts.');
  if (d.threadId && mail.threads[d.threadId]) navigate({ view: 'folder', folder: 'drafts', threadId: d.threadId });
  else useUI.getState().openCompose(draftId);
}

export function composeTo(c: Contact) {
  composeNew({ to: [c] });
}
