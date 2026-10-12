import { useEffect } from "react";
import { act, openNewCompose, openReply } from "./actions";
import { navigate, parseHash, threadHash, viewHash } from "./router";
import { isUnread, viewThreads } from "./selectors";
import { useMail } from "./store";
import type { Route } from "./types";
import { useUI } from "./ui";

function listIds(route: Route) {
  const ui = useUI.getState();
  if (ui.visibleIds.length) return ui.visibleIds;
  const s = useMail.getState();
  const view = route.view.kind === "folder" && route.view.id === "inbox" && s.settings.inboxType === "default" ? ({ kind: "category", id: "primary" } as const) : route.view;
  return viewThreads(view, s.threads, s.messages, s.labels, Date.now()).threads.map((t) => t.id);
}

function targets(route: Route) {
  const ui = useUI.getState();
  if (ui.selected.length) return ui.selected;
  if (route.threadId) return [route.threadId];
  if (ui.focusedId) return [ui.focusedId];
  return [];
}

function clickToolbar(label: string) {
  const el = document.querySelector<HTMLButtonElement>(`main button[aria-label="${label}"]:not([disabled])`);
  el?.click();
  return !!el;
}

export function useShortcuts() {
  useEffect(() => {
    let g = 0;
    let star = 0;
    const handler = (e: KeyboardEvent) => {
      const s = useMail.getState();
      const ui = useUI.getState();
      if (!s.settings.shortcuts || e.defaultPrevented) return;
      const t = e.target as HTMLElement;
      if (t.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"] button')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (ui.dialog) return;
      const route = parseHash(location.hash);
      const k = e.key;
      const now = Date.now();

      if (g && now - g < 1500) {
        g = 0;
        const map: Record<string, string> = { i: "#inbox", s: "#starred", t: "#sent", d: "#drafts", a: "#all", b: "#snoozed", p: "#important", c: "#scheduled" };
        if (map[k]) {
          e.preventDefault();
          ui.clearSelection();
          navigate(map[k]);
        }
        return;
      }
      if (star && now - star < 1500) {
        star = 0;
        const ids = listIds(route);
        const th = s.threads;
        const pick: Record<string, (id: string) => boolean> = {
          a: () => true,
          n: () => false,
          r: (id) => !isUnread(th[id], s.messages),
          u: (id) => isUnread(th[id], s.messages),
          s: (id) => th[id]?.starred,
          t: (id) => !th[id]?.starred,
        };
        if (pick[k]) {
          e.preventDefault();
          ui.setSelected(ids.filter(pick[k]));
        }
        return;
      }

      const leave = () => {
        if (!route.threadId) return;
        const split = s.settings.readingPane !== "none" && window.innerWidth >= 768;
        const ids = listIds(route);
        const i = ids.indexOf(route.threadId);
        const next = ids[i + 1] ?? ids[i - 1];
        if (split && next) navigate(threadHash(route.view, next));
        else navigate(viewHash(route.view));
      };

      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };

      // Toolbar menus only mount once something is selected, so select the focused row first.
      const menu = (label: string) => {
        if (!ui.selected.length && !route.threadId && ui.focusedId) {
          e.preventDefault();
          ui.setSelected([ui.focusedId]);
          requestAnimationFrame(() => requestAnimationFrame(() => clickToolbar(label)));
          return;
        }
        if (clickToolbar(label)) e.preventDefault();
      };

      switch (k) {
        case "g":
          g = now;
          return;
        case "*":
          star = now;
          return;
        case "c":
          return run(() => openNewCompose());
        case "/":
          return run(() => window.dispatchEvent(new Event("focus-search")));
        case "?":
          return run(() => ui.openDialog({ type: "shortcuts" }));
        case "j":
        case "k": {
          const ids = listIds(route);
          if (!ids.length) return;
          const cur = route.threadId ?? ui.focusedId;
          const i = cur ? ids.indexOf(cur) : -1;
          const n = k === "j" ? Math.min(i + 1, ids.length - 1) : Math.max(i - 1, 0);
          const id = ids[i < 0 ? 0 : n];
          return run(() => {
            ui.setFocused(id);
            if (route.threadId) navigate(threadHash(route.view, id));
          });
        }
        case "o":
        case "Enter":
          if (!route.threadId && ui.focusedId && s.threads[ui.focusedId]) return run(() => navigate(threadHash(route.view, ui.focusedId!)));
          return;
        case "u":
          if (route.threadId) return run(() => navigate(viewHash(route.view)));
          return;
        case "x":
          if (ui.focusedId) return run(() => ui.toggleSelected(ui.focusedId!));
          return;
        case "e": {
          const ids = targets(route);
          if (!ids.length) return;
          return run(() => {
            act.archive(ids);
            leave();
          });
        }
        case "#": {
          const ids = targets(route);
          if (!ids.length) return;
          return run(() => {
            act.trash(ids);
            leave();
          });
        }
        case "!": {
          const ids = targets(route);
          if (!ids.length) return;
          return run(() => {
            act.spam(ids);
            leave();
          });
        }
        case "s": {
          const ids = targets(route);
          if (ids.length) return run(() => act.toggleStar(ids));
          return;
        }
        case "+":
        case "=": {
          const ids = targets(route);
          if (ids.length) return run(() => act.setImportant(ids, true));
          return;
        }
        case "-": {
          const ids = targets(route);
          if (ids.length) return run(() => act.setImportant(ids, false));
          return;
        }
        case "I": {
          const ids = targets(route);
          if (ids.length) return run(() => act.setRead(ids, true));
          return;
        }
        case "U": {
          const ids = targets(route);
          if (!ids.length) return;
          return run(() => {
            act.setRead(ids, false);
            if (route.threadId) navigate(viewHash(route.view));
          });
        }
        case "b":
          return menu("Snooze");
        case "l":
          return menu("Labels");
        case "v":
          return menu("Move to");
        case "r":
        case "a":
        case "f":
          if (route.threadId) {
            const mode = k === "r" ? "reply" : k === "a" ? "replyAll" : "forward";
            return run(() => openReply(route.threadId!, mode, undefined, mode !== "forward" && window.innerWidth >= 768));
          }
          return;
        case "z":
          if (ui.undo) {
            const u = ui.undo;
            return run(() => {
              useUI.setState({ undo: null });
              ui.dismissToast();
              u();
            });
          }
          return;
        case "Escape":
          if (ui.selected.length) return run(() => ui.clearSelection());
          return;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
