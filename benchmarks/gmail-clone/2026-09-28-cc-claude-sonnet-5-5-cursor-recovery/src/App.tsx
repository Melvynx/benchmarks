import { useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ListPane } from './components/MailList';
import { ThreadPlaceholder, ThreadView } from './components/ThreadView';
import { SettingsPage } from './components/Settings';
import { ComposeHost } from './components/Compose';
import { DialogHost, Toasts } from './components/Dialogs';
import { Icon } from './components/kit';
import { useMail } from './lib/store';
import { ViewProvider, useViewModel } from './lib/viewModel';
import { usePrefs, useTicker, useViewport } from './lib/hooks';
import { useShortcuts } from './lib/shortcuts';
import { setUI, useUI } from './lib/ui';
import { composeNew } from './lib/actions';

function Shell() {
  const mail = useMail();
  const vm = useViewModel();
  const ui = useUI();
  const vp = useViewport();
  usePrefs(mail.settings);
  useTicker();
  useShortcuts();

  const settings = mail.settings;
  const isMail = vm.page === 'mail';
  const split = vp === 'desktop' && settings.readingPane === 'right' && isMail;
  const collapsed = vp === 'desktop' && settings.sidebarCollapsed;
  const inThread = isMail && !!vm.threadId;

  // Leaving a small viewport closes the drawer.
  useEffect(() => {
    if (vp === 'desktop' && ui.drawerOpen) setUI({ drawerOpen: false });
  }, [vp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setUI({ drawerOpen: false });
  }, [vm.route]);

  let content;
  if (!isMail) content = <SettingsPage />;
  else if (split)
    content = (
      <div className="split">
        <ListPane compactSplit />
        <div className="split-thread">{vm.threadId ? <ThreadView threadId={vm.threadId} embedded /> : <ThreadPlaceholder />}</div>
      </div>
    );
  else if (vm.threadId) content = <ThreadView key={vm.threadId} threadId={vm.threadId} />;
  else content = <ListPane />;

  const showFab = vp === 'mobile' && isMail && !inThread && ui.selection.keys.length === 0 && !ui.selection.allInView && ui.composes.length === 0;

  return (
    <div className="app" data-vp={vp} data-collapsed={collapsed} data-thread={inThread} data-split={split}>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to main content
      </a>
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="main" id="main" tabIndex={-1}>
          {content}
        </main>
      </div>
      {showFab && (
        <button type="button" className="fab" onClick={() => composeNew()} aria-label="Compose">
          <Icon name="edit" />
          <span>Compose</span>
        </button>
      )}
      <ComposeHost />
      <Toasts />
      <DialogHost />
    </div>
  );
}

export default function App() {
  return (
    <ViewProvider>
      <Shell />
    </ViewProvider>
  );
}
