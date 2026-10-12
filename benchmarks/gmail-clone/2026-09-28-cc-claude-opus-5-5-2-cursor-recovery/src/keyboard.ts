import { useEffect } from 'react';
import { composeNew, openDraft, openThread, runAction, startReply, type BulkAction } from './lib/actions';
import { getRoute, listRoute, navigate, type Route } from './lib/router';
import { useMail } from './store/mail';
import { rowsForRoute } from './store/selectors';
import { useUI } from './store/ui';

function listRows(route: Route) {
  const mail = useMail.getState();
  return rowsForRoute(mail, listRoute(route), Date.now());
}

function targetIds(route: Route): string[] {
  const ui = useUI.getState();
  const sel = Object.keys(ui.selected);
  if (sel.length) return sel;
  if (route.view !== 'settings' && route.threadId) return [route.threadId];
  if (ui.cursorId && useMail.getState().threads[ui.cursorId]) return [ui.cursorId];
  return [];
}

function moveCursor(route: Route, delta: number) {
  const rows = listRows(route);
  if (!rows.length) return;
  const ui = useUI.getState();
  if (route.view !== 'settings' && route.threadId) {
    const threadRows = rows.filter((r) => r.kind === 'thread');
    const i = threadRows.findIndex((r) => r.id === route.threadId);
    const next = threadRows[i + delta];
    if (next) openThread(next.id, listRoute(route));
    return;
  }
  const i = rows.findIndex((r) => r.id === ui.cursorId);
  const j = i < 0 ? 0 : Math.max(0, Math.min(rows.length - 1, i + delta));
  const id = rows[j].id;
  ui.setCursor(id);
  const size = useMail.getState().settings.pageSize;
  const page = Math.floor(j / size);
  if (page !== ui.page) ui.setPage(page);
  const sel = CSS.escape(id);
  requestAnimationFrame(() => document.querySelector(`[data-thread="${sel}"], [data-draft="${sel}"]`)?.scrollIntoView({ block: 'nearest' }));
}

export function useShortcuts() {
  useEffect(() => {
    let prefix: { key: 'g' | '*'; at: number } | null = null;

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const mail = useMail.getState();
      const ui = useUI.getState();
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('.scrim, .viewer')) return;
      const route = getRoute();

      if (e.key === 'Escape') {
        if (document.querySelector('.popover')) return;
        if (ui.quickSettings) return;
        if (Object.keys(ui.selected).length) {
          ui.clearSelection();
          e.preventDefault();
        }
        return;
      }
      if (!mail.settings.shortcuts) return;
      if (document.querySelector('.popover')) return;

      const key = e.key;
      const now = Date.now();
      const act = (a: BulkAction) => {
        const ids = targetIds(route);
        if (ids.length) runAction(ids, a);
      };

      if (prefix && now - prefix.at < 1500) {
        const p = prefix.key;
        prefix = null;
        e.preventDefault();
        if (p === 'g') {
          const go: Record<string, Route> = {
            i: { view: 'folder', folder: 'inbox' },
            s: { view: 'folder', folder: 'starred' },
            t: { view: 'folder', folder: 'sent' },
            d: { view: 'folder', folder: 'drafts' },
            a: { view: 'folder', folder: 'all' },
            b: { view: 'folder', folder: 'snoozed' },
          };
          if (go[key]) {
            ui.clearSelection();
            ui.setPage(0);
            navigate(go[key]);
          } else if (key === 'k') mail.updateSettings({ sidePanel: 'tasks' });
          return;
        }
        const rows = listRows(route).slice(ui.page * mail.settings.pageSize, (ui.page + 1) * mail.settings.pageSize);
        const pick = (pred: (t: (typeof rows)[number]) => boolean) => {
          ui.clearSelection();
          ui.setSelected(rows.filter(pred).map((r) => r.id), true);
        };
        if (key === 'a') pick(() => true);
        else if (key === 'n') ui.clearSelection();
        else if (key === 'r') pick((r) => r.kind === 'thread' && !r.thread.unread);
        else if (key === 'u') pick((r) => r.kind === 'thread' && r.thread.unread);
        else if (key === 's') pick((r) => r.kind === 'thread' && r.thread.starred);
        else if (key === 't') pick((r) => r.kind === 'thread' && !r.thread.starred);
        return;
      }

      const threadId = route.view !== 'settings' ? route.threadId : undefined;
      let handled = true;
      switch (key) {
        case 'c':
          composeNew();
          break;
        case '/':
          window.dispatchEvent(new Event('opus:focus-search'));
          break;
        case '?':
          ui.set({ shortcutsHelp: true });
          break;
        case 'g':
        case '*':
          prefix = { key, at: now };
          break;
        case 'j':
          moveCursor(route, 1);
          break;
        case 'k':
          moveCursor(route, -1);
          break;
        case 'o':
        case 'Enter': {
          if (threadId || !ui.cursorId) {
            handled = false;
            break;
          }
          const draft = mail.drafts[ui.cursorId];
          if (draft) openDraft(draft.id);
          else if (mail.threads[ui.cursorId]) openThread(ui.cursorId, listRoute(route));
          break;
        }
        case 'u':
          if (threadId) navigate(listRoute(route));
          else handled = false;
          break;
        case 'e':
          act(route.view === 'folder' && (route.folder === 'trash' || route.folder === 'spam') ? 'inbox' : 'archive');
          break;
        case '#':
          act(route.view === 'folder' && route.folder === 'trash' ? 'deleteForever' : 'trash');
          break;
        case '!':
          act('spam');
          break;
        case 'm':
          act('mute');
          break;
        case 's': {
          const ids = targetIds(route);
          const t = ids.map((id) => mail.threads[id]).filter(Boolean);
          if (t.length) runAction(ids, t.every((x) => x.starred) ? 'unstar' : 'star');
          break;
        }
        case '+':
        case '=':
          act('important');
          break;
        case '-':
          act('notImportant');
          break;
        case 'I':
          act('read');
          break;
        case 'U':
          act('unread');
          break;
        case 'x':
          if (ui.cursorId && !threadId) ui.toggleSelected(ui.cursorId);
          else handled = false;
          break;
        case 'r':
        case 'a':
        case 'f':
          if (threadId && mail.threads[threadId]) {
            startReply(threadId, key === 'r' ? 'reply' : key === 'a' ? 'replyAll' : 'forward');
            window.setTimeout(() => {
              const el = document.querySelector('.thread-scroll');
              el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            }, 60);
          } else handled = false;
          break;
        case 'z': {
          const undo = ui.toast?.actions?.find((a) => a.label === 'Undo');
          if (undo) {
            ui.dismissToast();
            undo.run();
          } else handled = false;
          break;
        }
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
