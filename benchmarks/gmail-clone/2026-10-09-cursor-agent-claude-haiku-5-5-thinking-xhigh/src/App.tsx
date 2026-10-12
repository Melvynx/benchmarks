import { useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { useMediaQuery, useRoute, useTheme } from './hooks/useApp';
import { useShortcuts } from './hooks/useShortcuts';
import { sectionKey } from './lib/route';
import { ComposeWindows } from './components/compose/ComposeWindows';
import { ConfirmDialog } from './components/dialogs/ConfirmDialog';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import { ShortcutsDialog } from './components/dialogs/ShortcutsDialog';
import { DraftList } from './components/list/DraftList';
import { MailList } from './components/list/MailList';
import { OfflineBanner } from './components/shell/OfflineBanner';
import { Sidebar } from './components/shell/Sidebar';
import { TopBar } from './components/shell/TopBar';
import { ThreadView } from './components/thread/ThreadView';
import { FloatingMenus, Toaster } from './components/ui/Overlays';
import { startNewCompose, startReplyCompose } from './store/commands';
import { useMail } from './store/mailStore';
import { runScheduler } from './store/scheduler';
import { useUI } from './store/uiStore';

export default function App() {
  const route = useRoute();
  const settings = useMail((s) => s.data.settings);
  const pendingReply = useUI((s) => s.pendingReply);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const wide = useMediaQuery('(min-width: 1180px)');

  useTheme(settings.theme);
  useShortcuts(route);

  // A new mailbox section starts on page one with nothing selected.
  const sectionId = sectionKey(route.section);
  useEffect(() => {
    useUI.getState().setPage(0);
    useUI.getState().setSelected([]);
  }, [sectionId]);

  // Undo-send, scheduled sends, snoozes and simulated incoming mail all run through this tick.
  useEffect(() => {
    runScheduler();
    const id = window.setInterval(runScheduler, 500);
    return () => window.clearInterval(id);
  }, []);

  // `r` / `a` in the keyboard map request a reply; the app owns opening the compose window.
  useEffect(() => {
    if (!pendingReply) return;
    useUI.getState().consumeReply();
    const thread = useMail.getState().data.threads.find((t) => t.id === pendingReply.threadId);
    if (thread) useUI.getState().openCompose(startReplyCompose(thread, pendingReply.mode));
  }, [pendingReply]);

  const folder = route.section.kind === 'folder' ? route.section.folder : null;
  const isDraftsView = folder === 'drafts' || folder === 'scheduled';
  const showThread = route.threadId !== null && !isDraftsView;
  const split = showThread && isDesktop && wide && settings.readingPane;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-app text-ink">
      <TopBar route={route} />
      <div className="flex min-h-0 flex-1">
        <Sidebar route={route} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col md:pb-2 md:pr-2">
          <OfflineBanner />
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-surface md:rounded-2xl md:shadow-sm">
            {isDraftsView ? (
              <DraftList folder={folder === 'scheduled' ? 'scheduled' : 'drafts'} />
            ) : split ? (
              <>
                <div className="flex min-h-0 w-[min(440px,40%)] shrink-0 flex-col border-r border-line">
                  <MailList route={route} stacked />
                </div>
                <ThreadView route={route} />
              </>
            ) : showThread ? (
              <ThreadView route={route} />
            ) : (
              <MailList route={route} stacked={!isDesktop} />
            )}
          </div>
        </main>
      </div>

      {!isDesktop && (
        <button
          type="button"
          aria-label="Compose"
          onClick={startNewCompose}
          className="fixed bottom-5 right-4 z-30 flex size-14 items-center justify-center rounded-2xl bg-compose text-ink shadow-lg transition-shadow hover:shadow-xl"
        >
          <Pencil className="size-6" />
        </button>
      )}

      <Toaster />
      <FloatingMenus />
      <ComposeWindows />
      <SettingsDialog />
      <ShortcutsDialog />
      <ConfirmDialog />
    </div>
  );
}
