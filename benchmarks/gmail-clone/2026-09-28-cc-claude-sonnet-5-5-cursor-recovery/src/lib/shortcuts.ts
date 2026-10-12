import { useEffect, useRef } from 'react';
import { getState } from './store';
import { clearSelection, getUI, openDialog, setSelection, setUI, toast, toggleSelected } from './ui';
import { selectedRows, uniqueThreadIds, useViewModel, type ViewModel } from './viewModel';
import { folderHref, navigate } from './router';
import { archive, composeNew, composeReplyTo, markRead, markSpam, setImportant, toggleStar, trash } from './actions';
import { deliveredMessages } from './mail';
import type { Settings } from './types';

/** After a conversation leaves the current view, return to the list or step to a neighbour. */
export function advanceAfterRemoval(vm: ViewModel, settings: Settings, embedded = false) {
  const rows = vm.rows;
  const idx = rows.findIndex((r) => r.thread.id === vm.threadId);
  const mode = settings.autoAdvance;
  if (!embedded && mode === 'newer' && idx > 0) return navigate(vm.hrefFor(rows[idx - 1].thread.id));
  if (!embedded && mode === 'older' && idx >= 0 && idx < rows.length - 1) return navigate(vm.hrefFor(rows[idx + 1].thread.id));
  navigate(vm.hrefFor(undefined));
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.closest) return false;
  return !!el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
}

const GO: Record<string, () => void> = {
  i: () => navigate(folderHref('inbox')),
  s: () => navigate(folderHref('starred')),
  t: () => navigate(folderHref('sent')),
  d: () => navigate(folderHref('drafts')),
  a: () => navigate(folderHref('all')),
  b: () => navigate(folderHref('snoozed')),
  e: () => navigate(folderHref('scheduled')),
  l: () => navigate('#/settings/labels'),
};

