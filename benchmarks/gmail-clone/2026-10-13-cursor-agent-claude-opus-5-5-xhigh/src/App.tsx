import { useEffect } from "react";
import { useMail, getMail } from "./lib/store";
import { useUI, ui } from "./lib/ui";
import { navigate, useRoute } from "./lib/router";
import { runTick, startLiveMail } from "./lib/actions";
import { useIsMobile, useThemeClass } from "./hooks/useMedia";
import { useShortcuts } from "./hooks/useShortcuts";
import { Header } from "./components/Header";
import { MobileDrawer, Sidebar } from "./components/Sidebar";
import { MailList } from "./components/MailList";
import { ThreadView } from "./components/ThreadView";
import { SettingsPage } from "./components/SettingsPage";
import { ComposeDock } from "./components/ComposeDock";
import { preloadComposer } from "./components/LazyComposer";
import { Overlays, Toaster } from "./components/Overlays";
import { QuickSettings, RightRail, SidePanel } from "./components/Panels";
import { ComposeFab, MobileSearch, MobileSelectionBar } from "./components/Mobile";
import { AttachmentPreview } from "./components/Attachments";
import { APP_TITLE, LogoMark } from "./components/Logo";
import { Avatar, Button, Icon } from "./components/ui";
import { cn } from "./lib/utils";
import { ErrorBoundary } from "./components/ErrorBoundary";

function useBackground() {
  useEffect(() => {
    const net = () => ui().set({ online: navigator.onLine });
    net();
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    startLiveMail();
    runTick();
    const iv = window.setInterval(runTick, 15_000);
    const preload = window.setTimeout(preloadComposer, 1200);
    const onVisible = () => document.visibilityState === "visible" && runTick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(iv);
      clearTimeout(preload);
    };
  }, []);
}

function useDocumentTitle() {
  useEffect(() => {
    document.title = APP_TITLE;
  }, []);
}

function SignedOut() {
  const account = useMail((s) => s.account);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-[448px] rounded-[28px] bg-surface p-8 shadow-e1 sm:p-10">
        <LogoMark size={48} />
        <h1 className="mt-4 font-sans text-[28px] leading-9 text-fg">{APP_TITLE}</h1>
        <p className="mt-2 font-body text-base text-fg-2">Choose an account to continue</p>
        <button
          type="button"
          onClick={() => getMail().setSignedOut(false)}
          className="mt-8 flex w-full items-center gap-4 rounded-2xl border border-outline-soft px-4 py-3 text-left hover:bg-hover"
        >
          <Avatar name={account.name} email={account.email} color={account.color} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-sans text-sm font-medium text-fg">{account.name}</div>
            <div className="truncate font-body text-sm text-fg-2">{account.email}</div>
          </div>
          <span className="font-body text-xs text-fg-3">Signed out</span>
        </button>
        <p className="mt-6 font-body text-xs leading-5 text-fg-3">Your mailbox stays on this device while you're signed out.</p>
        <div className="mt-8 flex justify-end">
          <Button onClick={() => getMail().setSignedOut(false)}>Sign in</Button>
        </div>
      </div>
    </main>
  );
}

function EmptyReading() {
  const selected = useUI((s) => s.selected.length);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center font-sans text-fg-3">
      <Icon name={selected ? "check_box" : "mail"} size={56} className="opacity-60" />
      <div className="text-sm">{selected ? `${selected} conversation${selected === 1 ? "" : "s"} selected` : "No conversations selected"}</div>
    </div>
  );
}

function Main() {
  const route = useRoute();
  const isMobile = useIsMobile();
  const pane = useMail((s) => s.settings.readingPane);
  const { view, tab, page, threadId } = route;

  if (view.kind === "settings") return <SettingsPage tab={view.tab} />;

  if (!isMobile && pane !== "none") {
    return (
      <div className={cn("flex h-full min-h-0", pane === "right" ? "flex-row" : "flex-col")}>
        <div className={cn("min-h-0 min-w-0", pane === "right" ? "w-[44%] min-w-[340px] max-w-[620px] border-r border-line" : "h-[48%] border-b border-line")}>
          <MailList view={view} tab={tab} page={page} split activeThreadId={threadId} />
        </div>
        <div className="min-h-0 min-w-0 flex-1">{threadId ? <ThreadView key={threadId} threadId={threadId} view={view} tab={tab} page={page} split /> : <EmptyReading />}</div>
      </div>
    );
  }

  if (threadId) return <ThreadView key={threadId} threadId={threadId} view={view} tab={tab} page={page} />;
  return <MailList view={view} tab={tab} page={page} />;
}

function Shell() {
  const isMobile = useIsMobile();
  const route = useRoute();
  const quick = useUI((s) => s.quickSettings);
  const panel = useUI((s) => s.sidePanel);
  const hideMobileHeader = isMobile && (!!route.threadId || route.view.kind === "settings");

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      {!hideMobileHeader && <Header />}
      {isMobile && <MobileSelectionBar />}
      <div className={cn("flex min-h-0 flex-1", !isMobile && "gap-2 pb-4")}>
        {!isMobile && <Sidebar />}
        <main data-main-scroll className={cn("min-h-0 min-w-0 flex-1 overflow-hidden bg-surface", !isMobile && "rounded-2xl")}>
          <ErrorBoundary
            key={route.hash}
            fallback={(reset) => (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center font-sans text-fg-2">
                <Icon name="error" size={40} className="text-danger" />
                Something went wrong showing this view.
                <div className="flex gap-2">
                  <Button variant="outlined" onClick={() => (navigate("inbox"), reset())}>Go to Inbox</Button>
                  <Button onClick={reset}>Try again</Button>
                </div>
              </div>
            )}
          >
            <Main />
          </ErrorBoundary>
        </main>
        {!isMobile && quick && <QuickSettings />}
        {!isMobile && !quick && panel && <SidePanel />}
        {!isMobile && <RightRail />}
      </div>
      {isMobile && quick && (
        <div className="fixed inset-0 z-[78] bg-surface">
          <QuickSettings />
        </div>
      )}
      {isMobile && <MobileDrawer />}
      {isMobile && <ComposeFab />}
      {isMobile && <MobileSearch />}
      <ComposeDock />
      <AttachmentPreview />
      <Toaster />
      <Overlays />
    </div>
  );
}

export default function App() {
  useThemeClass();
  useShortcuts();
  useBackground();
  useDocumentTitle();
  const signedOut = useMail((s) => s.signedOut);
  return signedOut ? <SignedOut /> : <Shell />;
}
