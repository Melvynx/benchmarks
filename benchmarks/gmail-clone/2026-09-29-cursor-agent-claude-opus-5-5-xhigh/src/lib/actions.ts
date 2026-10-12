import type { Category, Thread } from '../types';
import { getListContext } from '../hooks';
import { useMail } from '../store/mail';
import { useSettings } from '../store/settings';
import { clearSelection, confirmDialog, showToast, ui } from '../store/ui';
import { formatFuture } from './date';
import { CATEGORY_NAMES, computeList, inFolder } from './mailbox';
import { currentRoute, listOf, navigate, withThread, type Route } from './router';

type Mut = (t: Thread) => Thread;

const conv = (n: number) => (n === 1 ? 'Conversation' : `${n} conversations`);

function neighborRoute(route: Route, openId: string): Route {
  const mode = useSettings.getState().autoAdvance;
  const list = computeList(useMail.getState().threads, listOf(route), getListContext());
  const idx = list.findIndex((t) => t.id === openId);
  const base = listOf(route);
  if (idx === -1 || mode === 'list') return base;
  const target = mode === 'newer' ? list[idx - 1] : list[idx + 1];
  return target ? withThread(base, target.id) : base;
}

function run(ids: string[], mutate: Mut, message: string | null, opts: { forceLeave?: boolean } = {}) {
  if (!ids.length) return;
  const mail = useMail.getState();
  const route = currentRoute();
  const openId = route.view !== 'settings' ? route.threadId : undefined;
  const affectsOpen = !!openId && ids.includes(openId);
  const next = affectsOpen ? neighborRoute(route, openId!) : null;
  const snap = mail.snapshot(ids);
  mail.patch(ids, mutate);
  clearSelection();
  let left = false;
  if (affectsOpen) {
    const after = computeList(useMail.getState().threads, listOf(route), getListContext());
    if (opts.forceLeave || !after.some((t) => t.id === openId)) {
      navigate(next!);
      left = true;
    }
  }
  if (message) {
    showToast(message, {
      undo: () => {
        useMail.getState().restore(snap);
        if (left) navigate(route);
      },
    });
  }
}

