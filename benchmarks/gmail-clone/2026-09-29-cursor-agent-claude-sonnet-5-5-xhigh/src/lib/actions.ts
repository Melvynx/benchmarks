import type { Category, Draft, DraftKind, Route } from './types';
import { draftIsEmpty, useMail, type Undo } from './store';
import { useUI } from './ui';
import { currentRoute, navigate, withoutThread } from './router';
import { threadsInView } from './selectors';
import { htmlToText, isValidEmail, plural } from './text';
import { formatShortDateTime } from './date';

const ui = () => useUI.getState();
const mail = () => useMail.getState();

function conv(n: number): string {
  return n === 1 ? 'Conversation' : `${n} conversations`;
}

function offerUndo(text: string, undo: Undo) {
  ui().toast(text, [{ label: 'Undo', run: undo }]);
}

export function currentListRoute(): Route {
  return withoutThread(currentRoute());
}

function neighborId(threadId: string, dir: 'newer' | 'older'): string | null {
  const route = currentListRoute();
  const s = mail();
  const items = threadsInView(s, route, s.settings, Date.now()).filter((i) => i.kind === 'thread');
  const idx = items.findIndex((i) => i.id === threadId);
  if (idx < 0) return null;
  const n = items[dir === 'newer' ? idx - 1 : idx + 1];
  return n ? n.id : null;
}

export function goToList() {
  ui().clearSelection();
  navigate(currentListRoute());
}

export function openThread(id: string) {
  navigate({ ...currentListRoute(), threadId: id });
}

function afterRemoval(ids: string[]) {
  const route = currentRoute();
  if (!route.threadId || !ids.includes(route.threadId)) return;
  const pref = mail().settings.afterAction;
  const next = pref === 'list' ? null : neighborId(route.threadId, pref);
  if (next) navigate({ ...currentListRoute(), threadId: next });
  else goToList();
}

function targets(ids?: string[]): string[] {
  if (ids && ids.length) return ids;
  const route = currentRoute();
  if (route.threadId) return [route.threadId];
  return ui().selected;
}

export function archiveThreads(ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const next = currentRoute().threadId;
  const pref = mail().settings.afterAction;
  const neighbor = next && list.includes(next) && pref !== 'list' ? neighborId(next, pref) : null;
  const undo = mail().archive(list);
  ui().clearSelection();
  if (next && list.includes(next)) {
    if (neighbor) navigate({ ...currentListRoute(), threadId: neighbor });
    else goToList();
  }
  offerUndo(`${conv(list.length)} archived.`, undo);
}

export function moveToInbox(ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const undo = mail().moveToInbox(list);
  ui().clearSelection();
  afterRemoval(list);
  offerUndo(`${conv(list.length)} moved to Inbox.`, undo);
}

export function trashThreads(ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const route = currentRoute();
  const neighbor = route.threadId && list.includes(route.threadId) && mail().settings.afterAction !== 'list' ? neighborId(route.threadId, mail().settings.afterAction as 'newer' | 'older') : null;
  const undo = mail().trash(list);
  ui().clearSelection();
  if (route.threadId && list.includes(route.threadId)) {
    if (neighbor) navigate({ ...currentListRoute(), threadId: neighbor });
    else goToList();
  }
  offerUndo(`${conv(list.length)} moved to Trash.`, undo);
}

export function deleteForever(ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  ui().set({
    confirm: {
      title: 'Delete forever?',
      body: `${plural(list.length, 'conversation')} will be permanently deleted. This can't be undone from the trash.`,
      confirmLabel: 'Delete forever',
      onConfirm: () => {
        const undo = mail().deleteForever(list);
        ui().clearSelection();
        afterRemoval(list);
        offerUndo(`${conv(list.length)} deleted forever.`, undo);
      },
    },
  });
}

export function emptyFolder(kind: 'trash' | 'spam') {
  const s = mail();
  const count = Object.values(s.threads).filter((t) => (kind === 'trash' ? t.trashed : t.spam && !t.trashed)).length;
  if (!count) return;
  ui().set({
    confirm: {
      title: kind === 'trash' ? 'Empty Trash now?' : 'Delete all spam now?',
      body: `All ${plural(count, 'conversation')} in ${kind === 'trash' ? 'Trash' : 'Spam'} will be permanently deleted.`,
      confirmLabel: 'Delete forever',
      onConfirm: () => {
        const undo = mail().emptyFolder(kind);
        offerUndo(`${kind === 'trash' ? 'Trash' : 'Spam'} emptied.`, undo);
      },
    },
  });
}

