import { useEffect } from 'react';
import { MdOutlineMail } from 'react-icons/md';
import { AttachmentViewer } from './components/attachments';
import { ComposeDock } from './components/Compose';
import { Header } from './components/Header';
import { MailList } from './components/MailList';
import { LabelDialog, Notices, QuickSettings, ShortcutsHelp, SignedOut, TINTS, ToastHost } from './components/overlays';
import { TooltipLayer } from './components/primitives';
import { Settings } from './components/Settings';
import { AppRail, SidePanel } from './components/SidePanel';
import { Sidebar } from './components/Sidebar';
import { ScheduledPreview, ThreadView } from './components/ThreadView';
import { useIsMobile, useMediaQuery, useSystemDark } from './hooks';
import { useShortcuts } from './keyboard';
import { onSendCompleted, viewSent } from './lib/actions';
import { useRoute } from './lib/router';
import { useMail } from './store/mail';
import { isDraftEmpty } from './store/selectors';
import { useUI } from './store/ui';

function useTheme() {
  const theme = useMail((s) => s.settings.theme);
  const tint = useMail((s) => s.settings.tint);
  const density = useMail((s) => s.settings.density);
  const systemDark = useSystemDark();
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.tint = tint;
    root.dataset.density = density;
    root.style.colorScheme = dark ? 'dark' : 'light';
    const t = TINTS.find((x) => x.id === tint) ?? TINTS[0];
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? t.dark : t.light);
  }, [dark, tint, density]);
}

function useTicker() {
  useEffect(() => {
    const tick = () => {
      const events = useMail.getState().tick(Date.now());
      const ui = useUI.getState();
      for (const ev of events) {
        if (ev.type === 'incoming') {
          ui.pushNotice({ from: ev.from, title: `${ev.from.name}: ${ev.subject}`, body: ev.snippet, threadId: ev.threadId });
        } else if (ev.type === 'sent') {
          if (ev.scheduled) ui.showToast('Scheduled message sent.', [{ label: 'View message', run: () => viewSent(ev.threadId) }]);
          else onSendCompleted(ev.threadId);
        } else if (ev.type === 'unsnoozed') {
          const t = useMail.getState().threads[ev.threadId];
          const from = t?.messages[t.messages.length - 1]?.from;
          if (from) ui.pushNotice({ from, title: 'Back from snooze', body: ev.subject, threadId: ev.threadId });
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
}

/** Compose windows don't survive a reload, so any untouched draft left behind is an orphan. */
function usePruneEmptyDrafts() {
  useEffect(() => {
    const { drafts, settings, deleteDraft } = useMail.getState();
    for (const d of Object.values(drafts)) {
      if (!d.scheduledAt && !d.outgoing && isDraftEmpty(d, settings.signature)) deleteDraft(d.id);
    }
  }, []);
}

export function App() {
  const route = useRoute();
  const mobile = useIsMobile();
  const wide = useMediaQuery('(min-width: 1180px)');
  const readingPane = useMail((s) => s.settings.readingPane);
  const sidePanel = useMail((s) => s.settings.sidePanel);
  const signedOut = useUI((s) => s.signedOut);
  useTheme();
  useTicker();
  useShortcuts();
  usePruneEmptyDrafts();

  useEffect(() => {
    useUI.getState().set({ navOpen: false });
  }, [route]);

  if (signedOut) return <SignedOut />;

  const split = readingPane === 'right' && wide && route.view !== 'settings';
  let main;
  if (route.view === 'settings') main = <Settings tab={route.tab} />;
  else if (route.view === 'folder' && route.folder === 'scheduled' && route.threadId) main = <ScheduledPreview draftId={route.threadId} />;
  else if (split) {
    main = (
      <div className="split">
        <MailList route={route} split />
        <div className="split-pane">
          {route.threadId ? (
            <ThreadView route={route} threadId={route.threadId} split />
          ) : (
            <div className="split-empty">
              <MdOutlineMail aria-hidden />
              <p>No conversation selected</p>
            </div>
          )}
        </div>
      </div>
    );
  } else if (route.threadId) main = <ThreadView route={route} threadId={route.threadId} />;
  else main = <MailList route={route} />;

  return (
    <div className={`app ${mobile ? 'is-mobile' : ''} ${sidePanel ? 'has-panel' : ''}`}>
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="main" id="main">{main}</main>
        {sidePanel && <SidePanel />}
        {!mobile && <AppRail />}
      </div>
      <ComposeDock />
      <Notices />
      <ToastHost />
      <AttachmentViewer />
      <LabelDialog />
      <ShortcutsHelp />
      <QuickSettings />
      <TooltipLayer />
    </div>
  );
}
