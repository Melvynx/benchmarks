import { useEffect, useRef } from 'react';
import { listThreads } from '../domain/selectors';
import type { Folder } from '../domain/types';
import { go, goFolder, type Route } from '../lib/route';
import * as commands from '../store/commands';
import { useMail } from '../store/mailStore';
import { useUI } from '../store/uiStore';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

const GO_KEYS: Record<string, Folder> = {
  i: 'inbox',
  s: 'starred',
  n: 'snoozed',
  t: 'sent',
  d: 'drafts',
  a: 'all',
  c: 'scheduled',
};

function anchorFor(rowId: string | null): { x: number; y: number } {
  const el = rowId ? document.getElementById(`row-${rowId}`) : null;
  if (!el) return { x: window.innerWidth / 2 - 140, y: 120 };
  const rect = el.getBoundingClientRect();
  return { x: rect.left + 48, y: rect.bottom };
}

/** Gmail-style single-key shortcuts. Ignored while typing or when a dialog is open. */
export function useShortcuts(route: Route): void {
  const routeRef = useRef(route);
  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    let gUntil = 0;

    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState();
      if (e.key === 'Escape' && ui.menu) {
        ui.closeMenu();
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (ui.settingsOpen || ui.shortcutsOpen || ui.confirm) return;

      const r = routeRef.current;
      const data = useMail.getState().data;
      const visibleIds = listThreads(data, r.section, ui.category, Date.now()).map((t) => t.id);
      const targets = (): string[] => {
        if (ui.selected.length) return ui.selected;
        if (r.threadId) return [r.threadId];
        return ui.focusedId ? [ui.focusedId] : [];
      };
      const current = r.threadId ?? ui.focusedId;
      const focusedThread = current ? data.threads.find((t) => t.id === current) : undefined;

      if (gUntil > Date.now() && GO_KEYS[e.key]) {
        e.preventDefault();
        gUntil = 0;
        goFolder(GO_KEYS[e.key]);
        return;
      }
      gUntil = 0;

      const move = (delta: number) => {
        if (!visibleIds.length) return;
        if (r.threadId) {
          const idx = visibleIds.indexOf(r.threadId);
          const next = visibleIds[Math.min(visibleIds.length - 1, Math.max(0, idx + delta))];
          if (next && next !== r.threadId) go({ ...r, threadId: next });
          return;
        }
        const idx = ui.focusedId ? visibleIds.indexOf(ui.focusedId) : -1;
        const next = visibleIds[Math.min(visibleIds.length - 1, Math.max(0, idx + delta))];
        ui.setFocusedId(next);
        document.getElementById(`row-${next}`)?.scrollIntoView({ block: 'nearest' });
      };

      const afterLeaving = (ids: string[]) => {
        if (r.threadId && ids.includes(r.threadId)) go({ ...r, threadId: null });
      };

      switch (e.key) {
        case 'c':
          e.preventDefault();
          commands.startNewCompose();
          break;
        case '/':
          e.preventDefault();
          document.getElementById('search-input')?.focus();
          break;
        case 'j':
        case 'n':
          e.preventDefault();
          move(1);
          break;
        case 'k':
        case 'p':
          e.preventDefault();
          move(-1);
          break;
        case 'o':
        case 'Enter':
          if (!r.threadId && ui.focusedId) {
            e.preventDefault();
            go({ ...r, threadId: ui.focusedId });
          }
          break;
        case 'u':
          if (r.threadId) {
            e.preventDefault();
            go({ ...r, threadId: null });
          }
          break;
        case 'e': {
          const ids = targets();
          e.preventDefault();
          commands.archiveThreads(ids);
          afterLeaving(ids);
          break;
        }
        case '#': {
          const ids = targets();
          e.preventDefault();
          if (r.section.kind === 'folder' && r.section.folder === 'trash') commands.deleteForever(ids);
          else commands.trashThreads(ids);
          afterLeaving(ids);
          break;
        }
        case '!': {
          const ids = targets();
          e.preventDefault();
          commands.reportSpam(ids);
          afterLeaving(ids);
          break;
        }
        case 's': {
          e.preventDefault();
          commands.toggleStar(targets());
          break;
        }
        case 'I':
          e.preventDefault();
          commands.setReadState(targets(), true);
          break;
        case 'U':
          e.preventDefault();
          commands.setReadState(targets(), false);
          break;
        case 'x': {
          const id = r.threadId ?? ui.focusedId;
          if (id) {
            e.preventDefault();
            ui.toggleSelected(id);
          }
          break;
        }
        case 'r':
        case 'a':
          if (r.threadId) {
            e.preventDefault();
            ui.requestReply(r.threadId, e.key === 'a' ? 'replyAll' : 'reply');
          }
          break;
        case 'f':
          if (focusedThread) {
            e.preventDefault();
            commands.startForwardCompose(focusedThread);
          }
          break;
        case 'b': {
          const ids = targets();
          if (ids.length) {
            e.preventDefault();
            ui.openMenu({ kind: 'snooze', ids, ...anchorFor(ui.focusedId ?? r.threadId) });
          }
          break;
        }
        case 'l': {
          const ids = targets();
          if (ids.length) {
            e.preventDefault();
            ui.openMenu({ kind: 'labels', ids, ...anchorFor(ui.focusedId ?? r.threadId) });
          }
          break;
        }
        case 'g':
          gUntil = Date.now() + 1200;
          break;
        case '?':
          e.preventDefault();
          ui.setShortcutsOpen(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