export function spamThreads(ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const undo = mail().markSpam(list);
  ui().clearSelection();
  afterRemoval(list);
  offerUndo(`${conv(list.length)} reported as spam.`, undo);
}

export function notSpamThreads(ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const undo = mail().markNotSpam(list);
  ui().clearSelection();
  afterRemoval(list);
  offerUndo(`${conv(list.length)} marked as not spam and moved to Inbox.`, undo);
}

export function markRead(read: boolean, ids?: string[], opts: { toast?: boolean; leave?: boolean } = {}) {
  const list = targets(ids);
  if (!list.length) return;
  const undo = mail().markRead(list, read);
  if (opts.leave) {
    ui().clearSelection();
    goToList();
  }
  if (opts.toast !== false) offerUndo(read ? `Marked ${plural(list.length, 'conversation')} as read.` : `Marked ${plural(list.length, 'conversation')} as unread.`, undo);
}

export function toggleStar(id: string) {
  mail().toggleStarThread(id);
}

export function starThreads(on: boolean, ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const undo = mail().setStarThreads(list, on);
  offerUndo(on ? `Starred ${plural(list.length, 'conversation')}.` : `Removed star from ${plural(list.length, 'conversation')}.`, undo);
}

export function setImportant(on: boolean, ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const undo = mail().setImportant(list, on);
  offerUndo(on ? 'Marked as important.' : 'Marked as not important.', undo);
}

export function applyLabel(labelId: string, on: boolean, ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const name = mail().labels.find((l) => l.id === labelId)?.name ?? 'label';
  const undo = mail().applyLabel(list, labelId, on);
  offerUndo(on ? `Applied label “${name}”.` : `Removed label “${name}”.`, undo);
}

export function snoozeThreads(until: number, ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const undo = mail().snooze(list, until);
  ui().clearSelection();
  afterRemoval(list);
  offerUndo(`${conv(list.length)} snoozed until ${formatShortDateTime(until)}.`, undo);
}

export function unsnoozeThreads(ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const undo = mail().unsnooze(list);
  ui().clearSelection();
  offerUndo('Snooze removed. Moved to Inbox.', undo);
}

export function moveToCategory(cat: Category, ids?: string[]) {
  const list = targets(ids);
  if (!list.length) return;
  const undo = mail().moveToCategory(list, cat);
  ui().clearSelection();
  offerUndo(`Moved to ${cat[0].toUpperCase() + cat.slice(1)}.`, undo);
}

export function deleteMessage(messageId: string) {
  const undo = mail().deleteMessage(messageId);
  offerUndo('Message moved to Trash.', undo);
  const route = currentRoute();
  if (route.threadId && !mail().threads[route.threadId]?.messageIds.length) goToList();
}

// ---------------------------------------------------------------- compose

export function composeNew(init: Partial<Draft> = {}): string {
  const id = mail().createDraft(init);
  ui().openCompose(id);
  return id;
}

export function openDraftItem(draftId: string) {
  const d = mail().drafts[draftId];
  if (!d) return;
  if (d.sendAt) {
    mail().cancelSend(draftId);
    ui().toast('Scheduled send cancelled. Message moved to Drafts.');
  }
  if (d.mode === 'inline' && d.threadId && mail().threads[d.threadId]) {
    navigate({ view: 'inbox', threadId: d.threadId });
    return;
  }
  ui().openCompose(draftId);
}

export function replyTo(kind: DraftKind, threadId?: string, messageId?: string) {
  const tid = threadId ?? currentRoute().threadId;
  if (!tid) return;
  const id = mail().startReply(tid, kind, messageId);
  const d = mail().drafts[id];
  if (d.mode === 'window') ui().openCompose(id);
  useUI.setState({ cursor: null });
  window.dispatchEvent(new CustomEvent('inline-reply-focus', { detail: id }));
}

export function popOutDraft(draftId: string) {
  mail().updateDraft(draftId, { mode: 'window' });
  ui().openCompose(draftId);
}

