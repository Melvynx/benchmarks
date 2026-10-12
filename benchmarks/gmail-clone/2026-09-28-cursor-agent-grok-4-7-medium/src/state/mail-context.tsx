import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createMailbox, DEFAULT_LABELS, DEFAULT_SETTINGS } from "../data/seed";
import { ME_EMAIL, mePerson } from "../identity";
import { buildDraft, countWhere, filterThreads, inboxUnreadCount, threadMessages } from "../lib/mail";
import { reduceMail, type MailAction } from "../lib/reduce";
import { useMediaQuery } from "../lib/use-media";
import type { Category, CustomLabel, Mailbox, MailData, Message, ThreadSummary } from "../types";

const STORAGE_KEY = "grok47-mail-v1";
const UI_KEY = "grok47-ui";

export interface UIState {
  mailbox: Mailbox;
  category: Category;
  query: string;
  selected: string[];
  cursor: number;
  activeThreadId: string | null;
  expandIds: string[];
  navCollapsed: boolean;
  navOpen: boolean;
  composeId: string | null;
  composeMin: boolean;
  composeFull: boolean;
  helpOpen: boolean;
  settingsOpen: boolean;
  accountOpen: boolean;
  createLabelOpen: boolean;
}

interface Snack {
  id: number;
  text: string;
}

interface Snapshot {
  messages: Message[];
  labels: CustomLabel[];
  settings: MailData["settings"];
  recentSearches: string[];
  signedIn: boolean;
}

interface MailContextValue {
  data: MailData;
  ui: UIState;
  snack: Snack | null;
  threads: ThreadSummary[];
  contacts: { name: string; email: string }[];
  counts: {
    inbox: number;
    drafts: number;
    scheduled: number;
    snoozed: number;
    spam: number;
    categories: Record<Category, number>;
  };
  mobile: boolean;
  wide: boolean;
  split: boolean;
  dispatch: (action: MailAction, opts?: { silent?: boolean }) => void;
  patchUi: (patch: Partial<UIState> | ((ui: UIState) => UIState)) => void;
  undo: () => void;
  go: (mailbox: Mailbox) => void;
  openThread: (threadId: string) => void;
  closeThread: () => void;
  toggleSelect: (threadId: string, index: number, shift: boolean) => void;
  selectMany: (threadIds: string[]) => void;
  clearSelection: () => void;
  targets: () => string[];
  archive: (ids?: string[]) => void;
  trash: (ids?: string[]) => void;
  spam: (ids?: string[]) => void;
  star: (ids?: string[]) => void;
  mark: (ids: string[] | undefined, read: boolean) => void;
  snooze: (ids: string[], until: number) => void;
  moveToInbox: (ids?: string[]) => void;
  deleteForever: (ids?: string[]) => void;
  emptyTrash: () => void;
  setLabel: (ids: string[], labelId: string, on: boolean) => void;
  composeNew: () => void;
  openDraft: (id: string) => void;
  reply: (mode: "reply" | "replyAll" | "forward") => void;
  dismissCompose: () => void;
}

const MailContext = createContext<MailContextValue | null>(null);

function loadMail(): MailData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createMailbox();
    const parsed = JSON.parse(raw) as MailData & { v?: number };
    if (parsed.v !== 1 || !Array.isArray(parsed.messages)) return createMailbox();
    const messages = parsed.messages.filter(
      (message) => message?.id && message.threadId && message.from && Array.isArray(message.labels) && Array.isArray(message.to),
    );
    if (!messages.length) return createMailbox();
    return {
      messages,
      labels: parsed.labels?.length ? parsed.labels : DEFAULT_LABELS,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      recentSearches: parsed.recentSearches ?? [],
      signedIn: parsed.signedIn !== false,
    };
  } catch {
    return createMailbox();
  }
}

