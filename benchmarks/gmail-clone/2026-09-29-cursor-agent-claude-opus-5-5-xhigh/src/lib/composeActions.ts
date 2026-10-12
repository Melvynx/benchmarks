import type { ComposeMode, DraftFields, Person, Thread } from '../types';
import { isMobileNow } from '../hooks';
import { MY_EMAIL, useMail } from '../store/mail';
import { useSettings } from '../store/settings';
import { showToast, ui, type ComposeWin } from '../store/ui';
import { emptyBody, fieldsFromDraft, isEmptyDraft, replyFields } from './compose';
import { formatFuture } from './date';
import { navigate } from './router';
import { uid } from './utils';

export function me(): Person {
  return { name: useSettings.getState().displayName || 'Alex Rivera', email: MY_EMAIL };
}

function pushWindow(win: ComposeWin) {
  const { composes } = ui.get();
  const existing = composes.find((c) => c.draftId === win.draftId);
  if (existing) {
    ui.set({ composes: composes.map((c) => (c.id === existing.id ? { ...c, minimized: false } : c)) });
    return;
  }
  let next = [...composes.map((c) => ({ ...c, maximized: false })), win];
  if (next.length > 3) next = next.slice(-3);
  ui.set({ composes: next, drawerOpen: false });
}

export function openCompose(initial: Partial<DraftFields> = {}) {
  const sig = useSettings.getState().signature;
  const fields: DraftFields = { to: [], cc: [], bcc: [], subject: '', body: emptyBody(sig), attachments: [], ...initial };
  pushWindow({
    id: uid('cw'),
    threadId: uid('t'),
    draftId: uid('m'),
    mode: 'new',
    isNewThread: true,
    minimized: false,
    maximized: false,
    initial: fields,
    focus: fields.to.length ? (fields.subject ? 'body' : 'subject') : 'to',
  });
}

export function openDraft(thread: Thread) {
  const draft = thread.messages.find((m) => m.status === 'draft');
  if (!draft) return;
  const onlyDrafts = thread.messages.every((m) => m.status === 'draft');
  if (onlyDrafts || isMobileNow()) {
    pushWindow({
      id: uid('cw'),
      threadId: thread.id,
      draftId: draft.id,
      mode: draft.replyMode ?? 'new',
      isNewThread: onlyDrafts,
      minimized: false,
      maximized: false,
      initial: fieldsFromDraft(draft, onlyDrafts ? thread.subject : draft.replyMode === 'forward' ? `Fwd: ${thread.subject}` : `Re: ${thread.subject}`),
      focus: 'body',
    });
    return;
  }
  navigate({ view: 'folder', folder: 'drafts', threadId: thread.id });
}

export function openReply(threadId: string, mode: ComposeMode, sourceMessageId?: string, opts: { passive?: boolean } = {}) {
  const t = useMail.getState().threads[threadId];
  if (!t) return;
  const settings = useSettings.getState();
  const existing = t.messages.find((m) => m.status === 'draft');
  const source = sourceMessageId ? t.messages.find((m) => m.id === sourceMessageId) : undefined;
  const draftId = existing?.id ?? uid('m');
  const fields = existing && !source ? fieldsFromDraft(existing, existing.replyMode === 'forward' ? `Fwd: ${t.subject}` : `Re: ${t.subject}`) : replyFields(t, mode, MY_EMAIL, settings.signature, source);
  const effectiveMode = existing && !source ? (existing.replyMode ?? mode) : mode;
  if (isMobileNow()) {
    pushWindow({ id: uid('cw'), threadId, draftId, mode: effectiveMode, isNewThread: false, minimized: false, maximized: false, initial: fields, focus: mode === 'forward' ? 'to' : 'body' });
    return;
  }
  ui.set({ inline: { threadId, draftId, mode: effectiveMode, initial: fields, key: uid('ir'), passive: opts.passive } });
}

export function popOutInline(fields: DraftFields) {
  const inline = ui.get().inline;
  if (!inline) return;
  ui.set({ inline: null });
  pushWindow({ id: uid('cw'), threadId: inline.threadId, draftId: inline.draftId, mode: inline.mode, isNewThread: false, minimized: false, maximized: false, initial: fields, focus: 'body' });
}

export function closeWindow(id: string) {
  ui.set({ composes: ui.get().composes.filter((c) => c.id !== id) });
}

export function updateWindow(id: string, patch: Partial<ComposeWin>) {
  ui.set({ composes: ui.get().composes.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}

export function saveDraftNow(threadId: string, draftId: string, fields: DraftFields, mode: ComposeMode) {
  const sig = useSettings.getState().signature;
  const mail = useMail.getState();
  const exists = mail.threads[threadId]?.messages.some((m) => m.id === draftId);
  if (isEmptyDraft(fields, sig)) {
    if (exists) mail.discardDraft(threadId, draftId);
    return false;
  }
  mail.saveDraft({ threadId, messageId: draftId, from: me(), fields, mode });
  return true;
}

export function sendDraft(p: { threadId: string; draftId: string; fields: DraftFields; mode: ComposeMode; scheduledAt?: number; reopen: () => void }) {
  const mail = useMail.getState();
  const settings = useSettings.getState();
  mail.saveDraft({ threadId: p.threadId, messageId: p.draftId, from: me(), fields: p.fields, mode: p.mode });
  const snap = useMail.getState().snapshot([p.threadId]);
  useMail.getState().send(p.threadId, p.draftId, { scheduledAt: p.scheduledAt, simulate: settings.simulateActivity });
  showToast(p.scheduledAt ? `Send scheduled for ${formatFuture(p.scheduledAt)}` : 'Message sent', {
    duration: settings.undoSeconds * 1000,
    undo: () => {
      useMail.getState().restore(snap);
      p.reopen();
    },
    action: {
      label: 'View message',
      run: () => navigate({ view: 'folder', folder: p.scheduledAt ? 'scheduled' : 'sent', threadId: p.threadId }),
    },
  });
}

export function reopenWindow(win: Omit<ComposeWin, 'id'>) {
  pushWindow({ ...win, id: uid('cw'), minimized: false });
}