export function closeCompose(draftId: string) {
  const s = mail();
  const d = s.drafts[draftId];
  ui().closeComposeWindow(draftId);
  if (!d) return;
  if (draftIsEmpty(d, s.settings.signatureEnabled ? s.settings.signature : '')) {
    mail().discardDraft(draftId);
  } else if (!d.sendAt) {
    ui().toast('Draft saved.');
  }
}

export function discardCompose(draftId: string, opts: { silent?: boolean } = {}) {
  const d = mail().drafts[draftId];
  ui().closeComposeWindow(draftId);
  const undo = mail().discardDraft(draftId);
  if (!opts.silent && d) {
    ui().toast('Draft discarded.', [
      {
        label: 'Undo',
        run: () => {
          undo();
          if (d.mode === 'window') ui().openCompose(draftId);
        },
      },
    ]);
  }
}

function alertDialog(title: string, body: string) {
  ui().set({ confirm: { title, body, confirmLabel: 'OK', cancelLabel: '', onConfirm: () => undefined } });
}

export function requestSend(draftId: string, opts: { sendAt?: number; skipChecks?: boolean } = {}) {
  const s = mail();
  const d = s.drafts[draftId];
  if (!d) return;
  const recipients = [...d.to, ...d.cc, ...d.bcc];
  if (!recipients.length) {
    alertDialog('Add a recipient', 'Please specify at least one recipient before sending.');
    return;
  }
  const bad = recipients.find((p) => !isValidEmail(p.email));
  if (bad) {
    alertDialog('Check the recipient', `“${bad.email}” doesn’t look like a valid email address. Fix or remove it, then try again.`);
    return;
  }
  if (!opts.skipChecks) {
    const bodyText = htmlToText(d.html).replace(/^--\s*/m, '');
    const sigText = s.settings.signatureEnabled ? s.settings.signature.replace(/\n/g, ' ') : '';
    const hasBody = bodyText.replace(sigText, '').replace(/\s+/g, '').length > 0;
    if (!d.subject.trim() && !hasBody) {
      ui().set({
        confirm: {
          title: 'Send this message without a subject or text in the body?',
          body: 'It looks like this message is empty.',
          confirmLabel: 'Send anyway',
          cancelLabel: 'Cancel',
          onConfirm: () => requestSend(draftId, { ...opts, skipChecks: true }),
        },
      });
      return;
    }
    if (/\b(attached|attaching|attachment|enclosed)\b/i.test(bodyText) && d.attachments.length === 0) {
      ui().set({
        confirm: {
          title: 'Did you forget to attach a file?',
          body: 'You mentioned an attachment in your message, but nothing is attached.',
          confirmLabel: 'Send anyway',
          cancelLabel: 'Go back',
          onConfirm: () => requestSend(draftId, { ...opts, skipChecks: true }),
        },
      });
      return;
    }
  }

  ui().closeComposeWindow(draftId);

  if (opts.sendAt) {
    mail().scheduleDraft(draftId, opts.sendAt);
    ui().toast(`Scheduled for ${formatShortDateTime(opts.sendAt)}.`, [
      {
        label: 'Undo',
        run: () => {
          mail().cancelSend(draftId);
          if (d.mode === 'inline' && d.threadId) navigate({ view: 'inbox', threadId: d.threadId });
          else ui().openCompose(draftId);
        },
      },
      { label: 'View', run: () => navigate({ view: 'scheduled' }) },
    ]);
    return;
  }

  const res = mail().sendDraft(draftId);
  if (!res) return;
  const seconds = mail().settings.undoSendSeconds;
  const actions: { label: string; run: () => void }[] = [];
  if (seconds > 0) {
    actions.push({
      label: 'Undo',
      run: () => {
        res.undo();
        if (d.mode === 'inline' && d.threadId && mail().threads[d.threadId]) navigate({ view: 'inbox', threadId: d.threadId });
        else ui().openCompose(draftId);
      },
    });
  }
  actions.push({
    label: 'View message',
    run: () => {
      const view = currentRoute().view;
      navigate({ view: view === 'search' || view === 'label' ? 'all' : view === 'sent' || view === 'inbox' ? view : 'all', threadId: res.threadId });
    },
  });
  ui().toast('Message sent.', actions, Math.max(seconds, 5) * 1000);
}

export function markAllVisible(items: string[], select: boolean) {
  ui().select(select ? items : []);
}