function loadUi(): UIState {
  const base: UIState = {
    mailbox: "inbox",
    category: "primary",
    query: "",
    selected: [],
    cursor: 0,
    activeThreadId: null,
    expandIds: [],
    navCollapsed: false,
    navOpen: false,
    composeId: null,
    composeMin: false,
    composeFull: false,
    helpOpen: false,
    settingsOpen: false,
    accountOpen: false,
    createLabelOpen: false,
  };
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<UIState>;
    return {
      ...base,
      mailbox: parsed.mailbox || "inbox",
      category: parsed.category || "primary",
      navCollapsed: Boolean(parsed.navCollapsed),
    };
  } catch {
    return base;
  }
}

const UNDO_TYPES = new Set<MailAction["type"]>([
  "star",
  "important",
  "mark-read",
  "archive",
  "trash",
  "spam",
  "to-inbox",
  "delete-forever",
  "empty-trash",
  "snooze",
  "label",
  "create-label",
  "delete-label",
  "discard",
  "send",
  "reset",
]);

function describe(action: MailAction): string {
  const count = "threadIds" in action ? action.threadIds.length : 1;
  const noun = count === 1 ? "Conversation" : `${count} conversations`;
  switch (action.type) {
    case "archive":
      return count === 1 ? "Conversation archived" : `${count} conversations archived`;
    case "trash":
      return `${noun} moved to Trash`;
    case "spam":
      return count === 1 ? "Conversation marked as spam" : `${count} conversations marked as spam`;
    case "star":
      return "Star updated";
    case "important":
      return "Importance updated";
    case "mark-read":
      return action.read ? `${noun} marked as read` : `${noun} marked as unread`;
    case "snooze":
      return `${noun} snoozed`;
    case "send":
      return action.sendAt ? "Send scheduled" : "Message sent";
    case "discard":
      return "Draft discarded";
    case "to-inbox":
      return `${noun} moved to Inbox`;
    case "delete-forever":
      return count === 1 ? "Conversation deleted forever" : `${count} conversations deleted forever`;
    case "empty-trash":
      return "Trash emptied";
    case "label":
      return action.on ? "Label applied" : "Label removed";
    case "create-label":
      return "Label created";
    case "delete-label":
      return "Label deleted";
    case "reset":
      return "Sample mailbox restored";
    default:
      return "Saved";
  }
}

function shouldSnack(action: MailAction, prev: MailData, next: MailData): boolean {
  if (!UNDO_TYPES.has(action.type)) return false;
  if (action.type === "mark-read") {
    const ids = new Set(action.threadIds);
    const relevant = prev.messages.filter((message) => ids.has(message.threadId));
    if (relevant.every((message) => message.read === action.read)) return false;
  }
  if (action.type === "send") {
    const message = prev.messages.find((item) => item.id === action.id);
    if (!message || message.to.length === 0) return false;
  }
  return prev.messages !== next.messages || prev.labels !== next.labels || action.type === "reset";
}

function snapshotOf(data: MailData): Snapshot {
  return {
    messages: data.messages,
    labels: data.labels,
    settings: data.settings,
    recentSearches: data.recentSearches,
    signedIn: data.signedIn,
  };
}

