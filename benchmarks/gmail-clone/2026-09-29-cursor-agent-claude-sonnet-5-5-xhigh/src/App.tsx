import { useEffect } from 'react';
import { Pencil, WifiOff } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MailView } from './components/MailView';
import { ComposeDock } from './components/Compose';
import { AttachmentPreview } from './components/Attachments';
import { ConfirmDialog, LabelDialog, ShortcutsHelp, Toasts } from './components/Overlays';
import { QuickSettings } from './components/Settings';
import { useMail } from './lib/store';
import { useUI } from './lib/ui';
import { useRoute, navigate } from './lib/router';
import { useIsMobile } from './lib/hooks';
import { composeNew } from './lib/actions';
import { firstName } from './lib/text';

function useAppearance() {
  const theme = useMail((s) => s.settings.theme);
  const accent = useMail((s) => s.settings.accent);
  const density = useMail((s) => s.settings.density);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      root.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);
}

function useTicker() {
  useEffect(() => {
    const run = () => {
      const res = useMail.getState().tick();
      for (const m of res.arrived) {
        useUI.getState().toast(`New message from ${firstName(m.from.name || m.from.email)}`, [
          { label: 'View', run: () => navigate({ view: 'inbox', threadId: m.threadId }) },
        ]);
      }
      for (const d of res.sent) {
        useUI.getState().toast(d.subject ? `Scheduled message “${d.subject}” was sent.` : 'Scheduled message was sent.');
      }
      for (const t of res.woken) {
        useUI.getState().toast(`Snoozed: “${t.subject}” is back in your inbox.`, [
          { label: 'View', run: () => navigate({ view: 'inbox', threadId: t.id }) },
        ]);
      }
    };
    run();
    const id = setInterval(run, 4000);
    return () => clearInterval(id);
  }, []);
}

function useOnline() {
  const online = useUI((s) => s.online);
  useEffect(() => {
    const on = () => useUI.getState().set({ online: true });
    const off = () => useUI.getState().set({ online: false });
    useUI.getState().set({ online: navigator.onLine });
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function App() {
  const route = useRoute();
  const mobile = useIsMobile();
  const composeOpen = useUI((s) => s.compose.length > 0);
  const online = useOnline();
  useAppearance();
  useTicker();

  useEffect(() => {
    useUI.getState().set({ drawerOpen: false });
  }, [route.view, route.param]);

  const showFab = mobile && !composeOpen && !route.threadId && route.view !== 'settings';

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Header />
      {!online ? (
        <div className="offline-bar" role="status">
          <WifiOff size={16} /> You are offline. Changes are saved on this device.
        </div>
      ) : null}
      <div className="app__body">
        <Sidebar />
        <MailView />
      </div>
      {showFab ? (
        <button type="button" className="fab" onClick={() => composeNew()} aria-label="Compose">
          <Pencil size={22} />
          <span>Compose</span>
        </button>
      ) : null}
      <ComposeDock />
      <QuickSettings />
      <AttachmentPreview />
      <ShortcutsHelp />
      <LabelDialog />
      <ConfirmDialog />
      <Toasts />
    </div>
  );
}