export function useShortcuts() {
  const vm = useViewModel();
  const ref = useRef(vm);
  ref.current = vm;

  useEffect(() => {
    let pending: 'g' | '*' | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | undefined;
    const arm = (k: 'g' | '*') => {
      pending = k;
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => (pending = null), 1500);
    };

    const onKey = (e: KeyboardEvent) => {
      const settings = getState().settings;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      const ui = getUI();
      if (ui.dialog) return;
      if (document.querySelector('.popover')) return;
      const v = ref.current;
      const key = e.key;

      if (key === 'Escape') {
        if (ui.selection.keys.length || ui.selection.allInView) {
          clearSelection();
          e.preventDefault();
        } else if (v.page === 'mail' && v.threadId) {
          navigate(v.hrefFor(undefined));
          e.preventDefault();
        } else if (ui.drawerOpen) setUI({ drawerOpen: false });
        return;
      }
      if (!settings.keyboardShortcuts) return;
      if (e.target instanceof HTMLElement && e.target.closest('button, a, [role="menuitem"]') && (key === 'Enter' || key === ' ')) return;

      if (pending === 'g') {
        pending = null;
        const go = GO[key.toLowerCase()];
        if (go) {
          e.preventDefault();
          go();
        }
        return;
      }
      if (pending === '*') {
        pending = null;
        if (key === 'a') {
          setSelection(v.pageRows.map((r) => r.key));
          e.preventDefault();
        } else if (key === 'n') {
          clearSelection();
          e.preventDefault();
        }
        return;
      }

      if (key === 'g') return arm('g');
      if (key === '*') return arm('*');
      if (key === '?') {
        e.preventDefault();
        return openDialog({ kind: 'shortcuts' });
      }
      if (key === 'c') {
        e.preventDefault();
        return void composeNew();
      }
      if (key === '/') {
        e.preventDefault();
        return setUI((u) => ({ searchFocusTick: u.searchFocusTick + 1 }));
      }
      if (key === 'z') {
        const undo = ui.lastUndo;
        if (undo) {
          undo();
          setUI({ lastUndo: null });
          toast('Action undone.');
        }
        return;
      }
      if (v.page !== 'mail') return;

      const rows = v.pageRows;
      const cursorIdx = rows.findIndex((r) => r.key === ui.cursor);
      const openIdx = v.threadId ? v.rows.findIndex((r) => r.thread.id === v.threadId) : -1;

      const targets = (): string[] => {
        if (ui.selection.keys.length || ui.selection.allInView) return uniqueThreadIds(selectedRows(v.rows, ui.selection.keys, ui.selection.allInView));
        if (v.threadId) return [v.threadId];
        const r = rows[cursorIdx];
        return r ? [r.thread.id] : [];
      };
      const done = () => {
        clearSelection();
        if (v.threadId) advanceAfterRemoval(v, settings);
      };
      const ids = () => {
        const list = targets();
        if (!list.length) toast('Select a conversation first.', { duration: 2000 });
        return list;
      };

      switch (key) {
        case 'j':
        case 'k': {
          e.preventDefault();
          const dir = key === 'j' ? 1 : -1;
          if (v.threadId) {
            const next = v.rows[openIdx + dir];
            if (next) navigate(v.hrefFor(next.thread.id));
          } else if (rows.length) {
            const n = Math.max(0, Math.min(rows.length - 1, cursorIdx < 0 ? 0 : cursorIdx + dir));
            setUI({ cursor: rows[n].key });
          }
          return;
        }
        case 'Enter':
        case 'o': {
          if (v.threadId) return;
          const r = rows[cursorIdx];
          if (r) {
            e.preventDefault();
            const row = document.querySelector<HTMLElement>(`[data-key="${CSS.escape(r.key)}"]`);
            row?.click();
          }
          return;
        }
        case 'u':
          if (v.threadId) {
            e.preventDefault();
            navigate(v.hrefFor(undefined));
          }
          return;
        case 'x': {
          const r = rows[cursorIdx];
          if (r && !v.threadId) {
            e.preventDefault();
            toggleSelected(r.key);
          }
          return;
        }
        case 's': {
          const list = ids();
          if (list.length) {
            e.preventDefault();
            toggleStar(list);
          }
          return;
        }
        case '+':
        case '=': {
          const list = ids();
          if (list.length) setImportant(list, true);
          return;
        }
        case '-': {
          const list = ids();
          if (list.length) setImportant(list, false);
          return;
        }
        case 'e': {
          const list = ids();
          if (list.length) {
            e.preventDefault();
            archive(list);
            done();
          }
          return;
        }
        case '#':
        case 'Delete': {
          const list = ids();
          if (list.length) {
            e.preventDefault();
            trash(list);
            done();
          }
          return;
        }
        case '!': {
          const list = ids();
          if (list.length) {
            e.preventDefault();
            markSpam(list);
            done();
          }
          return;
        }
        case 'I': {
          const list = ids();
          if (list.length) markRead(list, true);
          return;
        }
        case 'U': {
          const list = ids();
          if (list.length) {
            markRead(list, false);
            clearSelection();
          }
          return;
        }
        case 'b': {
          const list = ids();
          if (list.length) {
            e.preventDefault();
            openDialog({ kind: 'snooze', ids: list });
          }
          return;
        }
        case 'l':
        case 'v': {
          if (!targets().length) return void toast('Select a conversation first.', { duration: 2000 });
          e.preventDefault();
          document.querySelector<HTMLButtonElement>(key === 'l' ? '.toolbar [aria-label="Labels"]' : '.toolbar [aria-label="Move to"]')?.click();
          return;
        }
        case 'r':
        case 'a':
        case 'f': {
          if (!v.threadId) return;
          const t = getState().threads[v.threadId];
          const last = t && deliveredMessages(t).at(-1);
          if (!t || !last) return;
          e.preventDefault();
          composeReplyTo(t.id, last.id, key === 'r' ? 'reply' : key === 'a' ? 'replyAll' : 'forward');
          return;
        }
        default:
          return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(pendingTimer);
    };
  }, []);
}