export const actions = {
  archive(ids: string[]) {
    run(ids, (t) => ({ ...t, inInbox: false, snoozedUntil: null }), `${conv(ids.length)} archived.`);
  },
  trash(ids: string[]) {
    run(ids, (t) => ({ ...t, trashed: true }), `${conv(ids.length)} moved to Trash.`);
  },
  moveToInbox(ids: string[]) {
    run(ids, (t) => ({ ...t, trashed: false, spam: false, inInbox: true, snoozedUntil: null }), `${conv(ids.length)} moved to Inbox.`);
  },
  spam(ids: string[]) {
    run(ids, (t) => ({ ...t, spam: true, inInbox: false, snoozedUntil: null }), `${conv(ids.length)} marked as spam.`);
  },
  notSpam(ids: string[]) {
    run(ids, (t) => ({ ...t, spam: false, inInbox: true }), `${conv(ids.length)} unmarked as spam and moved to Inbox.`);
  },
  markRead(ids: string[], read: boolean, opts: { leave?: boolean } = {}) {
    run(ids, (t) => ({ ...t, unread: !read }), ids.length > 1 ? `${conv(ids.length)} marked as ${read ? 'read' : 'unread'}.` : null, { forceLeave: opts.leave });
  },
  star(ids: string[], starred: boolean) {
    useMail.getState().patch(ids, (t) => ({ ...t, starred }));
    if (ids.length > 1) showToast(`${conv(ids.length)} ${starred ? 'starred' : 'unstarred'}.`);
  },
  important(ids: string[], important: boolean) {
    run(ids, (t) => ({ ...t, important }), `${conv(ids.length)} marked as ${important ? 'important' : 'not important'}.`);
  },
  snooze(ids: string[], until: number) {
    run(ids, (t) => ({ ...t, snoozedUntil: until, inInbox: true }), `Snoozed until ${formatFuture(until)}`);
  },
  unsnooze(ids: string[]) {
    run(ids, (t) => ({ ...t, snoozedUntil: null, inInbox: true }), `${conv(ids.length)} unsnoozed.`);
  },
  mute(ids: string[]) {
    run(ids, (t) => ({ ...t, muted: true, inInbox: false }), `${conv(ids.length)} muted.`);
  },
  unmute(ids: string[]) {
    run(ids, (t) => ({ ...t, muted: false }), `${conv(ids.length)} unmuted.`);
  },
  applyLabels(ids: string[], add: string[], remove: string[]) {
    const labels = useMail.getState().labels;
    const name = (id: string) => labels.find((l) => l.id === id)?.name ?? '';
    const msg =
      add.length === 1 && !remove.length
        ? `${conv(ids.length)} added to "${name(add[0])}".`
        : remove.length === 1 && !add.length
          ? `${conv(ids.length)} removed from "${name(remove[0])}".`
          : 'Labels updated.';
    run(ids, (t) => ({ ...t, labelIds: [...new Set([...t.labelIds.filter((l) => !remove.includes(l)), ...add])] }), msg);
  },
  moveTo(ids: string[], target: { kind: 'inbox' | 'spam' | 'trash' } | { kind: 'label'; id: string } | { kind: 'category'; id: Category }) {
    if (target.kind === 'inbox') return actions.moveToInbox(ids);
    if (target.kind === 'spam') return actions.spam(ids);
    if (target.kind === 'trash') return actions.trash(ids);
    const route = currentRoute();
    if (target.kind === 'category') {
      run(ids, (t) => ({ ...t, category: target.id, inInbox: true, trashed: false }), `${conv(ids.length)} moved to "${CATEGORY_NAMES[target.id]}".`);
      return;
    }
    if (target.kind !== 'label') return;
    const labelId = target.id;
    const label = useMail.getState().labels.find((l) => l.id === labelId);
    run(
      ids,
      (t) => {
        let labelIds = [...new Set([...t.labelIds, labelId])];
        if (route.view === 'label' && route.labelId !== labelId) labelIds = labelIds.filter((l) => l !== route.labelId);
        return { ...t, labelIds, inInbox: false, trashed: false, spam: false };
      },
      `${conv(ids.length)} moved to "${label?.name}".`,
    );
  },
  deleteForever(ids: string[]) {
    confirmDialog({
      title: 'Delete forever?',
      message: `${ids.length === 1 ? 'This conversation' : `These ${ids.length} conversations`} will be permanently deleted. You can undo right after.`,
      confirmLabel: 'Delete forever',
      danger: true,
      onConfirm: () => {
        const mail = useMail.getState();
        const snap = mail.snapshot(ids);
        const route = currentRoute();
        mail.remove(ids);
        clearSelection();
        if (route.view !== 'settings' && route.threadId && ids.includes(route.threadId)) navigate(listOf(route));
        showToast(`${conv(ids.length)} deleted forever.`, { undo: () => useMail.getState().restore(snap) });
      },
    });
  },
  emptyFolder(folder: 'trash' | 'spam') {
    const now = Date.now();
    const ids = Object.values(useMail.getState().threads)
      .filter((t) => inFolder(t, folder, now))
      .map((t) => t.id);
    if (!ids.length) return;
    confirmDialog({
      title: folder === 'trash' ? 'Empty Trash?' : 'Delete all spam?',
      message: `This will permanently delete ${ids.length} conversation${ids.length === 1 ? '' : 's'}.`,
      confirmLabel: 'OK',
      danger: true,
      onConfirm: () => {
        const mail = useMail.getState();
        const snap = mail.snapshot(ids);
        mail.remove(ids);
        clearSelection();
        showToast(`${conv(ids.length)} deleted forever.`, { undo: () => useMail.getState().restore(snap) });
      },
    });
  },
  discardDrafts(ids: string[]) {
    const mail = useMail.getState();
    const snap = mail.snapshot(ids);
    const route = currentRoute();
    for (const id of ids) {
      const t = mail.threads[id];
      t?.messages.filter((m) => m.status === 'draft').forEach((m) => useMail.getState().discardDraft(id, m.id));
    }
    clearSelection();
    if (route.view !== 'settings' && route.threadId && ids.includes(route.threadId) && !useMail.getState().threads[route.threadId]) navigate(listOf(route));
    showToast(ids.length === 1 ? 'Draft discarded.' : `${ids.length} drafts discarded.`, { undo: () => useMail.getState().restore(snap) });
  },
  cancelScheduled(ids: string[]) {
    const mail = useMail.getState();
    const snap = mail.snapshot(ids);
    for (const id of ids) {
      mail.threads[id]?.messages.filter((m) => m.status === 'scheduled').forEach((m) => useMail.getState().unschedule(id, m.id));
    }
    clearSelection();
    showToast('Send canceled. Moved to Drafts.', { undo: () => useMail.getState().restore(snap) });
  },
  refresh() {
    if (ui.get().refreshing) return;
    ui.set({ refreshing: true });
    setTimeout(() => {
      const arrived = useMail.getState().deliverNext(Date.now());
      ui.set({ refreshing: false });
      if (!arrived) showToast('No new mail.');
    }, 650);
  },
};
