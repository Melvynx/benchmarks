import { MdEdit } from 'react-icons/md';
import { ComposeDock } from './components/compose/Composer';
import { AttachmentPreview, ConfirmDialog, LabelDialog, QuickSettings, ShortcutsDialog, Toasts } from './components/Dialogs';
import { Header } from './components/Header';
import { MailView } from './components/MailView';
import { DateTimeDialogHost } from './components/menus';
import { SettingsPage } from './components/SettingsPage';
import { Sidebar } from './components/Sidebar';
import { TooltipLayer } from './components/ui';
import { useIsMobile } from './hooks';
import { useTheme, useTicker } from './hooks/useAppEffects';
import { useShortcuts } from './hooks/useShortcuts';
import { openCompose } from './lib/composeActions';
import { useRoute } from './lib/router';
import { useUI } from './store/ui';

export default function App() {
  const route = useRoute();
  const isMobile = useIsMobile();
  useTheme();
  useTicker();
  useShortcuts();

  return (
    <div className="print-flow flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <Header />
      <div className="print-flow flex min-h-0 flex-1">
        <Sidebar />
        <main className="print-flow min-w-0 flex-1 overflow-hidden bg-panel md:mr-2 md:mb-2 md:rounded-2xl" data-testid="main">
          {route.view === 'settings' ? <SettingsPage tab={route.tab} /> : <MailView route={route} />}
        </main>
        <QuickSettings />
      </div>
      {isMobile && <MobileFab hidden={route.view === 'settings' || !!route.threadId} />}
      <ComposeDock />
      <Toasts />
      <ConfirmDialog />
      <LabelDialog />
      <ShortcutsDialog />
      <AttachmentPreview />
      <DateTimeDialogHost />
      <TooltipLayer />
    </div>
  );
}

function MobileFab({ hidden }: { hidden: boolean }) {
  const composing = useUI((s) => s.composes.length > 0);
  const selecting = useUI((s) => s.selected.length > 0);
  if (hidden || composing || selecting) return null;
  return (
    <button
      type="button"
      onClick={() => openCompose()}
      className="print-hide fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-14 items-center gap-3 rounded-2xl bg-compose pr-5 pl-4 text-sm font-medium text-compose-fg shadow-e2 active:scale-95"
      data-testid="mobile-compose"
    >
      <MdEdit size={22} /> Compose
    </button>
  );
}
