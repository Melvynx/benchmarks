import { DEFAULT_SETTINGS, PAGE_SIZE, SYS } from "./constants";
import { ME } from "./people";
import {
  applySend,
  archiveThreads,
  buildHash,
  discardDraft,
  importantThreads,
  markThreads,
  moveToLabel,
  notSpamThreads,
  parseHash,
  restoreThreads,
  runClock,
  saveDraft,
  snoozeThreads,
  spamThreads,
  starThreads,
  toggleUserLabel,
  trashThreads,
  unsnoozeThreads,
  visibleThreads,
  type Route,
  type SendInput,
} from "./logic";
import { buildMailbox } from "./seed";
import type {
  Category,
  ComposeModel,
  ConfirmState,
  History,
  MailView,
  Settings,
  Snack,
  State,
  Thread,
  UserLabel,
} from "./types";

export type Action =
  | { type: "replace"; state: State }
  | { type: "route"; route: Route }
  | { type: "view"; view: MailView }
  | { type: "category"; category: Category }
  | { type: "search"; query: string; recent?: boolean }
  | { type: "open"; id: string }
  | { type: "closeThread" }
  | { type: "toggleSelect"; id: string; shift: boolean }
  | { type: "selectMode"; mode: "all" | "none" | "read" | "unread" | "starred" | "unstarred" }
  | { type: "cursor"; id: string | null }
  | { type: "cursorMove"; delta: number; open: boolean }
  | { type: "page"; page: number }
  | { type: "star"; ids: string[] }
  | { type: "important"; ids: string[] }
  | { type: "read"; ids: string[]; unread: boolean }
  | { type: "markAllRead" }
  | { type: "archive"; ids: string[] }
  | { type: "trash"; ids: string[] }
  | { type: "forever"; ids: string[] }
  | { type: "emptyTrash" }
  | { type: "spam"; ids: string[] }
  | { type: "notSpam"; ids: string[] }
  | { type: "restore"; ids: string[] }
  | { type: "snooze"; ids: string[]; until: number }
  | { type: "unsnooze"; ids: string[] }
  | { type: "toggleLabel"; ids: string[]; labelId: string }
  | { type: "moveToLabel"; ids: string[]; labelId: string }
  | { type: "createLabel"; label: UserLabel }
  | { type: "renameLabel"; id: string; name: string }
  | { type: "updateLabel"; id: string; name: string; bg: string; color: string }
  | { type: "deleteLabel"; id: string }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "composeOpen"; compose: ComposeModel }
  | { type: "composePatch"; id: string; patch: Partial<ComposeModel> }
  | { type: "composeClose"; id: string }
  | { type: "draftSync"; compose: ComposeModel; now: number }
  | { type: "discardDraft"; threadId: string }
  | { type: "send"; input: SendInput; composeId: string }
  | { type: "cancelSchedule"; id: string }
  | { type: "tick"; now: number }
  | { type: "refresh"; now: number }
  | { type: "undo" }
  | { type: "note"; text: string }
  | { type: "dismissSnack" }
  | { type: "reset"; now: number }
  | { type: "sign"; signedIn: boolean }
  | { type: "ui"; patch: Partial<Pick<State, "sidebarOpen" | "navCollapsed" | "quickSettings" | "accountOpen" | "shortcutsOpen" | "advancedSearch" | "settingsPage" | "palette" | "confirm">> }
  | { type: "confirm"; confirm: ConfirmState };

function snap(state: State): History {
  return {
    threads: structuredClone(state.threads),
    composes: structuredClone(state.composes),
    openThreadId: state.openThreadId,
    labels: structuredClone(state.labels),
  };
}

function withSnack(state: State, patch: Partial<State>, text: string, history: History | null): State {
  const snack: Snack = { id: state.snackSeq + 1, text, history };
  return { ...state, ...patch, snack, snackSeq: state.snackSeq + 1, palette: null };
}

function visible(state: State): Thread[] {
  return visibleThreads(state.threads, state.labels, state.view, state.category, state.search);
}

