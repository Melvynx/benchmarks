import { useEffect, useRef, useState } from "react";
import { ComposeDock, ComposeFab } from "./components/Compose";
import { MailList } from "./components/MailList";
import { Dialogs, SettingsPanel, Toaster } from "./components/Overlays";
import { MobileDrawer, Sidebar } from "./components/Sidebar";
import { ThreadView } from "./components/ThreadView";
import { TopBar } from "./components/TopBar";
import { Icon, TooltipLayer } from "./components/ui";
import { openNewCompose } from "./lib/actions";
import { useApplyTheme, useCounts, useIsMobile, useIsNarrow, useRoute } from "./lib/hooks";
import { navigate } from "./lib/router";
import { useShortcuts } from "./lib/shortcuts";
import { useMail } from "./lib/store";
import type { ReadingPane, Route } from "./lib/types";
import { useUI } from "./lib/ui";
import { cn } from "./lib/utils";

function useTicker() {
  useEffect(() => {
    let lastNow = 0;
    const run = () => {
      const now = Date.now();
      const delivered = useMail.getState().tick(now);
      if (delivered.length || now - lastNow > 30_000) {
        lastNow = now;
        useUI.getState().setNow(now);
      }
      if (delivered.length && !useUI.getState().toast) {
        const d = delivered[delivered.length - 1];
        useUI.getState().showToast({
          message: `New message from ${d.from.name}`,
          action: { label: "Open", run: () => navigate(`#all/${d.threadId}`) },
          duration: 5000,
        });
      }
    };
    run();
    const id = window.setInterval(run, 5000);
    return () => window.clearInterval(id);
  }, []);
}

export default function App() {
  useApplyTheme();
  useShortcuts();
  useTicker();
  const route = useRoute();
  const isMobile = useIsMobile();
  const isNarrow = useIsNarrow();
  const readingPane = useMail((s) => s.settings.readingPane);
  const settingsOpen = useUI((s) => s.settingsOpen);
  const [fabExtended, setFabExtended] = useState(true);

  useEffect(() => {
    const h = () => openNewCompose();
    window.addEventListener("open-compose", h);
    return () => window.removeEventListener("open-compose", h);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    let last = 0;
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (!el.closest?.("main")) return;
      const y = el.scrollTop;
      setFabExtended(y < 40 || y < last);
      last = y;
    };
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [isMobile]);

  const split = !isMobile && readingPane !== "none";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app text-fg">
      {!(isMobile && route.threadId) && <TopBar />}
      <div className="flex min-h-0 flex-1">
        {!isMobile && <Sidebar forceCollapsed={isNarrow} />}
        <main
          className={cn(
            "min-w-0 flex-1 overflow-hidden bg-surface transition-[margin] duration-200",
            !isMobile && "mb-4 mr-4 rounded-2xl",
            settingsOpen && !isMobile && "lg:mr-[356px]",
          )}
        >
          {split ? (
            <SplitView route={route} pane={readingPane} />
          ) : route.threadId ? (
            <ThreadView view={route.view} threadId={route.threadId} />
          ) : (
            <MailList view={route.view} />
          )}
        </main>
      </div>
      {isNarrow && <MobileDrawer />}
      <ComposeDock />
      {isMobile && !route.threadId && <ComposeFab extended={fabExtended} />}
      <Toaster />
      <Dialogs />
      <SettingsPanel />
      <TooltipLayer />
    </div>
  );
}

const clampPane = (pct: number) => Math.round(Math.min(72, Math.max(26, pct)));

function SplitView({ route, pane }: { route: Route; pane: ReadingPane }) {
  const saved = useMail((s) => s.settings.paneSize);
  const update = useMail((s) => s.updateSettings);
  const ref = useRef<HTMLDivElement>(null);
  const horizontal = pane === "right";
  const [live, setLive] = useState<number | null>(null);
  const size = live ?? saved;

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = ref.current!.getBoundingClientRect();
    let last = saved;
    setLive(saved);
    const move = (ev: PointerEvent) => {
      const pct = horizontal ? ((ev.clientX - rect.left) / rect.width) * 100 : ((ev.clientY - rect.top) / rect.height) * 100;
      last = clampPane(pct);
      setLive(last);
    };
    const up = () => {
      update({ paneSize: last });
      setLive(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const dec = horizontal ? "ArrowLeft" : "ArrowUp";
    const inc = horizontal ? "ArrowRight" : "ArrowDown";
    if (e.key !== dec && e.key !== inc && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 26 : e.key === "End" ? 72 : saved + (e.key === inc ? step : -step);
    update({ paneSize: clampPane(next) });
  };
  const dragging = live !== null;

  return (
    <div ref={ref} className={cn("flex h-full", horizontal ? "flex-row" : "flex-col", dragging && "select-none")}>
      <div className="min-h-0 min-w-0 shrink-0 overflow-hidden" style={{ flexBasis: `${size}%` }}>
        <MailList view={route.view} activeThreadId={route.threadId} split />
      </div>
      <div
        role="separator"
        aria-orientation={horizontal ? "vertical" : "horizontal"}
        aria-label="Resize reading pane"
        aria-valuenow={size}
        aria-valuemin={26}
        aria-valuemax={72}
        tabIndex={0}
        onPointerDown={onDown}
        onKeyDown={onKey}
        onDoubleClick={() => update({ paneSize: 42 })}
        className={cn(
          "group relative shrink-0 bg-line-soft transition-colors hover:bg-accent/40 focus-visible:bg-accent focus-visible:outline-none",
          horizontal ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
          dragging && "bg-accent",
        )}
      >
        <span className={cn("absolute", horizontal ? "inset-y-0 -left-1.5 -right-1.5" : "inset-x-0 -bottom-1.5 -top-1.5")} />
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {route.threadId ? <ThreadView view={route.view} threadId={route.threadId} split /> : <EmptyPane />}
      </div>
    </div>
  );
}

function EmptyPane() {
  const counts = useCounts();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-fg-3">
      <Icon name="drafts" size={56} className="opacity-60" />
      <div className="font-display text-lg text-fg-2">No conversation selected</div>
      <div className="text-sm">
        {counts.inbox ? `${counts.inbox} unread in Primary` : "You're all caught up"} · Use <kbd className="rounded border border-line px-1">j</kbd>/<kbd className="rounded border border-line px-1">k</kbd> to move and{" "}
        <kbd className="rounded border border-line px-1">o</kbd> to open
      </div>
    </div>
  );
}
