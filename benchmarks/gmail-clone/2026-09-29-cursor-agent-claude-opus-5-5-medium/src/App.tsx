import { useEffect, useRef } from "react";
import clsx from "clsx";
import { Pencil } from "lucide-react";
import { useMail } from "./lib/store";
import { currentRoute, listRoute, navigate, useRoute } from "./lib/router";
import { visibleRows } from "./lib/hooks";
import { TopBar } from "./components/TopBar";
import { MobileDrawer, Sidebar } from "./components/Sidebar";
import { MailList, MobileSelectionBar } from "./components/MailList";
import { EmptyPane, ThreadView } from "./components/ThreadView";
import { ComposeDock } from "./components/Compose";
import { LabelDialog, SettingsPanel, ShortcutsDialog, Toasts } from "./components/Overlays";
import { AttachmentPreview } from "./components/Attachments";
import { TooltipLayer, useIsMobile, useMediaQuery } from "./components/ui";

function useTheme() {
  const theme = useMail((s) => s.settings.theme);
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  useEffect(() => {
    const dark = theme === "dark" || (theme === "system" && systemDark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#111316" : "#f6f8fc");
  }, [theme, systemDark]);
}

function useTicker() {
  const tick = useMail((s) => s.tick);
  useEffect(() => {
    tick();
    const id = setInterval(tick, 5000);
    const vis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [tick]);
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

function clickTool(prefix: string) {
  const btn = Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-tip]")).find((b) => b.dataset.tip?.startsWith(prefix));
  btn?.click();
}

function useShortcuts() {
  const prefix = useRef<{ key: string; at: number } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useMail.getState();
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
      if (document.querySelector('[role="dialog"][aria-modal]')) return;
      const route = currentRoute();
      const key = e.key;

      if (key === "Escape") {
        if (s.selected.length) s.setSelected([]);
        return;
      }
      if (!s.settings.shortcuts) return;

      const pre = prefix.current && Date.now() - prefix.current.at < 1200 ? prefix.current.key : null;
      prefix.current = null;
      if (pre === "g") {
        const map: Record<string, Parameters<typeof navigate>[0]> = {
          i: { view: "inbox" }, s: { view: "starred" }, t: { view: "sent" }, d: { view: "drafts" }, a: { view: "all" }, b: { view: "snoozed" },
        };
        if (map[key]) {
          e.preventDefault();
          navigate(map[key]);
        }
        return;
      }
      if (pre === "*") {
        const ids = visibleRows.ids;
        const th = s.threads;
        const pick: Record<string, (id: string) => boolean> = {
          a: () => true, n: () => false, u: (id) => th[id]?.unread, r: (id) => !th[id]?.unread, s: (id) => th[id]?.starred,
        };
        if (pick[key]) s.setSelected(ids.filter(pick[key]));
        return;
      }
      if (key === "g" || key === "*") {
        prefix.current = { key, at: Date.now() };
        return;
      }

      const open = route.threadId;
      const targets = open ? [open] : s.selected.length ? s.selected : s.cursorId && visibleRows.ids.includes(s.cursorId) ? [s.cursorId] : [];
      const back = () => open && navigate(listRoute(route));
      const moveCursor = (d: number) => {
        const ids = visibleRows.ids;
        if (!ids.length) return;
        const i = s.cursorId ? ids.indexOf(s.cursorId) : -1;
        const next = ids[Math.max(0, Math.min(ids.length - 1, i + d))];
        if (open) {
          const cur = ids.indexOf(open);
          const n = ids[cur + d];
          if (n) navigate({ ...route, threadId: n });
        } else s.setCursor(next);
      };

      switch (key) {
        case "c": e.preventDefault(); s.openCompose(); break;
        case "/": e.preventDefault(); window.dispatchEvent(new Event("mail:focus-search")); break;
        case "?": s.set({ shortcutsOpen: true }); break;
        case "j": moveCursor(1); break;
        case "k": moveCursor(-1); break;
        case "o":
        case "Enter":
          if (!open && s.cursorId) navigate({ ...listRoute(route), threadId: s.cursorId });
          break;
        case "u": back(); break;
        case "x": if (!open && s.cursorId) s.toggleSelected(s.cursorId); break;
        case "s":
          if (targets.length) s.setStarred(targets, !targets.every((id) => s.threads[id]?.starred));
          break;
        case "e": if (targets.length) { s.archive(targets); back(); } break;
        case "#": if (targets.length) { s.trash(targets); back(); } break;
        case "!": if (targets.length) { s.markSpam(targets); back(); } break;
        case "m": if (targets.length) { s.toggleMute(targets); back(); } break;
        case "I": if (targets.length) s.setUnread(targets, false); break;
        case "U": if (targets.length) { s.setUnread(targets, true); back(); } break;
        case "r": if (open) window.dispatchEvent(new CustomEvent("mail:reply", { detail: "reply" })); break;
        case "a": if (open) window.dispatchEvent(new CustomEvent("mail:reply", { detail: "replyAll" })); break;
        case "f": if (open) window.dispatchEvent(new CustomEvent("mail:reply", { detail: "forward" })); break;
        case "b":
        case "l":
        case "v": {
          if (!targets.length) break;
          if (!open && !s.selected.length) s.setSelected(targets);
          const tip = key === "b" ? "Snooze" : key === "l" ? "Labels" : "Move to";
          setTimeout(() => clickTool(tip), 0);
          break;
        }
        case "z": {
          const t = [...s.toasts].reverse().find((x) => x.action?.label === "Undo");
          if (t) {
            t.action!.run();
            s.dismissToast(t.id);
          }
          break;
        }
        default: return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}

export default function App() {
  useTheme();
  useTicker();
  useShortcuts();
  const route = useRoute();
  const isMobile = useIsMobile();
  const readingPane = useMail((s) => s.settings.readingPane);
  const setSelected = useMail((s) => s.setSelected);
  const openCompose = useMail((s) => s.openCompose);
  const selectedCount = useMail((s) => s.selected.length);
  const listKey = `${route.view}|${route.category}|${route.labelId}|${route.query}`;

  useEffect(() => {
    setSelected([]);
  }, [listKey, setSelected]);

  useEffect(() => {
    if (route.view === "drafts" || route.view === "scheduled") {
      if (route.threadId) navigate(listRoute(route), true);
    }
  }, [route]);

  const split = !isMobile && readingPane === "right" && route.view !== "drafts" && route.view !== "scheduled";

  if (isMobile) {
    return (
      <div className="flex h-full flex-col bg-surface">
        {route.threadId ? (
          <ThreadView threadId={route.threadId} />
        ) : (
          <>
            {selectedCount > 0 ? <MobileSelectionBar /> : <TopBar />}
            <div className="min-h-0 flex-1">
              <MailList />
            </div>
            {selectedCount === 0 && (
              <button
                onClick={() => openCompose()}
                className="anim-pop no-print fixed bottom-5 right-4 z-30 flex h-14 items-center gap-3 rounded-2xl bg-compose pl-4 pr-5 text-compose-ink shadow-float"
              >
                <Pencil size={22} />
                <span className="text-sm font-medium">Compose</span>
              </button>
            )}
          </>
        )}
        <MobileDrawer />
        <ComposeDock />
        <Overlays />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main
          className={clsx(
            "print-area mb-4 mr-4 flex min-w-0 flex-1 overflow-hidden rounded-2xl bg-surface",
          )}
        >
          {split ? (
            <>
              <div className="min-w-[380px] max-w-[46%] flex-1 border-r border-divider">
                <MailList compactPane />
              </div>
              <div className="min-w-0 flex-[1.2]">
                {route.threadId ? <ThreadView key={route.threadId} threadId={route.threadId} pane /> : <EmptyPane />}
              </div>
            </>
          ) : route.threadId ? (
            <div className="min-w-0 flex-1">
              <ThreadView threadId={route.threadId} />
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <MailList />
            </div>
          )}
        </main>
      </div>
      <ComposeDock />
      <Overlays />
    </div>
  );
}

function Overlays() {
  return (
    <>
      <Toasts />
      <SettingsPanel />
      <ShortcutsDialog />
      <LabelDialog />
      <AttachmentPreview />
      <TooltipLayer />
    </>
  );
}
