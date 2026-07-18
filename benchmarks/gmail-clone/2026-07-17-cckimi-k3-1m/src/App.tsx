import { useEffect, useRef } from 'react';
import { PAGE_SIZE, threadsForView, useMail } from './store/mailStore';
import { useUi } from './store/uiStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ListPane } from './components/MailList';
import { ThreadView } from './components/ThreadView';
import { Compose } from './components/Compose';
import { Toasts } from './components/Toasts';
import { Dialogs } from './components/Dialogs';
import { isTypingTarget, useMedia } from './lib/hooks';

function useGlobalKeys() {
  const pending = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (useUi.getState().dialog) return;
      if (document.querySelector('.popover')) return;

      const s = useMail.getState();
      const list = threadsForView(s.threads, s.view, s.labels).slice(
        s.page * PAGE_SIZE,
        (s.page + 1) * PAGE_SIZE,
      );
      const cursorThread = s.cursorIndex !== null ? list[s.cursorIndex] : undefined;
      const targetIds = s.selection.length ? s.selection : cursorThread ? [cursorThread.id] : [];
      const key = e.key;

      // two-key sequences: g then i/s/t/d, * then a/n
      if (pending.current && Date.now() - pending.current.at < 1200) {
        const first = pending.current.key;
        pending.current = null;
        if (first === 'g') {
          if (key === 'i') return void s.openMailbox('inbox');
          if (key === 's') return void s.openMailbox('starred');
          if (key === 't') return void s.openMailbox('sent');
          if (key === 'd') return void s.openMailbox('drafts');
        }
        if (first === '*') {
          if (key === 'a') return void s.setSelection(list.map((t) => t.id));
          if (key === 'n') return void s.clearSelection();
        }
      }
      if (key === 'g' || key === '*') {
        pending.current = { key, at: Date.now() };
        return;
      }

      const moveCursor = (delta: number) => {
        if (!list.length) return;
        const next = s.cursorIndex === null
          ? (delta > 0 ? 0 : list.length - 1)
          : Math.max(0, Math.min(list.length - 1, s.cursorIndex + delta));
        s.setCursor(next);
        requestAnimationFrame(() => {
          document.querySelector('.mail-row.cursor')?.scrollIntoView({ block: 'nearest' });
        });
      };

      switch (key) {
        case 'c':
          e.preventDefault();
          s.openCompose();
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('.search-input')?.focus();
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          moveCursor(1);
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          moveCursor(-1);
          break;
        case 'Enter':
        case 'o':
          if (cursorThread && !s.openThreadId) {
            e.preventDefault();
            s.openThread(cursorThread.id);
          }
          break;
        case 'x':
          if (cursorThread) s.toggleSelect(cursorThread.id);
          break;
        case 's':
          if (targetIds.length) s.star(targetIds);
          break;
        case 'e':
          if (s.openThreadId) s.archive([s.openThreadId]);
          else if (targetIds.length) s.archive(targetIds);
          break;
        case '!':
          if (targetIds.length) s.reportSpam(targetIds, true);
          break;
        case '#':
          if (s.openThreadId) s.moveToTrash([s.openThreadId]);
          else if (targetIds.length) s.moveToTrash(targetIds);
          break;
        case 'b':
          if (targetIds.length) {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            d.setHours(8, 0, 0, 0);
            s.snooze(targetIds, d.getTime());
          }
          break;
        case 'l':
          if (targetIds.length) document.querySelector<HTMLButtonElement>('.toolbar [aria-label="Labels"]')?.click();
          break;
        case 'I':
          if (targetIds.length) s.markRead(targetIds, true);
          break;
        case 'U':
          if (s.openThreadId) {
            s.markRead([s.openThreadId], false);
            s.closeThread();
          } else if (targetIds.length) s.markRead(targetIds, false);
          break;
        case 'r':
          if (s.openThreadId) {
            document.querySelector<HTMLButtonElement>('.thread-reply-area .reply-btn')?.click();
          }
          break;
        case 'u':
          if (s.openThreadId) s.closeThread();
          break;
        case 'Escape':
          if (s.compose) s.closeCompose(true);
          else if (s.selection.length) s.clearSelection();
          else if (s.openThreadId) s.closeThread();
          else if (s.view.kind === 'search') s.openMailbox('inbox');
          break;
        case '?':
          useUi.getState().openDialog('shortcuts');
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  const settings = useMail((s) => s.settings);
  const openThreadId = useMail((s) => s.openThreadId);
  const thread = useMail((s) => s.threads.find((t) => t.id === s.openThreadId));
  const checkSnoozes = useMail((s) => s.checkSnoozes);
  const isNarrow = useMedia('(max-width: 900px)');

  useGlobalKeys();

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.density = settings.density;
  }, [settings.theme, settings.density]);

  useEffect(() => {
    const id = window.setInterval(checkSnoozes, 30_000);
    return () => window.clearInterval(id);
  }, [checkSnoozes]);

  const showThread = !!openThreadId && !!thread;

  return (
    <div className={`app ${isNarrow ? 'narrow' : ''}`}>
      <Header />
      <div className="main">
        <Sidebar />
        <main className="content" aria-label="Mail">
          {showThread && thread ? <ThreadView key={thread.id} thread={thread} /> : <ListPane />}
        </main>
      </div>
      <Compose />
      <Toasts />
      <Dialogs />
    </div>
  );
}