function dropSelection(ids: string[], selected: string[]): string[] {
  const set = new Set(ids);
  return selected.filter((id) => !set.has(id));
}

function closeIfOpen(state: State, ids: string[]): string | null {
  return state.openThreadId && ids.includes(state.openThreadId) ? null : state.openThreadId;
}

function clearMessageUnread(threads: Thread[], id: string | null): Thread[] {
  if (!id) return threads;
  return threads.map((thread) =>
    thread.id === id
      ? { ...thread, messages: thread.messages.map((message) => ({ ...message, unread: false })) }
      : thread,
  );
}

export function createState(now = Date.now()): State {
  const box = buildMailbox(now);
  return {
    threads: box.threads,
    labels: box.labels,
    settings: { ...DEFAULT_SETTINGS },
    view: "inbox",
    category: "primary",
    search: "",
    recentSearches: [],
    openThreadId: null,
    selected: [],
    anchorId: null,
    cursorId: null,
    page: 0,
    composes: [],
    snack: null,
    snackSeq: 0,
    signedIn: true,
    sidebarOpen: false,
    navCollapsed: false,
    quickSettings: false,
    accountOpen: false,
    shortcutsOpen: false,
    advancedSearch: false,
    settingsPage: false,
    palette: null,
    confirm: null,
    pulse: 0,
  };
}

export function applyRoute(state: State, route: Route): State {
  const threadOk = route.threadId && state.threads.some((thread) => thread.id === route.threadId);
  const same =
    state.view === route.view &&
    state.category === route.category &&
    state.search === route.search &&
    state.settingsPage === route.settingsPage &&
    state.openThreadId === (threadOk ? route.threadId : null);
  if (same) return state;
  let threads = state.threads;
  if (threadOk && route.threadId) {
    threads = threads.map((thread) => (thread.id === route.threadId ? { ...thread, unread: false } : thread));
  }
  return {
    ...state,
    view: route.view,
    category: route.category,
    search: route.search,
    settingsPage: route.settingsPage,
    openThreadId: threadOk ? route.threadId : null,
    cursorId: threadOk ? route.threadId : state.cursorId,
    threads,
    page: 0,
    selected: [],
    sidebarOpen: false,
    quickSettings: false,
    accountOpen: false,
    advancedSearch: false,
    palette: null,
  };
}

export function currentRoute(state: State): Route {
  return {
    view: state.view,
    category: state.category,
    threadId: state.openThreadId,
    search: state.search,
    settingsPage: state.settingsPage,
  };
}

