import { useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import { navigate, useRoute } from '../lib/router';
import { useListModel } from '../lib/listModel';
import { useIsWide } from '../lib/hooks';
import {
  archiveThreads,
  composeNew,
  goToList,
  markRead,
  openThread,
  replyTo,
  spamThreads,
  toggleStar,
  trashThreads,
} from '../lib/actions';
import { CategoryTabs, FolderBanner, SearchChips, SelectAllBanner, ThreadList } from './ThreadList';
import { Toolbar } from './Toolbar';
import { ThreadView } from './ThreadView';
import { SettingsPage } from './Settings';

export function MailView() {
  const route = useRoute();
  const model = useListModel(route);
  const settings = useMail((s) => s.settings);
  const wide = useIsWide();
  const routeKey = `${route.view}|${route.param}|${route.tab}|${route.page}`;
  const modelRef = useRef(model);
  modelRef.current = model;
  const routeRef = useRef(route);
  routeRef.current = route;

  const isList = route.view !== 'settings';
  const split = settings.pane === 'right' && wide && isList && route.view !== 'drafts' && route.view !== 'scheduled';
  const showThread = !!route.threadId && isList;

  useEffect(() => {
    useUI.setState({ selected: [], anchor: null, cursor: null });
  }, [routeKey]);

  useEffect(() => {
    const pending = { g: 0 };
    const onKey = (e: KeyboardEvent) => {
      const st = useMail.getState().settings;
      if (!st.shortcuts) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'Enter' || e.key === ' ') && t.closest('button, a, [role="button"], [role="menuitem"], [role="tab"]')) return;
      const ui = useUI.getState();
      if (ui.confirm || ui.labelDialog || ui.preview || ui.shortcutsHelp) return;
      const r = routeRef.current;
      const m = modelRef.current;
      const threadItems = m.page.filter((i) => i.kind === 'thread');
      const key = e.key;

      if (pending.g && Date.now() - pending.g < 1200) {
        pending.g = 0;
        const map: Record<string, string> = { i: 'inbox', s: 'starred', t: 'sent', d: 'drafts', a: 'all', b: 'snoozed' };
        if (map[key]) {
          e.preventDefault();
          navigate({ view: map[key] as never });
          return;
        }
      }

      const targetIds = (): string[] => {
        if (ui.selected.length) return ui.selected;
        if (r.threadId) return [r.threadId];
        return ui.cursor ? [ui.cursor] : [];
      };
      const moveCursor = (dir: 1 | -1) => {
        if (!threadItems.length) return;
        const idx = threadItems.findIndex((i) => i.id === ui.cursor);
        const next = idx < 0 ? (dir === 1 ? 0 : threadItems.length - 1) : Math.min(threadItems.length - 1, Math.max(0, idx + dir));
        useUI.setState({ cursor: threadItems[next].id });
      };
      const stepThread = (dir: 1 | -1) => {
        const all = m.items.filter((i) => i.kind === 'thread');
        const idx = all.findIndex((i) => i.id === r.threadId);
        const next = all[idx + dir];
        if (next) navigate({ ...r, threadId: next.id });
      };

      switch (key) {
        case 'c':
          e.preventDefault();
          composeNew();
          break;
        case '/':
          e.preventDefault();
          if (window.matchMedia('(max-width: 700px)').matches) ui.set({ mobileSearch: true });
          else ui.set({ searchFocusNonce: ui.searchFocusNonce + 1 });
          break;
        case '?':
          e.preventDefault();
          ui.set({ shortcutsHelp: true });
          break;
        case 'g':
          pending.g = Date.now();
          break;
        case 'j':
          if (r.threadId) stepThread(1);
          else moveCursor(1);
          break;
        case 'k':
          if (r.threadId) stepThread(-1);
          else moveCursor(-1);
          break;
        case 'o':
        case 'Enter':
          if (!r.threadId && ui.cursor && threadItems.some((i) => i.id === ui.cursor)) {
            e.preventDefault();
            openThread(ui.cursor);
          }
          break;
        case 'u':
          if (r.threadId) goToList();
          break;
        case 'Escape':
          if (ui.selected.length) ui.clearSelection();
          else if (r.threadId) goToList();
          else if (ui.quickSettings) ui.set({ quickSettings: false });
          break;
        case 'x': {
          if (ui.cursor) ui.toggleSelect(ui.cursor);
          break;
        }
        case 's': {
          const ids = targetIds();
          if (ids.length === 1) toggleStar(ids[0]);
          else if (ids.length > 1) ids.forEach((id) => toggleStar(id));
          break;
        }
        case 'e': {
          const ids = targetIds();
          if (ids.length) archiveThreads(ids);
          break;
        }
        case '#':
        case 'Delete': {
          const ids = targetIds();
          if (ids.length) trashThreads(ids);
          break;
        }
        case '!': {
          const ids = targetIds();
          if (ids.length) spamThreads(ids);
          break;
        }
        case 'I': {
          const ids = targetIds();
          if (ids.length) markRead(true, ids);
          break;
        }
        case 'U': {
          const ids = targetIds();
          if (ids.length) markRead(false, ids);
          break;
        }
        case 'r':
          if (r.threadId) {
            e.preventDefault();
            replyTo('reply');
          }
          break;
        case 'a':
          if (r.threadId) {
            e.preventDefault();
            replyTo('replyAll');
          }
          break;
        case 'f':
          if (r.threadId) {
            e.preventDefault();
            replyTo('forward');
          }
          break;
        case 'z': {
          const last = [...ui.toasts].reverse().find((x) => x.actions.some((a) => a.label === 'Undo'));
          if (last) {
            last.actions.find((a) => a.label === 'Undo')?.run();
            ui.dismissToast(last.id);
          }
          break;
        }
        case 'l':
        case 'b':
        case 'v': {
          const label = key === 'l' ? 'Labels' : key === 'b' ? 'Snooze' : 'Move to';
          const btn = document.querySelector<HTMLButtonElement>(`.toolbar [aria-label="${label}"]`);
          if (btn && (ui.selected.length || r.threadId || ui.cursor)) {
            if (!ui.selected.length && !r.threadId && ui.cursor) ui.select([ui.cursor]);
            e.preventDefault();
            setTimeout(() => document.querySelector<HTMLButtonElement>(`.toolbar [aria-label="${label}"]`)?.click(), 30);
          }
          break;
        }
        case '[':
        case ']': {
          if (r.threadId) {
            archiveThreads([r.threadId]);
          }
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (route.view === 'settings') {
    return (
      <main className="main" id="main">
        <div className="panel panel--settings">
          <SettingsPage tab={route.param} />
        </div>
      </main>
    );
  }

  const listNode = (
    <>
      {!showThread || split ? <Toolbar route={route} model={model} /> : null}
      {route.view === 'inbox' && settings.tabsEnabled && (!showThread || split) ? <CategoryTabs route={route} /> : null}
      {route.view === 'search' && (!showThread || split) ? <SearchChips query={route.param ?? ''} /> : null}
      {!showThread || split ? <SelectAllBanner model={model} /> : null}
      {!showThread || split ? <FolderBanner route={route} count={model.total} /> : null}
      {!showThread || split ? (
        <div className={`panel__scroll ${split ? 'panel__scroll--split' : ''}`}>
          <ThreadList route={route} model={model} />
        </div>
      ) : null}
    </>
  );

  return (
    <main className="main" id="main">
      <div className={`panel ${split ? 'panel--split' : ''} ${showThread && !split ? 'panel--thread' : ''}`}>
        {split ? (
          <>
            <div className="split__list">{listNode}</div>
            <div className="split__read">
              {showThread ? (
                <ThreadView key={route.threadId} route={route} model={model} embedded />
              ) : (
                <div className="empty empty--pane">
                  <div className="empty__art">
                    <Mail size={44} />
                  </div>
                  <h2>Select a conversation to read</h2>
                  <p>Pick a message from the list, or press <kbd>j</kbd> / <kbd>k</kbd> and <kbd>Enter</kbd>.</p>
                </div>
              )}
            </div>
          </>
        ) : showThread ? (
          <ThreadView key={route.threadId} route={route} model={model} />
        ) : (
          listNode
        )}
      </div>
    </main>
  );
}
