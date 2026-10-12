import { useEffect, useRef, useState } from "react";
import { ConfirmDialog, PaletteMenu, Shortcuts, Snackbar } from "./components/Menus";
import { Compose } from "./components/Compose";
import { MailList } from "./components/MailList";
import { Settings } from "./components/Settings";
import { Sidebar } from "./components/Sidebar";
import { ThreadView } from "./components/ThreadView";
import { TopBar } from "./components/TopBar";
import { Avatar } from "./components/bits";
import {
  buildForwardHtml,
  buildReplyHtml,
  emptyComposeBody,
  forwardSubject,
  newId,
  replyAllRecipients,
  replyRecipients,
  replySubject,
} from "./logic";
import { ME } from "./people";
import { useMail } from "./store";
import type { ComposeModel, MailView } from "./types";

export function App() {
  const mail = useMail();
  const { state, dispatch } = mail;
  const { isMobile, isWide } = useViewport();
  useKeys();
  if (!state.signedIn) return <Gate />;

  const thread = state.threads.find((item) => item.id === state.openThreadId) ?? null;
  const split = state.settings.readingPane && isWide && !isMobile && !state.settingsPage && Boolean(thread);
  const showList = !state.settingsPage && (!thread || split);

  function openCompose() {
    const parked = state.composes.find((compose) => compose.minimized && compose.mode === "new");
    if (parked) {
      dispatch({ type: "composePatch", id: parked.id, patch: { minimized: false } });
      return;
    }
    const compose: ComposeModel = {
      id: newId("c"),
      threadId: null,
      mode: "new",
      placement: "float",
      minimized: false,
      maximized: isMobile,
      to: [],
      cc: [],
      bcc: [],
      subject: "",
      body: emptyComposeBody(state.settings.signature),
      attachments: [],
      showCc: false,
      showBcc: false,
    };
    dispatch({ type: "composeOpen", compose });
  }

  return (
    <div className="app" data-collapsed={!isMobile && state.navCollapsed ? "true" : "false"} data-density={state.settings.density}>
      <TopBar
        isMobile={isMobile}
        onMenu={() =>
          dispatch({
            type: "ui",
            patch: isMobile ? { sidebarOpen: !state.sidebarOpen } : { navCollapsed: !state.navCollapsed },
          })
        }
      />
      <div className="body">
        <Sidebar onCompose={openCompose} />
        {isMobile && state.sidebarOpen ? (
          <button className="backdrop" type="button" aria-label="Close menu" onClick={() => dispatch({ type: "ui", patch: { sidebarOpen: false } })} />
        ) : null}
        <main className="mail">
          {state.settingsPage ? <Settings /> : null}
          {showList ? <MailList split={split} /> : null}
          {thread && !state.settingsPage ? <ThreadView thread={thread} split={split} /> : null}
        </main>
      </div>
      {state.composes
        .filter((compose) => compose.placement === "float")
        .map((compose) => (
          <Compose key={compose.id} compose={compose} />
        ))}
      {isMobile && !thread && !state.settingsPage ? (
        <button className="fab" type="button" aria-label="Compose" onClick={openCompose}>
          <span className="pencil" />
        </button>
      ) : null}
      <PaletteMenu />
      <Snackbar />
      <Shortcuts />
      <ConfirmDialog />
    </div>
  );
}

function Gate() {
  const { dispatch, me } = useMail();
  return (
    <div className="gate">
      <h1 className="logo" data-testid="logo">
        Grok 4.7
      </h1>
      <button className="account-pick" type="button" data-testid="sign-in" onClick={() => dispatch({ type: "sign", signedIn: true })}>
        <Avatar person={me} size={40} />
        <span>
          <strong>{me.name}</strong>
          <small>{me.email}</small>
        </span>
      </button>
    </div>
  );
}