export function routeHash(state: State): string {
  return buildHash(currentRoute(state));
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "replace":
      return action.state;
    case "route":
      return applyRoute(state, action.route);
    case "view":
      return {
        ...state,
        view: action.view,
        search: "",
        page: 0,
        selected: [],
        openThreadId: null,
        settingsPage: false,
        sidebarOpen: false,
        palette: null,
      };
    case "category":
      return { ...state, category: action.category, page: 0, selected: [], settingsPage: false };
    case "search": {
      const query = action.query;
      const recent = action.recent && query.trim()
        ? [query.trim(), ...state.recentSearches.filter((item) => item !== query.trim())].slice(0, 6)
        : state.recentSearches;
      return { ...state, search: query, recentSearches: recent, page: 0, selected: [], settingsPage: false };
    }
    case "open": {
      if (!state.threads.some((thread) => thread.id === action.id)) return state;
      return {
        ...state,
        openThreadId: action.id,
        cursorId: action.id,
        settingsPage: false,
        sidebarOpen: false,
        threads: state.threads.map((thread) => (thread.id === action.id ? { ...thread, unread: false } : thread)),
      };
    }
    case "closeThread":
      return {
        ...state,
        openThreadId: null,
        threads: clearMessageUnread(state.threads, state.openThreadId),
        composes: state.composes.filter((compose) => !(compose.placement === "inline" && compose.threadId === state.openThreadId)),
      };
    case "toggleSelect": {
      const list = visible(state).map((thread) => thread.id);
      let selected = state.selected;
      if (action.shift && state.anchorId && list.includes(state.anchorId) && list.includes(action.id)) {
        const a = list.indexOf(state.anchorId);
        const b = list.indexOf(action.id);
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const range = list.slice(lo, hi + 1);
        selected = [...new Set([...selected, ...range])];
      } else if (selected.includes(action.id)) {
        selected = selected.filter((id) => id !== action.id);
      } else {
        selected = [...selected, action.id];
      }
      return { ...state, selected, anchorId: action.id, cursorId: action.id };
    }
    case "selectMode": {
      const list = visible(state);
      let selected: string[] = [];
      if (action.mode === "all") selected = list.map((thread) => thread.id);
      if (action.mode === "read") selected = list.filter((thread) => !thread.unread).map((thread) => thread.id);
      if (action.mode === "unread") selected = list.filter((thread) => thread.unread).map((thread) => thread.id);
      if (action.mode === "starred") selected = list.filter((thread) => thread.labels.includes(SYS.STARRED)).map((thread) => thread.id);
      if (action.mode === "unstarred") selected = list.filter((thread) => !thread.labels.includes(SYS.STARRED)).map((thread) => thread.id);
      return { ...state, selected };
    }
    case "cursor":
      return { ...state, cursorId: action.id };
    case "cursorMove": {
      const list = visible(state);
      if (!list.length) return state;
      const current = list.findIndex((thread) => thread.id === state.cursorId);
      const start = current < 0 ? (action.delta > 0 ? -1 : 0) : current;
      const next = list[Math.max(0, Math.min(list.length - 1, start + action.delta))];
      if (!action.open || !state.openThreadId) {
        return { ...state, cursorId: next.id, page: Math.floor(list.indexOf(next) / PAGE_SIZE) };
      }
      return {
        ...state,
        cursorId: next.id,
        openThreadId: next.id,
        page: Math.floor(list.indexOf(next) / PAGE_SIZE),
        threads: state.threads.map((thread) => (thread.id === next.id ? { ...thread, unread: false } : thread)),
      };
    }
    case "page":
      return { ...state, page: action.page };
    case "star":
      return { ...state, threads: starThreads(state.threads, action.ids) };
    case "important":
      return { ...state, threads: importantThreads(state.threads, action.ids) };
    case "read":
      return { ...state, threads: markThreads(state.threads, action.ids, action.unread) };
    case "markAllRead": {
      const ids = visible(state).map((thread) => thread.id);
      return withSnack(
        state,
        { threads: markThreads(state.threads, ids, false) },
        "Everything in this view marked as read",
        snap(state),
      );
    }
    case "archive":
      return withSnack(
        state,
        {
          threads: archiveThreads(state.threads, action.ids),
          selected: dropSelection(action.ids, state.selected),
          openThreadId: closeIfOpen(state, action.ids),
          composes: state.composes.filter((compose) => !(compose.placement === "inline" && action.ids.includes(compose.threadId ?? ""))),
        },
        action.ids.length > 1 ? `${action.ids.length} conversations archived` : "Conversation archived",
        snap(state),
      );
    case "trash":
      return withSnack(
        state,
        {
          threads: trashThreads(state.threads, action.ids),
          selected: dropSelection(action.ids, state.selected),
          openThreadId: closeIfOpen(state, action.ids),
          composes: state.composes.filter((compose) => !action.ids.includes(compose.threadId ?? "")),
        },
        action.ids.length > 1 ? `${action.ids.length} conversations moved to Trash` : "Conversation moved to Trash",
        snap(state),
      );
    case "forever": {
      const history = snap(state);
      return withSnack(
        state,
        {
          threads: state.threads.filter((thread) => !action.ids.includes(thread.id)),
          selected: dropSelection(action.ids, state.selected),
          openThreadId: closeIfOpen(state, action.ids),
          confirm: null,
          composes: state.composes.filter((compose) => !action.ids.includes(compose.threadId ?? "")),
        },
        "Deleted forever",
        history,
      );
    }
    case "emptyTrash": {
      const history = snap(state);
      return withSnack(
        state,
        {
          threads: state.threads.filter((thread) => !thread.labels.includes(SYS.TRASH)),
          selected: [],
          confirm: null,
          openThreadId: state.openThreadId && state.threads.find((t) => t.id === state.openThreadId)?.labels.includes(SYS.TRASH)
            ? null
            : state.openThreadId,
        },
        "Trash emptied",
        history,
      );
    }
    case "spam":
      return withSnack(
        state,
        {
          threads: spamThreads(state.threads, action.ids),
          selected: dropSelection(action.ids, state.selected),
          openThreadId: closeIfOpen(state, action.ids),
          composes: state.composes.filter((compose) => !(compose.placement === "inline" && action.ids.includes(compose.threadId ?? ""))),
        },
        "Reported as spam",
        snap(state),
      );
    case "notSpam":
      return withSnack(
        state,
        {
          threads: notSpamThreads(state.threads, action.ids),
          selected: dropSelection(action.ids, state.selected),
          openThreadId: closeIfOpen(state, action.ids),
        },
        "Moved to Inbox",
        snap(state),
      );
    case "restore":
      return withSnack(
        state,
        {
          threads: restoreThreads(state.threads, action.ids),
          selected: dropSelection(action.ids, state.selected),
          openThreadId: closeIfOpen(state, action.ids),
        },
        "Conversation restored",
        snap(state),
      );
    case "snooze":
      return withSnack(
        state,
        {
          threads: snoozeThreads(state.threads, action.ids, action.until),
          selected: dropSelection(action.ids, state.selected),
          openThreadId: closeIfOpen(state, action.ids),
          palette: null,
          composes: state.composes.filter((compose) => !(compose.placement === "inline" && action.ids.includes(compose.threadId ?? ""))),
        },
        "Snoozed",
        snap(state),
      );
    case "unsnooze":
      return withSnack(
        state,
        { threads: unsnoozeThreads(state.threads, action.ids), selected: dropSelection(action.ids, state.selected) },
        "Moved to Inbox",
        snap(state),
      );
    case "toggleLabel":
      return { ...state, threads: toggleUserLabel(state.threads, action.ids, action.labelId), palette: null };
    case "moveToLabel":
      return withSnack(
        state,
        {
          threads: moveToLabel(state.threads, action.ids, action.labelId),
          selected: dropSelection(action.ids, state.selected),
          openThreadId: closeIfOpen(state, action.ids),
          palette: null,
        },
        "Conversation moved",
        snap(state),
      );
    case "createLabel":
      if (state.labels.some((label) => label.name.toLowerCase() === action.label.name.toLowerCase())) return state;
      return { ...state, labels: [...state.labels, action.label] };
    case "renameLabel":
      return {
        ...state,
        labels: state.labels.map((label) => (label.id === action.id ? { ...label, name: action.name } : label)),
      };
    case "updateLabel":
      return {
        ...state,
        labels: state.labels.map((label) =>
          label.id === action.id ? { ...label, name: action.name, bg: action.bg, color: action.color } : label,
        ),
      };
    case "deleteLabel":
      return {
        ...state,
        labels: state.labels.filter((label) => label.id !== action.id),
        threads: state.threads.map((thread) => ({ ...thread, labels: thread.labels.filter((id) => id !== action.id) })),
        confirm: null,
        view: state.view === `label:${action.id}` ? "inbox" : state.view,
      };
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "composeOpen":
      return {
        ...state,
        composes: [
          ...state.composes.filter((compose) => compose.placement !== "inline" || action.compose.placement !== "inline"),
          action.compose,
        ],
      };
    case "composePatch":
      return {
        ...state,
        composes: state.composes.map((compose) => {
          if (action.patch.maximized && compose.id !== action.id) {
            return { ...compose, minimized: true, maximized: false };
          }
          return compose.id === action.id ? { ...compose, ...action.patch } : compose;
        }),
      };
    case "composeClose":
      return { ...state, composes: state.composes.filter((compose) => compose.id !== action.id) };
    case "draftSync": {
      const compose = action.compose;
      const saved = saveDraft(state.threads, {
        threadId: compose.threadId,
        to: compose.to,
        cc: compose.cc,
        bcc: compose.bcc,
        subject: compose.subject,
        body: compose.body,
        attachments: compose.attachments,
        now: action.now,
      });
      return {
        ...state,
        threads: saved.threads,
        composes: state.composes.map((item) => (item.id === compose.id ? { ...item, threadId: saved.threadId } : item)),
      };
    }
    case "discardDraft": {
      const history = snap(state);
      return withSnack(
        state,
        {
          threads: discardDraft(state.threads, action.threadId),
          composes: state.composes.filter((compose) => compose.threadId !== action.threadId),
        },
        "Draft discarded",
        history,
      );
    }
    case "send": {
      const history = snap(state);
      const result = applySend(state.threads, action.input);
      const scheduled = action.input.when != null && action.input.when > action.input.now + 500;
      return withSnack(
        state,
        {
          threads: result.threads,
          composes: state.composes.filter((compose) => compose.id !== action.composeId),
          openThreadId: state.openThreadId,
        },
        scheduled ? `Scheduled for ${new Date(action.input.when ?? 0).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}` : "Message sent",
        history,
      );
    }
    case "cancelSchedule":
      return {
        ...state,
        threads: state.threads.map((thread) =>
          thread.id === action.id
            ? {
                ...thread,
                scheduledFor: null,
                labels: thread.draft
                  ? [...new Set([...thread.labels.filter((label) => label !== SYS.SCHEDULED), SYS.DRAFT])]
                  : thread.labels.filter((label) => label !== SYS.SCHEDULED),
              }
            : thread,
        ),
        snack: { id: state.snackSeq + 1, text: "Schedule canceled", history: snap(state) },
        snackSeq: state.snackSeq + 1,
      };
    case "tick": {
      const clock = runClock(state.threads, action.now, ME);
      if (clock.threads === state.threads) return state;
      return { ...state, threads: clock.threads, snack: { id: state.snackSeq + 1, text: clock.notices[0] ?? "Mailbox updated", history: null }, snackSeq: state.snackSeq + 1 };
    }
    case "refresh": {
      const clock = runClock(state.threads, action.now, ME);
      return {
        ...state,
        threads: clock.threads,
        pulse: state.pulse + 1,
        snack: {
          id: state.snackSeq + 1,
          text: clock.notices[0] ?? "Mailbox is up to date",
          history: null,
        },
        snackSeq: state.snackSeq + 1,
      };
    }
    case "undo":
      if (!state.snack?.history) return { ...state, snack: null };
      return {
        ...state,
        threads: state.snack.history.threads,
        composes: state.snack.history.composes,
        openThreadId: state.snack.history.openThreadId,
        labels: state.snack.history.labels,
        snack: { id: state.snackSeq + 1, text: "Action undone", history: null },
        snackSeq: state.snackSeq + 1,
      };
    case "note":
      return { ...state, snack: { id: state.snackSeq + 1, text: action.text, history: null }, snackSeq: state.snackSeq + 1 };
    case "dismissSnack":
      return { ...state, snack: null };
    case "reset": {
      const fresh = createState(action.now);
      return { ...fresh, signedIn: state.signedIn, snack: { id: 1, text: "Mailbox reset to the original seed", history: null }, snackSeq: 1 };
    }
    case "sign":
      return {
        ...state,
        signedIn: action.signedIn,
        accountOpen: false,
        settingsPage: false,
        quickSettings: false,
        openThreadId: null,
      };
    case "ui":
      return { ...state, ...action.patch };
    case "confirm":
      return { ...state, confirm: action.confirm };
    default: {
      const neverAction: never = action;
      return neverAction;
    }
  }
}

export function parseLocationHash(hash: string): Route {
  return parseHash(hash);
}
