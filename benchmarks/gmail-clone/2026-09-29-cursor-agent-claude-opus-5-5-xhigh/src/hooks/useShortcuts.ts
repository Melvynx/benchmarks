import { useEffect } from 'react';
import type { FolderId } from '../types';
import { actions } from '../lib/actions';
import { openCompose, openDraft, openReply } from '../lib/composeActions';
import { computeList } from '../lib/mailbox';
import { currentRoute, listOf, navigate, withThread } from '../lib/router';
import { isTypingTarget } from '../lib/utils';
import { useMail } from '../store/mail';
import { useSettings } from '../store/settings';
import { hideToast, showToast, ui, type MenuKind } from '../store/ui';
import { getListContext } from './index';

const GO: Record<string, FolderId> = { i: 'inbox', s: 'starred', t: 'sent', d: 'drafts', a: 'all', b: 'snoozed', k: 'scheduled' };

function blocked(): boolean {
  if (document.querySelector('[aria-modal="true"], [data-popover]')) return true;
  const s = ui.get();
  return s.mobileSearch || !!s.preview || s.shortcutsOpen;
}

export function useShortcuts() {
  useEffect(() => {
    let prefix: { key: string; at: number } | null = null;

    const onKey = (e: KeyboardEvent) => {
      if (!useSettings.getState().shortcuts) return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return;
      if (e.key === 'Escape') {
        if (ui.get().selected.length) ui.set({ selected: [], anchor: null });
        else if (ui.get().quickSettings) ui.set({ quickSettings: false });
        return;
      }
      if (blocked()) return;

      const route = currentRoute();
      if (route.view === 'settings') {
        if (e.key === '?') ui.set({ shortcutsOpen: true });
        else if (e.key === 'c') openCompose();
        else if (e.key === 'g') prefix = { key: 'g', at: Date.now() };
        else if (prefix?.key === 'g' && GO[e.key] && Date.now() - prefix.at < 1500) navigate({ view: 'folder', folder: GO[e.key] });
        return;
      }

      const key = e.key;
      const state = ui.get();
      const listRoute = listOf(route);
      const list = computeList(useMail.getState().threads, listRoute, getListContext());
      const openId = route.threadId;
      const cursor = state.cursor && list.some((t) => t.id === state.cursor) ? state.cursor : null;
      const targets = state.selected.length ? state.selected : openId ? [openId] : cursor ? [cursor] : [];
      const threads = useMail.getState().threads;
      const handled = () => e.preventDefault();

      if (prefix && Date.now() - prefix.at < 1500) {
        const p = prefix.key;
        prefix = null;
        if (p === 'g' && GO[key]) {
          handled();
          navigate({ view: 'folder', folder: GO[key] });
          return;
        }
        if (p === '*') {
          handled();
          const pick = (f: (id: string) => boolean) => ui.set({ selected: list.filter((t) => f(t.id)).map((t) => t.id) });
          if (key === 'a') pick(() => true);
          else if (key === 'n') ui.set({ selected: [] });
          else if (key === 'r') pick((id) => !threads[id].unread);
          else if (key === 'u') pick((id) => threads[id].unread);
          else if (key === 's') pick((id) => threads[id].starred);
          else if (key === 't') pick((id) => !threads[id].starred);
          return;
        }
      }
      prefix = null;

      const pageSize = useSettings.getState().pageSize;
      const moveCursor = (dir: 1 | -1) => {
        if (!list.length) return;
        if (openId) {
          const idx = list.findIndex((t) => t.id === openId);
          const next = list[idx + dir];
          if (next) navigate(withThread(listRoute, next.id));
          return;
        }
        const idx = cursor ? list.findIndex((t) => t.id === cursor) : -1;
        const nextIdx = idx === -1 ? 0 : Math.min(list.length - 1, Math.max(0, idx + dir));
        ui.set({ cursor: list[nextIdx].id, page: Math.floor(nextIdx / pageSize) });
      };
      const openThread = (id: string) => {
        const t = threads[id];
        if (!t) return;
        if (t.messages.every((m) => m.status === 'draft')) openDraft(t);
        else navigate(withThread(listRoute, id));
      };
      const requestMenu = (kind: MenuKind) => {
        if (!targets.length) return;
        if (!state.selected.length && !openId && cursor) ui.set({ selected: [cursor] });
        ui.set({ menuRequest: { kind, nonce: Date.now(), target: state.selected.length || !openId ? 'list' : 'thread' } });
      };
      const reply = (mode: 'reply' | 'replyAll' | 'forward') => {
        const id = openId ?? cursor;
        if (!id) return;
        if (!openId) navigate(withThread(listRoute, id));
        setTimeout(() => openReply(id, mode), 0);
      };
      const archiveAndGo = (dir: 1 | -1) => {
        if (!openId) return;
        const idx = list.findIndex((t) => t.id === openId);
        const target = list[idx + dir];
        actions.archive([openId]);
        navigate(target ? withThread(listRoute, target.id) : listRoute, { replace: true });
      };
      const inTrash = (id: string) => threads[id]?.trashed;

      switch (key) {
        case 'c':
          handled();
          openCompose();
          return;
        case '/':
          handled();
          ui.set({ searchFocus: Date.now() });
          return;
        case '?':
          handled();
          ui.set({ shortcutsOpen: true });
          return;
        case 'j':
        case 'ArrowDown':
          if (key === 'ArrowDown' && openId) return;
          handled();
          moveCursor(1);
          return;
        case 'k':
        case 'ArrowUp':
          if (key === 'ArrowUp' && openId) return;
          handled();
          moveCursor(-1);
          return;
        case 'o':
        case 'Enter':
          if (openId || !cursor) return;
          if (key === 'Enter' && document.activeElement && document.activeElement !== document.body && !(document.activeElement as HTMLElement).dataset.threadId) return;
          handled();
          openThread(cursor);
          return;
        case 'u':
          if (!openId) return;
          handled();
          navigate(listRoute);
          return;
        case 'x':
          if (!cursor) return;
          handled();
          ui.set({ selected: state.selected.includes(cursor) ? state.selected.filter((i) => i !== cursor) : [...state.selected, cursor], anchor: cursor });
          return;
        case 's': {
          if (!targets.length) return;
          handled();
          const star = !targets.every((id) => threads[id]?.starred);
          actions.star(targets, star);
          return;
        }
        case 'e':
          if (!targets.length) return;
          handled();
          actions.archive(targets);
          return;
        case '#':
          if (!targets.length) return;
          handled();
          if (targets.every(inTrash)) actions.deleteForever(targets);
          else actions.trash(targets);
          return;
        case '!':
          if (!targets.length) return;
          handled();
          actions.spam(targets);
          return;
        case 'I':
          if (!targets.length) return;
          handled();
          actions.markRead(targets, true);
          return;
        case 'U':
          if (!targets.length) return;
          handled();
          actions.markRead(targets, false, { leave: !!openId && !state.selected.length });
          return;
        case '+':
        case '=':
          if (!targets.length) return;
          handled();
          actions.important(targets, true);
          return;
        case '-':
          if (!targets.length) return;
          handled();
          actions.important(targets, false);
          return;
        case 'm':
          if (!targets.length) return;
          handled();
          actions.mute(targets);
          return;
        case 'r':
          handled();
          reply(useSettings.getState().defaultReply === 'replyAll' ? 'replyAll' : 'reply');
          return;
        case 'R':
          handled();
          reply('reply');
          return;
        case 'a':
          handled();
          reply('replyAll');
          return;
        case 'f':
          handled();
          reply('forward');
          return;
        case 'l':
          handled();
          requestMenu('labels');
          return;
        case 'v':
          handled();
          requestMenu('move');
          return;
        case 'b':
          handled();
          requestMenu('snooze');
          return;
        case '[':
          handled();
          archiveAndGo(-1);
          return;
        case ']':
          handled();
          archiveAndGo(1);
          return;
        case 'z': {
          const t = ui.get().toast;
          if (!t?.undo) return;
          handled();
          const undo = t.undo;
          hideToast();
          undo();
          showToast('Action undone.');
          return;
        }
        case 'g':
        case '*':
          handled();
          prefix = { key, at: Date.now() };
          return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