function useViewport() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { width, isMobile: width < 900, isWide: width >= 1180 };
}

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "radio")) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function useKeys() {
  const mail = useMail();
  const ref = useRef(mail);
  ref.current = mail;
  useEffect(() => {
    let prefix: "" | "g" | "*" = "";
    let timer = 0;
    const onKey = (event: KeyboardEvent) => {
      const api = ref.current;
      const { state, dispatch, openPalette, focusIds, searchRef } = api;
      if (event.key === "Escape") {
        if (state.palette) dispatch({ type: "ui", patch: { palette: null } });
        else if (state.shortcutsOpen) dispatch({ type: "ui", patch: { shortcutsOpen: false } });
        else if (state.quickSettings || state.accountOpen || state.advancedSearch) {
          dispatch({ type: "ui", patch: { quickSettings: false, accountOpen: false, advancedSearch: false } });
        } else if (state.confirm) dispatch({ type: "confirm", confirm: null });
        else if (state.sidebarOpen) dispatch({ type: "ui", patch: { sidebarOpen: false } });
        else if (state.settingsPage) dispatch({ type: "ui", patch: { settingsPage: false } });
        else if (state.openThreadId) dispatch({ type: "closeThread" });
        else if (state.selected.length) dispatch({ type: "selectMode", mode: "none" });
        else if (state.search) dispatch({ type: "search", query: "" });
        return;
      }
      if (typing(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (prefix) {
        const key = event.key.toLowerCase();
        window.clearTimeout(timer);
        const which = prefix;
        prefix = "";
        event.preventDefault();
        if (which === "g") {
          const map: Record<string, MailView> = {
            i: "inbox",
            s: "starred",
            t: "sent",
            d: "drafts",
            z: "snoozed",
            x: "trash",
            a: "all",
          };
          if (map[key]) dispatch({ type: "view", view: map[key] });
        } else if (key === "a") dispatch({ type: "selectMode", mode: "all" });
        else if (key === "n") dispatch({ type: "selectMode", mode: "none" });
        else if (key === "u") dispatch({ type: "selectMode", mode: "unread" });
        else if (key === "r") dispatch({ type: "selectMode", mode: "read" });
        return;
      }
      if (event.key === "g" || event.key === "*") {
        prefix = event.key;
        timer = window.setTimeout(() => {
          prefix = "";
        }, 900);
        return;
      }
      const ids = focusIds();
      const go = (type: "archive" | "trash" | "spam" | "star") => {
        if (!ids.length) return;
        dispatch({ type, ids });
      };
      if (event.key === "?") {
        event.preventDefault();
        dispatch({ type: "ui", patch: { shortcutsOpen: true } });
      } else if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "c") {
        const compose: ComposeModel = {
          id: newId("c"),
          threadId: null,
          mode: "new",
          placement: "float",
          minimized: false,
          maximized: false,
          to: [],
          cc: [],
          bcc: [],
          subject: "",
          body: emptyComposeBody(state.settings.signature),
          attachments: [],
          showCc: false,
          showBcc: false,
        };
        dispatch({ type: "composeOpen", compose });
      } else if (event.key === "j" || event.key === "ArrowDown") dispatch({ type: "cursorMove", delta: 1, open: Boolean(state.openThreadId) });
      else if (event.key === "k" || event.key === "ArrowUp") dispatch({ type: "cursorMove", delta: -1, open: Boolean(state.openThreadId) });
      else if ((event.key === "o" || event.key === "Enter") && state.cursorId) dispatch({ type: "open", id: state.cursorId });
      else if (event.key === "u" && !event.shiftKey && state.openThreadId) dispatch({ type: "closeThread" });
      else if (event.key === "x" && state.cursorId) dispatch({ type: "toggleSelect", id: state.cursorId, shift: false });
      else if (event.key === "s") go("star");
      else if (event.key === "e") go("archive");
      else if (event.key === "#") go("trash");
      else if (event.key === "!") go("spam");
      else if (event.key === "z") dispatch({ type: "undo" });
      else if (event.key === "+" || event.key === "=") {
        if (ids.length) dispatch({ type: "important", ids });
      } else if (event.shiftKey && event.key === "I") {
        if (ids.length) dispatch({ type: "read", ids, unread: false });
      } else if (event.shiftKey && event.key === "U") {
        if (ids.length) dispatch({ type: "read", ids, unread: true });
      } else if (event.key === "l") openPalette("label", null, ids);
      else if (event.key === "v") openPalette("move", null, ids);
      else if (event.key === "b") openPalette("snooze", null, ids);
      else if (event.key === "r" || event.key === "a" || event.key === "f") {
        const mode = event.key === "a" ? "replyAll" : event.key === "f" ? "forward" : "reply";
        openKeyedReply(api, mode);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function openKeyedReply(api: ReturnType<typeof useMail>, mode: "reply" | "replyAll" | "forward") {
  const id = api.state.openThreadId || api.state.cursorId || api.focusIds()[0];
  const thread = api.state.threads.find((item) => item.id === id);
  if (!thread?.messages.length) return;
  const last = thread.messages[thread.messages.length - 1];
  const signature = api.state.settings.signature;
  const compose: ComposeModel = {
    id: newId("c"),
    threadId: mode === "forward" ? null : thread.id,
    mode,
    placement: mode === "forward" ? "float" : "inline",
    minimized: false,
    maximized: false,
    to: mode === "replyAll" ? replyAllRecipients(thread, ME).to : mode === "forward" ? [] : replyRecipients(thread, ME),
    cc: mode === "replyAll" ? replyAllRecipients(thread, ME).cc : [],
    bcc: [],
    subject: mode === "forward" ? forwardSubject(thread.subject) : replySubject(thread.subject),
    body: mode === "forward" ? buildForwardHtml(thread, last, signature) : buildReplyHtml(last, signature),
    attachments: mode === "forward" ? last.attachments.map((file) => ({ ...file, id: newId("a") })) : [],
    showCc: mode === "replyAll" && replyAllRecipients(thread, ME).cc.length > 0,
    showBcc: false,
  };
  if (!api.state.openThreadId) api.dispatch({ type: "open", id: thread.id });
  api.dispatch({ type: "composeOpen", compose });
}
