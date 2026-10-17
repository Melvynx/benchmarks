import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MailProvider, useMail } from "./store/mail";
import { listRoute, navigate, useRoute } from "./lib/router";
import { threadsForRoute } from "./lib/views";
import { Header } from "./components/Header";
import type { SearchHandle } from "./components/SearchBar";
import { Sidebar } from "./components/Sidebar";
import { DraftList, MailList } from "./components/MailList";
import { ThreadView } from "./components/ThreadView";
import { ComposerWindows } from "./components/Composer";
import { QuickSettings, SettingsPage, ShortcutsDialog } from "./components/Settings";
import { LabelDialog } from "./components/LabelDialog";
import { AttachmentPreview } from "./components/Attachments";
import { ConfirmHost, ToastHost, TooltipHost } from "./ui/Overlays";
import { UICtx, type UI } from "./components/uiContext";
import { Icon } from "./ui/Icon";
import type { Draft, Route } from "./types";

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

export default function App() {
  return (
    <MailProvider>
      <Shell />
    </MailProvider>
  );
}

const isTyping = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  if (!e) return false;
  return e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.tagName === "SELECT" || e.isContentEditable;
};

function Shell() {
  const route = useRoute();
  const { state, api, openWindow, pendingConfirm } = useMail();
  const isMobile = useMedia("(max-width: 760px)");
  const prefersDark = useMedia("(prefers-color-scheme: dark)");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [pages, setPages] = useState<Record<string, number>>({});
  const [mobileNav, setMobileNav] = useState(false);
  const [qs, setQs] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [labelDlg, setLabelDlg] = useState<{ open: boolean; editId?: string; applyTo?: string[] }>({ open: false });
  const [preview, setPreview] = useState<string | null>(null);
  const searchRef = useRef<SearchHandle>(null);

  const s = state.settings;
  const theme = s.theme === "system" ? (prefersDark ? "dark" : "light") : s.theme;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#1b1b1b" : "#f6f8fc");
  }, [theme]);

  const lr = listRoute(route);
  const listKey = `${lr.view}:${lr.param ?? ""}`;
  const list = useMemo(() => threadsForRoute(state, lr), [state.threads, state.labels, s.inboxTabs, listKey]);
  const page = pages[listKey] ?? 0;
  const setPage = (p: number) => {
    setPages((x) => ({ ...x, [listKey]: p }));
    setSelected(new Set());
    setCursor(0);
  };
  const pageSize = s.pageSize;
  const visible = list.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    setSelected(new Set());
    setCursor(0);
    setMobileNav(false);
  }, [listKey]);

  const openThread = useCallback(
    (id: string) => {
      navigate({ ...listRoute(route), threadId: id });
    },
    [route.view, route.param],
  );
  const back = useCallback(() => navigate(listRoute(route)), [route.view, route.param]);

  const thread = route.threadId ? state.threads.find((t) => t.id === route.threadId) : undefined;
  useEffect(() => {
    if (route.threadId && !thread) navigate(listRoute(route), true);
  }, [route.threadId, !!thread]);

  // Keep keyboard cursor on the open thread.
  useEffect(() => {
    if (!route.threadId) return;
    const i = visible.findIndex((t) => t.id === route.threadId);
    if (i >= 0) setCursor(i);
  }, [route.threadId]);

  const openDraft = (d: Draft) => {
    if (d.inline) api.update((st) => ({ ...st, drafts: st.drafts.map((x) => (x.id === d.id ? { ...x, inline: false } : x)) }));
    openWindow(d.id);
  };

  const ui: UI = useMemo(
    () => ({
      openCreateLabel: (applyTo) => setLabelDlg({ open: true, applyTo }),
      openEditLabel: (id) => setLabelDlg({ open: true, editId: id }),
      openShortcuts: () => setShortcuts(true),
      openQuickSettings: () => setQs((v) => !v),
      openPreview: (id) => setPreview(id),
      isMobile,
      focusSearch: () => searchRef.current?.focus(),
    }),
    [isMobile],
  );

  // ---------- Keyboard shortcuts ----------
  const prefix = useRef<{ key: string; t: number } | null>(null);
  const kb = useRef<(e: KeyboardEvent) => void>(() => {});
  kb.current = (e: KeyboardEvent) => {
    if (!s.shortcuts || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (pendingConfirm || preview || shortcuts || labelDlg.open || document.querySelector(".popover")) {
      if (e.key === "?" && !pendingConfirm) setShortcuts((v) => !v);
      return;
    }
    const k = e.key;
    const p = prefix.current && Date.now() - prefix.current.t < 1500 ? prefix.current.key : null;
    prefix.current = null;

    if (p === "g") {
      const map: Record<string, Route> = {
        i: { view: "inbox" },
        s: { view: "starred" },
        t: { view: "sent" },
        d: { view: "drafts" },
        a: { view: "all" },
        b: { view: "snoozed" },
      };
      if (map[k]) {
        e.preventDefault();
        navigate(map[k]);
      }
      return;
    }
    if (p === "*") {
      if (k === "a") setSelected(new Set(visible.map((t) => t.id)));
      if (k === "n") setSelected(new Set());
      if (k === "u") setSelected(new Set(visible.filter((t) => t.unread).map((t) => t.id)));
      if (k === "r") setSelected(new Set(visible.filter((t) => !t.unread).map((t) => t.id)));
      if (k === "s") setSelected(new Set(visible.filter((t) => t.starred).map((t) => t.id)));
      return;
    }
    if (k === "g" || k === "*") {
      prefix.current = { key: k, t: Date.now() };
      return;
    }
    if (k === "?") {
      setShortcuts(true);
      return;
    }
    if (k === "/") {
      e.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (k === "c") {
      e.preventDefault();
      api.compose();
      return;
    }
    if (route.view === "settings" || route.view === "drafts" || route.view === "scheduled") return;

    const clickTool = (label: string) =>
      setTimeout(() => {
        const scope = thread && (s.readingPane === "none" || isMobile) ? ".thread-toolbar" : ".list-pane .toolbar";
        document.querySelector<HTMLElement>(`${scope} [aria-label="${label}"]`)?.click();
      }, 0);

    if (thread && (s.readingPane === "none" || isMobile)) {
      const idx = list.findIndex((t) => t.id === thread.id);
      const go = (i: number) => list[i] && openThread(list[i].id);
      const after = () => (list[idx + 1] ? go(idx + 1) : list[idx - 1] ? go(idx - 1) : back());
      switch (k) {
        case "j":
          go(idx + 1);
          break;
        case "k":
          go(idx - 1);
          break;
        case "u":
        case "Escape":
          back();
          break;
        case "e":
          if (thread.location === "inbox") {
            api.archive([thread.id]);
            after();
          }
          break;
        case "#":
          api.trash([thread.id]);
          after();
          break;
        case "!":
          api.spam([thread.id]);
          after();
          break;
        case "s":
          api.toggleStar(thread.id);
          break;
        case "+":
        case "=":
          api.setImportant([thread.id], true);
          break;
        case "-":
          api.setImportant([thread.id], false);
          break;
        case "U":
          api.setRead([thread.id], false);
          back();
          break;
        case "r":
        case "a":
        case "f":
          e.preventDefault();
          api.reply(thread.id, k === "r" ? "reply" : k === "a" ? "replyAll" : "forward", undefined, true);
          setTimeout(() => document.querySelector<HTMLElement>(".composer.inline .composer-body")?.focus(), 40);
          break;
        case "b":
          clickTool("Snooze");
          break;
        case "l":
          clickTool("Labels");
          break;
        case "v":
          clickTool("Move to");
          break;
      }
      return;
    }

    // List mode
    const cur = visible[cursor];
    const targets = selected.size ? [...selected] : cur ? [cur.id] : [];
    const done = () => setSelected(new Set());
    switch (k) {
      case "j":
      case "ArrowDown":
        if (k === "ArrowDown") e.preventDefault();
        setCursor(Math.min(visible.length - 1, cursor + 1));
        if (s.readingPane === "right" && !isMobile && visible[cursor + 1]) openThread(visible[cursor + 1].id);
        break;
      case "k":
      case "ArrowUp":
        if (k === "ArrowUp") e.preventDefault();
        setCursor(Math.max(0, cursor - 1));
        if (s.readingPane === "right" && !isMobile && visible[cursor - 1]) openThread(visible[cursor - 1].id);
        break;
      case "o":
      case "Enter":
        if (cur) openThread(cur.id);
        break;
      case "x":
        if (cur) {
          const n = new Set(selected);
          n.has(cur.id) ? n.delete(cur.id) : n.add(cur.id);
          setSelected(n);
        }
        break;
      case "Escape":
        done();
        if (thread) back();
        break;
      case "e":
        api.archive(targets.filter((id) => state.threads.find((t) => t.id === id)?.location === "inbox"));
        done();
        break;
      case "#":
        api.trash(targets);
        done();
        break;
      case "!":
        api.spam(targets);
        done();
        break;
      case "s":
        if (targets.length === 1) api.toggleStar(targets[0]);
        else api.setStar(targets, true);
        break;
      case "+":
      case "=":
        api.setImportant(targets, true);
        break;
      case "-":
        api.setImportant(targets, false);
        break;
      case "I":
        api.setRead(targets, true);
        done();
        break;
      case "U":
        api.setRead(targets, false);
        done();
        break;
      case "r":
      case "a":
      case "f":
        if (cur) {
          openThread(cur.id);
          api.reply(cur.id, k === "r" ? "reply" : k === "a" ? "replyAll" : "forward", undefined, true);
        }
        break;
      case "b":
      case "l":
      case "v":
        if (!targets.length) break;
        if (!selected.size) setSelected(new Set(targets));
        clickTool(k === "b" ? "Snooze" : k === "l" ? "Labels" : "Move to");
        break;
    }
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => kb.current(e);
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, []);

  const collapsed = !isMobile && s.sidebarCollapsed;
  const split = !isMobile && s.readingPane === "right";
  const isDraftView = route.view === "drafts" || route.view === "scheduled";

  const listEl = (
    <MailList
      route={lr}
      threads={list}
      page={page}
      setPage={setPage}
      selected={selected}
      setSelected={setSelected}
      cursor={cursor}
      setCursor={setCursor}
      onOpen={openThread}
      openId={route.threadId}
    />
  );

  let content: React.ReactNode;
  if (route.view === "settings") content = <SettingsPage />;
  else if (isDraftView) content = <DraftList route={route} onOpenDraft={openDraft} />;
  else if (split)
    content = (
      <div className="split">
        {listEl}
        {thread ? (
          <ThreadView key={thread.id} thread={thread} route={route} list={list} onBack={back} onGo={openThread} embedded />
        ) : (
          <div className="pane-empty">
            <Icon name="mailOpen" size={64} />
            <div>No conversation selected</div>
            <div className="muted small">{list.length ? `${list.length} conversations` : ""}</div>
          </div>
        )}
      </div>
    );
  else if (thread) content = <ThreadView thread={thread} route={route} list={list} onBack={back} onGo={openThread} />;
  else content = listEl;

  return (
    <UICtx.Provider value={ui}>
      <div className={"app density-" + s.density + (thread && !split ? " thread-open" : "") + (isMobile ? " is-mobile" : "")}>
        <Header ref={searchRef} route={route} onMenu={() => (isMobile ? setMobileNav(true) : api.updateSettings({ sidebarCollapsed: !s.sidebarCollapsed }))} />
        <div className="body">
          <Sidebar route={route} collapsed={collapsed} mobileOpen={mobileNav} onNavigate={() => setMobileNav(false)} />
          {isMobile && mobileNav && <div className="drawer-scrim" onClick={() => setMobileNav(false)} />}
          <main className="main">{content}</main>
        </div>
        {isMobile && !thread && route.view !== "settings" && (
          <button className="fab" onClick={() => api.compose()}>
            <Icon name="edit" size={22} />
            <span>Compose</span>
          </button>
        )}
        <ComposerWindows />
        <ToastHost />
        <ConfirmHost />
        {!isMobile && <TooltipHost />}
        <QuickSettings open={qs} onClose={() => setQs(false)} />
        <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
        <LabelDialog open={labelDlg.open} editId={labelDlg.editId} applyTo={labelDlg.applyTo} onClose={() => setLabelDlg({ open: false })} />
        <AttachmentPreview attId={preview} threads={state.threads} onClose={() => setPreview(null)} onNav={setPreview} />
      </div>
    </UICtx.Provider>
  );
}
