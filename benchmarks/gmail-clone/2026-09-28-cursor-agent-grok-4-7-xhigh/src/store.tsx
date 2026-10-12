import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
} from "react";
import { DEFAULT_SETTINGS, PAGE_SIZE, STORAGE_KEY, SYS } from "./constants";
import { collectPeople, countUnread, groupThreads, pageOf, visibleThreads, type Section } from "./logic";
import { DIRECTORY, ME } from "./people";
import { applyRoute, createState, parseLocationHash, reducer, routeHash, type Action } from "./reducer";
import type { Palette, Person, State, Thread } from "./types";

type MenuPos = { top: number; left: number };

export type MailApi = {
  state: State;
  dispatch: Dispatch<Action>;
  visible: Thread[];
  paged: { page: number; pages: number; slice: Thread[] };
  sections: Section[];
  total: number;
  counts: {
    inbox: number;
    primary: number;
    promotions: number;
    social: number;
    updates: number;
    drafts: number;
    scheduled: number;
    snoozed: number;
  };
  people: Person[];
  searchRef: RefObject<HTMLInputElement | null>;
  me: Person;
  menuPos: MenuPos | null;
  openPalette: (kind: Exclude<Palette, null>, anchor: HTMLElement | null, ids?: string[]) => void;
  focusIds: () => string[];
  paletteIds: () => string[];
};

const MailContext = createContext<MailApi | null>(null);

function bootstrap(): State {
  let state = createState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as {
        version?: number;
        threads?: Thread[];
        labels?: State["labels"];
        settings?: Partial<State["settings"]>;
        recentSearches?: string[];
        signedIn?: boolean;
      };
      if (data.version === 1 && Array.isArray(data.threads) && data.threads.length > 0 && Array.isArray(data.labels)) {
        state = {
          ...state,
          threads: data.threads,
          labels: data.labels,
          settings: { ...DEFAULT_SETTINGS, ...data.settings },
          recentSearches: Array.isArray(data.recentSearches) ? data.recentSearches : [],
          signedIn: data.signedIn !== false,
        };
      }
    }
  } catch {
    state = createState();
  }
  if (typeof location !== "undefined" && location.hash) state = applyRoute(state, parseLocationHash(location.hash));
  return state;
}

export function MailProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, bootstrap);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const paletteIdRef = useRef<string[]>([]);
  const hash = routeHash(state);
  const prevHash = useRef(hash);

  useEffect(() => {
    const onHash = () => dispatch({ type: "route", route: parseLocationHash(location.hash) });
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const current = location.hash || "#/inbox";
    if (current === hash) {
      prevHash.current = hash;
      return;
    }
    const prevPath = prevHash.current.split("?")[0];
    const nextPath = hash.split("?")[0];
    prevHash.current = hash;
    if (prevPath === nextPath) history.replaceState(null, "", hash);
    else location.hash = hash;
  }, [hash]);

  useEffect(() => {
    const payload = {
      version: 1,
      threads: state.threads,
      labels: state.labels,
      settings: state.settings,
      recentSearches: state.recentSearches,
      signedIn: state.signedIn,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      const slim = {
        ...payload,
        threads: state.threads.map((thread) => ({
          ...thread,
          messages: thread.messages.map((message) => ({
            ...message,
            attachments: message.attachments.map(({ dataUrl: _ignored, ...rest }) => rest),
          })),
          draft: thread.draft
            ? { ...thread.draft, attachments: thread.draft.attachments.map(({ dataUrl: _ignored, ...rest }) => rest) }
            : null,
        })),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      } catch {
        /* local mailbox stays in memory */
      }
    }
  }, [state.threads, state.labels, state.settings, state.recentSearches, state.signedIn]);

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "tick", now: Date.now() }), 15000);
    const onVis = () => {
      if (document.visibilityState === "visible") dispatch({ type: "tick", now: Date.now() });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.style.colorScheme = state.settings.theme;
    document.title = "Grok 4.7";
  }, [state.settings.theme]);

  useEffect(() => {
    if (!state.snack) return;
    const id = window.setTimeout(() => dispatch({ type: "dismissSnack" }), 6000);
    return () => window.clearTimeout(id);
  }, [state.snack]);

  const visible = useMemo(
    () => visibleThreads(state.threads, state.labels, state.view, state.category, state.search),
    [state.threads, state.labels, state.view, state.category, state.search],
  );
  const grouped = useMemo(
    () => groupThreads(visible, state.settings.inboxType, state.view, Boolean(state.search.trim())),
    [visible, state.settings.inboxType, state.view, state.search],
  );
  const flat = useMemo(() => grouped.flatMap((group) => group.threads), [grouped]);
  const paged = useMemo(() => pageOf(flat, state.page), [flat, state.page]);
  const sections = useMemo(() => {
    const ids = new Set(paged.slice.map((thread) => thread.id));
    return grouped
      .map((group) => ({ ...group, threads: group.threads.filter((thread) => ids.has(thread.id)) }))
      .filter((group) => group.threads.length);
  }, [grouped, paged.slice]);

  const counts = useMemo(
    () => ({
      inbox: countUnread(state.threads, "inbox"),
      primary: countUnread(state.threads, "inbox", "primary"),
      promotions: countUnread(state.threads, "inbox", "promotions"),
      social: countUnread(state.threads, "inbox", "social"),
      updates: countUnread(state.threads, "inbox", "updates"),
      drafts: state.threads.filter((thread) => thread.labels.includes(SYS.DRAFT) && !thread.labels.includes(SYS.TRASH)).length,
      scheduled: state.threads.filter((thread) => thread.labels.includes(SYS.SCHEDULED) && !thread.labels.includes(SYS.TRASH)).length,
      snoozed: state.threads.filter((thread) => thread.labels.includes(SYS.SNOOZED) && !thread.labels.includes(SYS.TRASH)).length,
    }),
    [state.threads],
  );
  const people = useMemo(() => collectPeople(state.threads, DIRECTORY), [state.threads]);

  const focusIds = () => {
    if (state.selected.length) return state.selected;
    if (state.openThreadId) return [state.openThreadId];
    if (state.cursorId) return [state.cursorId];
    return [];
  };

  const openPalette = (kind: Exclude<Palette, null>, anchor: HTMLElement | null, ids?: string[]) => {
    if (state.palette === kind) {
      dispatch({ type: "ui", patch: { palette: null } });
      return;
    }
    const chosen = ids && ids.length ? ids : focusIds();
    paletteIdRef.current = chosen;
    const rect = anchor?.getBoundingClientRect();
    const left = rect ? Math.min(rect.left, window.innerWidth - 320) : Math.min(320, window.innerWidth - 320);
    setMenuPos({ top: rect ? rect.bottom + 6 : 120, left: Math.max(8, left) });
    dispatch({ type: "ui", patch: { palette: kind } });
  };

  const api: MailApi = {
    state,
    dispatch,
    visible,
    paged,
    sections,
    total: flat.length,
    counts,
    people,
    searchRef,
    me: ME,
    menuPos,
    openPalette,
    focusIds,
    paletteIds: () => paletteIdRef.current,
  };

  return <MailContext.Provider value={api}>{children}</MailContext.Provider>;
}

export function useMail(): MailApi {
  const value = useContext(MailContext);
  if (!value) throw new Error("MailProvider missing");
  return value;
}

export { PAGE_SIZE };