export function MailProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MailData>(() => reduceMail(loadMail(), { type: "tick" }));
  const [ui, setUi] = useState<UIState>(loadUi);
  const [snack, setSnack] = useState<Snack | null>(null);
  const dataRef = useRef(data);
  const uiRef = useRef(ui);
  const threadsRef = useRef<ThreadSummary[]>([]);
  const undoRef = useRef<Snapshot | null>(null);
  const splitRef = useRef(false);
  dataRef.current = data;
  uiRef.current = ui;

  const mobile = useMediaQuery("(max-width: 759px)");
  const wide = useMediaQuery("(min-width: 1100px)");
  const split = wide && data.settings.previewPane && !mobile;
  splitRef.current = split;

  const dispatch = useCallback((action: MailAction, opts?: { silent?: boolean }) => {
    const prev = dataRef.current;
    const now = Date.now();
    const next = action.type === "reset" ? { ...createMailbox(now), signedIn: true } : reduceMail(prev, action, now);
    dataRef.current = next;
    setData(next);
    if (!opts?.silent && shouldSnack(action, prev, next)) {
      undoRef.current = snapshotOf(prev);
      setSnack({ id: now, text: describe(action) });
    }
  }, []);

  const patchUi = useCallback((patch: Partial<UIState> | ((state: UIState) => UIState)) => {
    setUi((current) => {
      const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      uiRef.current = next;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    const snap = undoRef.current;
    if (!snap) return;
    const next: MailData = { ...dataRef.current, ...snap };
    dataRef.current = next;
    setData(next);
    undoRef.current = null;
    setSnack(null);
  }, []);

  const threads = useMemo(
    () =>
      filterThreads(data.messages, {
        mailbox: ui.mailbox,
        category: ui.category,
        query: ui.query,
        labels: data.labels,
      }),
    [data.messages, data.labels, ui.mailbox, ui.category, ui.query],
  );
  threadsRef.current = threads;

  const contacts = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    for (const message of data.messages) {
      for (const person of [message.from, ...message.to, ...message.cc, ...message.bcc]) {
        if (person.email.toLowerCase() === ME_EMAIL) continue;
        if (!map.has(person.email.toLowerCase())) map.set(person.email.toLowerCase(), person);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.messages]);

  const counts = useMemo(() => {
    const categories = {
      primary: 0,
      promotions: 0,
      social: 0,
      updates: 0,
    } satisfies Record<Category, number>;
    for (const category of Object.keys(categories) as Category[]) {
      categories[category] = filterThreads(data.messages, {
        mailbox: "inbox",
        category,
        query: "",
        labels: data.labels,
      }).filter((thread) => thread.unread).length;
    }
    return {
      inbox: inboxUnreadCount(data.messages),
      drafts: countWhere(data.messages, (message) => message.labels.includes("draft")),
      scheduled: countWhere(data.messages, (message) => message.labels.includes("scheduled")),
      snoozed: countWhere(data.messages, (message) => message.labels.includes("snoozed")),
      spam: countWhere(data.messages, (message) => message.labels.includes("spam") && !message.read),
      categories,
    };
  }, [data.messages, data.labels]);

  useLayoutEffect(() => {
    document.title = "Grok 4.7";
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, ...data }));
    }, 80);
    return () => window.clearTimeout(handle);
  }, [data]);

  useEffect(() => {
    localStorage.setItem(
      UI_KEY,
      JSON.stringify({ mailbox: ui.mailbox, category: ui.category, navCollapsed: ui.navCollapsed }),
    );
  }, [ui.mailbox, ui.category, ui.navCollapsed]);

  useEffect(() => {
    const apply = () => {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dark = data.settings.theme === "dark" || (data.settings.theme === "system" && systemDark);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.dataset.density = data.settings.density;
    };
    apply();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data.settings.theme, data.settings.density]);

  useEffect(() => {
    if (!snack) return;
    const handle = window.setTimeout(() => setSnack((current) => (current?.id === snack.id ? null : current)), 5000);
    return () => window.clearTimeout(handle);
  }, [snack]);

  useEffect(() => {
    const handle = window.setInterval(() => dispatch({ type: "tick" }, { silent: true }), 15000);
    return () => window.clearInterval(handle);
  }, [dispatch]);

  const openThread = useCallback(
    (threadId: string) => {
      const messages = threadMessages(dataRef.current.messages, threadId);
      if (messages.length > 0 && messages.every((message) => message.labels.includes("draft"))) {
        patchUi({ composeId: messages[0].id, composeMin: false, composeFull: false, activeThreadId: null, navOpen: false });
        return;
      }
      const expandIds = messages.filter((message) => !message.read).map((message) => message.id);
      patchUi({ activeThreadId: threadId, expandIds, navOpen: false, accountOpen: false });
      dispatch({ type: "mark-read", threadIds: [threadId], read: true }, { silent: true });
    },
    [dispatch, patchUi],
  );

  const closeThread = useCallback(() => patchUi({ activeThreadId: null }), [patchUi]);

  const go = useCallback(
    (mailbox: Mailbox) => {
      patchUi({
        mailbox,
        query: "",
        selected: [],
        cursor: 0,
        navOpen: false,
        activeThreadId: null,
        accountOpen: false,
      });
    },
    [patchUi],
  );

  const advance = useCallback(
    (ids: string[]) => {
      const set = new Set(ids);
      const current = uiRef.current;
      let nextActive = current.activeThreadId;
      if (nextActive && set.has(nextActive)) {
        if (splitRef.current) {
          const list = threadsRef.current;
          const index = list.findIndex((thread) => thread.threadId === nextActive);
          const next = list.slice(index + 1).find((thread) => !set.has(thread.threadId));
          nextActive = next?.threadId ?? null;
        } else nextActive = null;
      }
      patchUi((state) => ({
        ...state,
        activeThreadId: nextActive,
        selected: state.selected.filter((id) => !set.has(id)),
      }));
      if (nextActive && nextActive !== current.activeThreadId) {
        dispatch({ type: "mark-read", threadIds: [nextActive], read: true }, { silent: true });
      }
    },
    [dispatch, patchUi],
  );

  const resolve = useCallback(
    (ids?: string[]) => {
      if (ids?.length) return ids;
      const state = uiRef.current;
      if (state.selected.length) return state.selected;
      if (state.activeThreadId) return [state.activeThreadId];
      const thread = threadsRef.current[state.cursor];
      return thread ? [thread.threadId] : [];
    },
    [],
  );

  const archive = useCallback(
    (ids?: string[]) => {
      const threadIds = resolve(ids);
      if (!threadIds.length) return;
      dispatch({ type: "archive", threadIds });
      advance(threadIds);
    },
    [advance, dispatch, resolve],
  );

  const trash = useCallback(
    (ids?: string[]) => {
      const threadIds = resolve(ids);
      if (!threadIds.length) return;
      dispatch({ type: "trash", threadIds });
      advance(threadIds);
    },
    [advance, dispatch, resolve],
  );

  const spamThreads = useCallback(
    (ids?: string[]) => {
      const threadIds = resolve(ids);
      if (!threadIds.length) return;
      dispatch({ type: "spam", threadIds });
      advance(threadIds);
    },
    [advance, dispatch, resolve],
  );

  const star = useCallback(
    (ids?: string[]) => {
      const threadIds = resolve(ids);
      if (!threadIds.length) return;
      dispatch({ type: "star", threadIds });
    },
    [dispatch, resolve],
  );

  const mark = useCallback(
    (ids: string[] | undefined, read: boolean) => {
      const threadIds = resolve(ids);
      if (!threadIds.length) return;
      dispatch({ type: "mark-read", threadIds, read });
    },
    [dispatch, resolve],
  );

  const snooze = useCallback(
    (ids: string[], until: number) => {
      if (!ids.length) return;
      dispatch({ type: "snooze", threadIds: ids, until });
      advance(ids);
    },
    [advance, dispatch],
  );

  const moveToInbox = useCallback(
    (ids?: string[]) => {
      const threadIds = resolve(ids);
      if (!threadIds.length) return;
      dispatch({ type: "to-inbox", threadIds });
      advance(threadIds);
    },
    [advance, dispatch, resolve],
  );

  const deleteForever = useCallback(
    (ids?: string[]) => {
      const threadIds = resolve(ids);
      if (!threadIds.length) return;
      dispatch({ type: "delete-forever", threadIds });
      advance(threadIds);
    },
    [advance, dispatch, resolve],
  );

  const emptyTrash = useCallback(() => {
    dispatch({ type: "empty-trash" });
    patchUi({ activeThreadId: null, selected: [] });
  }, [dispatch, patchUi]);

  const setLabel = useCallback(
    (ids: string[], labelId: string, on: boolean) => {
      if (!ids.length) return;
      dispatch({ type: "label", threadIds: ids, labelId, on });
    },
    [dispatch],
  );

  const composeNew = useCallback(() => {
    const existingId = uiRef.current.composeId;
    const existing = dataRef.current.messages.find((message) => message.id === existingId && message.labels.includes("draft"));
    if (existing && existing.to.length === 0 && !existing.subject && !existing.body.trim()) {
      patchUi({ composeMin: false, composeFull: false });
      return;
    }
    const draft = buildDraft({
      mode: "new",
      source: [],
      me: mePerson(dataRef.current.settings.displayName),
      now: Date.now(),
    });
    dispatch({ type: "upsert", message: draft });
    patchUi({ composeId: draft.id, composeMin: false, composeFull: false, accountOpen: false });
  }, [dispatch, patchUi]);

  const openDraft = useCallback(
    (id: string) => patchUi({ composeId: id, composeMin: false, composeFull: false, activeThreadId: null }),
    [patchUi],
  );

  const reply = useCallback(
    (mode: "reply" | "replyAll" | "forward") => {
      const threadId = uiRef.current.activeThreadId;
      if (!threadId) return;
      const source = threadMessages(dataRef.current.messages, threadId);
      if (mode !== "forward") {
        const draft = source.find((message) => message.labels.includes("draft"));
        if (draft) {
          patchUi((state) => ({ ...state, expandIds: state.expandIds }));
          document.getElementById("inline-reply")?.scrollIntoView({ block: "nearest" });
          return;
        }
      }
      const message = buildDraft({
        mode,
        source,
        me: mePerson(dataRef.current.settings.displayName),
        now: Date.now(),
      });
      dispatch({ type: "upsert", message });
      if (mode === "forward") patchUi({ composeId: message.id, composeMin: false, composeFull: false });
    },
    [dispatch, patchUi],
  );

  const dismissCompose = useCallback(() => {
    patchUi({ composeId: null, composeMin: false, composeFull: false });
  }, [patchUi]);

  const toggleSelect = useCallback(
    (threadId: string, index: number, shift: boolean) => {
      patchUi((state) => {
        if (shift && state.selected.length) {
          const anchor = threadsRef.current.findIndex((thread) => thread.threadId === state.selected[state.selected.length - 1]);
          const start = Math.min(anchor, index);
          const end = Math.max(anchor, index);
          const range = threadsRef.current.slice(Math.max(0, start), end + 1).map((thread) => thread.threadId);
          return { ...state, selected: [...new Set([...state.selected, ...range])] };
        }
        const selected = state.selected.includes(threadId)
          ? state.selected.filter((id) => id !== threadId)
          : [...state.selected, threadId];
        return { ...state, selected };
      });
    },
    [patchUi],
  );

  const selectMany = useCallback((threadIds: string[]) => patchUi({ selected: threadIds }), [patchUi]);
  const clearSelection = useCallback(() => patchUi({ selected: [] }), [patchUi]);
  const targets = useCallback(() => resolve(), [resolve]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      const state = uiRef.current;
      if (event.key === "Escape") {
        if (document.querySelector(".menu, .modal, .search-pop")) return;
        if (state.helpOpen || state.settingsOpen || state.createLabelOpen || state.accountOpen) {
          patchUi({ helpOpen: false, settingsOpen: false, createLabelOpen: false, accountOpen: false });
          return;
        }
        if (state.selected.length) {
          patchUi({ selected: [] });
          return;
        }
        if (state.composeId) {
          patchUi({ composeId: null, composeMin: false, composeFull: false });
          return;
        }
        if (state.navOpen) {
          patchUi({ navOpen: false });
          return;
        }
        if (state.activeThreadId && !splitRef.current) closeThread();
        return;
      }
      if (typing) return;
      const key = event.key;
      if (key === "?" ) {
        event.preventDefault();
        patchUi({ helpOpen: true, accountOpen: false });
        return;
      }
      if (key === "/") {
        event.preventDefault();
        document.getElementById("q")?.focus();
        return;
      }
      if (key === "c" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        composeNew();
        return;
      }
      if ((key === "z" && !event.metaKey && !event.ctrlKey) || ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "z" && !event.shiftKey)) {
        event.preventDefault();
        undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "a") {
        event.preventDefault();
        selectMany(threadsRef.current.map((thread) => thread.threadId));
        return;
      }
      const list = threadsRef.current;
      if (key === "j" || key === "ArrowDown" || key === "k" || key === "ArrowUp") {
        event.preventDefault();
        const delta = key === "j" || key === "ArrowDown" ? 1 : -1;
        const next = Math.max(0, Math.min(list.length - 1, state.cursor + delta));
        patchUi({ cursor: next });
        if (splitRef.current && list[next]) openThread(list[next].threadId);
        return;
      }
      if ((key === "Enter" || key === "o") && list[state.cursor]) {
        event.preventDefault();
        openThread(list[state.cursor].threadId);
        return;
      }
      if (key === "u") {
        closeThread();
        return;
      }
      if (key === "x" && list[state.cursor]) {
        toggleSelect(list[state.cursor].threadId, state.cursor, false);
        return;
      }
      if (key === "s") {
        star();
        return;
      }
      if (key === "e") {
        archive();
        return;
      }
      if (key === "#") {
        trash();
        return;
      }
      if (key === "r" && state.activeThreadId) {
        reply("reply");
        return;
      }
      if (key === "a" && state.activeThreadId && !event.metaKey && !event.ctrlKey) {
        reply("replyAll");
        return;
      }
      if (key === "f" && state.activeThreadId) {
        reply("forward");
        return;
      }
      if (key === "I" && event.shiftKey) {
        mark(undefined, true);
        return;
      }
      if (key === "U" && event.shiftKey) {
        mark(undefined, false);
        return;
      }
      if (key === "g" && !event.metaKey && !event.ctrlKey) {
        const wait = (next: KeyboardEvent) => {
          window.removeEventListener("keydown", wait);
          const typingNow = next.target instanceof HTMLElement && (next.target.tagName === "INPUT" || next.target.tagName === "TEXTAREA");
          if (typingNow) return;
          const map: Record<string, Mailbox> = { i: "inbox", s: "starred", t: "sent", d: "drafts", a: "all", z: "snoozed" };
          const mailbox = map[next.key];
          if (mailbox) {
            next.preventDefault();
            next.stopImmediatePropagation();
            go(mailbox);
          }
        };
        window.addEventListener("keydown", wait, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener("keydown", wait, { capture: true }), 900);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [archive, closeThread, composeNew, go, mark, openThread, patchUi, reply, selectMany, star, toggleSelect, trash, undo]);

  const value: MailContextValue = {
    data,
    ui,
    snack,
    threads,
    contacts,
    counts,
    mobile,
    wide,
    split,
    dispatch,
    patchUi,
    undo,
    go,
    openThread,
    closeThread,
    toggleSelect,
    selectMany,
    clearSelection,
    targets,
    archive,
    trash,
    spam: spamThreads,
    star,
    mark,
    snooze,
    moveToInbox,
    deleteForever,
    emptyTrash,
    setLabel,
    composeNew,
    openDraft,
    reply,
    dismissCompose,
  };

  return <MailContext.Provider value={value}>{children}</MailContext.Provider>;
}

export function useMail(): MailContextValue {
  const value = useContext(MailContext);
  if (!value) throw new Error("useMail requires MailProvider");
  return value;
}
