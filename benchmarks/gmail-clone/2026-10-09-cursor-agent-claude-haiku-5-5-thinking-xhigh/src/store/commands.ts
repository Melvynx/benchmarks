import { forwardDraft, newDraft, replyDraft } from '../domain/drafts';
import type { Thread } from '../domain/types';
import { uid } from '../lib/ids';
import * as actions from './actions';
import { useUI, type FloatingMenu } from './uiStore';

/*
 * User-level commands shared by the toolbar, rows, thread view and keyboard shortcuts.
 * Each one applies the change, clears selection and offers an undo toast where it makes sense.
 */

const countLabel = (ids: string[], one: string, many: string) =>
  ids.length === 1 ? one : `${ids.length} ${many}`;

function finish(ids: string[], message: string, undo?: () => void): void {
  const ui = useUI.getState();
  ui.setSelected(ui.selected.filter((id) => !ids.includes(id)));
  ui.toast({ message, actionLabel: undo ? 'Undo' : undefined, onAction: undo, duration: 6000 });
}

export function archiveThreads(ids: string[]): void {
  if (!ids.length) return;
  const snap = actions.snapshotThreads(ids);
  actions.moveTo(ids, 'archive');
  finish(ids, countLabel(ids, 'Conversation archived', 'conversations archived'), () => actions.restoreThreads(snap));
}

export function trashThreads(ids: string[]): void {
  if (!ids.length) return;
  const snap = actions.snapshotThreads(ids);
  actions.moveTo(ids, 'trash');
  finish(ids, countLabel(ids, 'Conversation moved to Trash', 'conversations moved to Trash'), () =>
    actions.restoreThreads(snap),
  );
}

export function reportSpam(ids: string[]): void {
  if (!ids.length) return;
  const snap = actions.snapshotThreads(ids);
  actions.moveTo(ids, 'spam');
  finish(ids, countLabel(ids, 'Conversation moved to Spam', 'conversations moved to Spam'), () =>
    actions.restoreThreads(snap),
  );
}

export function moveToInbox(ids: string[]): void {
  if (!ids.length) return;
  const snap = actions.snapshotThreads(ids);
  actions.moveTo(ids, 'inbox');
  finish(ids, 'Moved to Inbox', () => actions.restoreThreads(snap));
}

export function deleteForever(ids: string[]): void {
  if (!ids.length) return;
  actions.removeThreads(ids);
  finish(ids, 'Conversation deleted forever');
}

export function setReadState(ids: string[], read: boolean): void {
  if (!ids.length) return;
  actions.setRead(ids, read);
  useUI.getState().setSelected(useUI.getState().selected.filter((id) => !ids.includes(id)));
}

export function toggleReadState(ids: string[]): void {
  const threads = actions.getData().threads.filter((t) => ids.includes(t.id));
  const allRead = threads.every((t) => t.messages.every((m) => !m.unread));
  setReadState(ids, !allRead);
}

export function toggleStar(ids: string[]): void {
  if (!ids.length) return;
  const threads = actions.getData().threads.filter((t) => ids.includes(t.id));
  actions.setStarred(ids, !threads.every((t) => t.starred));
}

export function snoozeThreads(ids: string[], until: number, label: string): void {
  if (!ids.length) return;
  const snap = actions.snapshotThreads(ids);
  actions.snooze(ids, until);
  finish(ids, `Snoozed until ${label}`, () => actions.restoreThreads(snap));
}

export function unsnoozeThreads(ids: string[]): void {
  if (!ids.length) return;
  const snap = actions.snapshotThreads(ids);
  actions.snooze(ids, null);
  finish(ids, 'Snooze removed', () => actions.restoreThreads(snap));
}

export function applyLabel(ids: string[], labelId: string, on: boolean): void {
  if (!ids.length) return;
  actions.toggleLabel(ids, labelId, on);
}

export function openMenu(menu: FloatingMenu): void {
  useUI.getState().openMenu(menu);
}

export function startNewCompose(): void {
  const data = actions.getData();
  const draft = newDraft(uid('draft'), data.settings.signature, Date.now());
  actions.saveDraft(draft);
  useUI.getState().openCompose(draft.id);
}

export function startReplyCompose(thread: Thread, mode: 'reply' | 'replyAll'): string {
  const data = actions.getData();
  const existing = data.drafts.find(
    (d) => d.threadId === thread.id && (d.mode === 'reply' || d.mode === 'replyAll'),
  );
  if (existing) return existing.id;
  const draft = replyDraft(uid('draft'), thread, mode, data.account, Date.now());
  actions.saveDraft(draft);
  return draft.id;
}

export function startForwardCompose(thread: Thread): void {
  const draft = forwardDraft(uid('draft'), thread, Date.now());
  actions.saveDraft(draft);
  useUI.getState().openCompose(draft.id);
}

export function reopenDraft(draftId: string): void {
  useUI.getState().openCompose(draftId);
}
