import { useEffect } from "react";
import { getMail } from "../lib/store";
import { ui } from "../lib/ui";
import { actions } from "../lib/actions";
import { getRoute, navigate, routeHash } from "../lib/router";
import { msgsOf, viewThreads } from "../lib/selectors";
import { isTypingTarget } from "../lib/utils";

const GO: Record<string, string> = {
  i: "inbox",
  s: "starred",
  t: "sent",
  d: "drafts",
  a: "all",
  b: "snoozed",
  p: "spam",
  e: "trash",
};

function listIds() {
  return Array.from(document.querySelectorAll<HTMLElement>("[role=grid] [data-thread-id]")).map((el) => el.dataset.threadId!);
}

function overlayOpen() {
  return !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"]');
}

function lastReceived(threadId: string) {
  const s = getMail();
  const t = s.threads[threadId];
  if (!t) return undefined;
  const real = msgsOf(t, s.messages).filter((m) => m.status !== "draft");
  return [...real].reverse().find((m) => m.status === "received") ?? real[real.length - 1];
}

export function useShortcuts() {
  useEffect(() => {
    let prefix: "g" | "*" | null = null;
    let prefixTimer = 0;

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const s = getMail();
      if (!s.settings.keyboardShortcuts || s.signedOut) return;
      const u = ui();
      if (u.preview || u.confirm || u.alert || u.linkWarning || u.labelDialog) return;
      if (e.key !== "?" && overlayOpen()) return;

      const route = getRoute();
      const inThread = !!route.threadId;
      const ordered = () => viewThreads(s, route.view, route.tab).map((t) => t.id);
      const targets = () => (u.selected.length ? u.selected : route.threadId ? [route.threadId] : u.focusedId ? [u.focusedId] : []);
      const key = e.key;

      if (prefix) {
        const p = prefix;
        prefix = null;
        clearTimeout(prefixTimer);
        if (p === "g") {
          if (GO[key]) {
            e.preventDefault();
            navigate(GO[key]);
          } else if (key === "k") {
            e.preventDefault();
            u.set({ sidePanel: "tasks" });
          } else if (key === "c") {
            e.preventDefault();
            u.set({ sidePanel: "contacts" });
          }
          return;
        }
        const ids = listIds();
        const th = (id: string) => s.threads[id];
        const pick: Record<string, (id: string) => boolean> = {
          a: () => true,
          n: () => false,
          r: (id) => !th(id)?.unread,
          u: (id) => !!th(id)?.unread,
          s: (id) => !!th(id)?.starred,
          t: (id) => !th(id)?.starred,
        };
        if (pick[key]) {
          e.preventDefault();
          u.select(ids.filter(pick[key]));
        }
        return;
      }

      const afterRemove = () => {
        if (!inThread) return;
        const list = ordered();
        const i = list.indexOf(route.threadId!);
        const mode = s.settings.autoAdvance;
        const next = mode === "newer" ? list[i - 1] : mode === "older" ? list[i + 1] : undefined;
        navigate(routeHash({ view: route.view, tab: route.tab, page: route.page, threadId: next ?? null }));
      };

      const move = (dir: 1 | -1) => {
        if (inThread) {
          const list = ordered();
          const i = list.indexOf(route.threadId!);
          const next = list[i + dir];
          if (next) navigate(routeHash({ view: route.view, tab: route.tab, page: route.page, threadId: next }));
          return;
        }
        const ids = listIds();
        if (!ids.length) return;
        const i = u.focusedId ? ids.indexOf(u.focusedId) : -1;
        u.set({ focusedId: ids[Math.max(0, Math.min(ids.length - 1, i + dir))] });
      };

      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };

      switch (key) {
        case "c":
          return run(() => actions.compose());
        case "/":
          return run(() => u.set({ searchFocusNonce: u.searchFocusNonce + 1, mobileSearch: window.innerWidth < 768 }));
        case "?":
          return run(() => u.set({ shortcutsOpen: !u.shortcutsOpen }));
        case "g":
        case "*":
          e.preventDefault();
          prefix = key;
          prefixTimer = window.setTimeout(() => (prefix = null), 1500);
          return;
        case "j":
          return run(() => move(1));
        case "k":
          return run(() => move(-1));
        case "o":
        case "Enter":
          if (inThread || !u.focusedId) return;
          return run(() => {
            const el = document.querySelector<HTMLElement>(`[data-thread-id="${u.focusedId}"]`);
            el?.click();
          });
        case "u":
          if (!inThread) return;
          return run(() => navigate(routeHash({ view: route.view, tab: route.tab, page: route.page })));
        case "x":
          if (inThread || !u.focusedId) return;
          return run(() => u.toggleSelect(u.focusedId!));
        case "s": {
          const ids = targets();
          if (!ids.length) return;
          return run(() => actions.star(ids, !ids.every((id) => s.threads[id]?.starred)));
        }
        case "e":
        case "y": {
          const ids = targets();
          if (!ids.length) return;
          return run(() => {
            const folder = route.view.kind === "folder" ? route.view.folder : null;
            if (folder === "trash" || folder === "spam") actions.moveToInbox(ids);
            else actions.archive(ids);
            u.clearSelection();
            afterRemove();
          });
        }
        case "#": {
          const ids = targets();
          if (!ids.length) return;
          return run(() => {
            const folder = route.view.kind === "folder" ? route.view.folder : null;
            if (folder === "trash") actions.deleteForever(ids);
            else {
              actions.trash(ids);
              u.clearSelection();
              afterRemove();
            }
          });
        }
        case "!": {
          const ids = targets();
          if (!ids.length) return;
          return run(() => {
            actions.spam(ids);
            u.clearSelection();
            afterRemove();
          });
        }
        case "I":
        case "U": {
          const ids = targets();
          if (!ids.length) return;
          return run(() => {
            actions.markRead(ids, key === "I");
            if (key === "U" && inThread) navigate(routeHash({ view: route.view, tab: route.tab, page: route.page }));
          });
        }
        case "m": {
          const ids = targets();
          if (!ids.length) return;
          return run(() => {
            actions.mute(ids);
            afterRemove();
          });
        }
        case "+":
        case "=":
        case "-": {
          const ids = targets();
          if (!ids.length) return;
          return run(() => actions.important(ids, key !== "-"));
        }
        case "z":
          return run(() => actions.undo());
        case "r":
        case "a":
        case "f": {
          if (!inThread) return;
          const m = lastReceived(route.threadId!);
          if (!m) return;
          const kind = key === "r" ? "reply" : key === "a" ? "replyAll" : "forward";
          return run(() => actions.reply(m.id, kind, window.innerWidth >= 768));
        }
        case "l":
        case "v":
        case "b": {
          const ids = targets();
          if (!ids.length) return;
          return run(() => {
            if (!inThread && !u.selected.length) u.select(ids);
            setTimeout(() => ui().set({ menu: key === "l" ? "label" : key === "v" ? "move" : "snooze" }), 0);
          });
        }
        case "[":
        case "]": {
          if (!inThread) return;
          return run(() => {
            const list = ordered();
            const i = list.indexOf(route.threadId!);
            actions.archive([route.threadId!]);
            const next = key === "[" ? list[i - 1] : list[i + 1];
            navigate(routeHash({ view: route.view, tab: route.tab, page: route.page, threadId: next ?? null }));
          });
        }
        case "Escape":
          if (u.selected.length) return run(() => u.clearSelection());
          if (u.shortcutsOpen) return run(() => u.set({ shortcutsOpen: false }));
          if (u.quickSettings) return run(() => u.set({ quickSettings: false }));
          return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(prefixTimer);
    };
  }, []);
}

export const SHORTCUT_GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Compose & chat",
    items: [
      ["c", "Compose"],
      ["⌘ Enter", "Send"],
      ["⌘ ⇧ C", "Add Cc recipients"],
      ["⌘ ⇧ B", "Add Bcc recipients"],
      ["r", "Reply"],
      ["a", "Reply all"],
      ["f", "Forward"],
      ["Esc", "Close compose (saves draft)"],
    ],
  },
  {
    title: "Navigation",
    items: [
      ["j / k", "Older / newer conversation"],
      ["o / Enter", "Open conversation"],
      ["u", "Back to threadlist"],
      ["/", "Search mail"],
      ["g then i", "Go to Inbox"],
      ["g then s", "Go to Starred"],
      ["g then t", "Go to Sent"],
      ["g then d", "Go to Drafts"],
      ["g then a", "Go to All Mail"],
      ["g then b", "Go to Snoozed"],
      ["g then k", "Open Tasks"],
      ["g then c", "Open Contacts"],
      ["?", "Open keyboard shortcuts"],
    ],
  },
  {
    title: "Actions",
    items: [
      ["x", "Select conversation"],
      ["s", "Star / unstar"],
      ["e", "Archive"],
      ["#", "Delete"],
      ["!", "Report spam"],
      ["m", "Mute"],
      ["⇧ I", "Mark as read"],
      ["⇧ U", "Mark as unread"],
      ["+ / -", "Mark important / not important"],
      ["l", "Label as"],
      ["v", "Move to"],
      ["b", "Snooze"],
      ["[ / ]", "Archive and go newer / older"],
      ["z", "Undo last action"],
    ],
  },
  {
    title: "Selection",
    items: [
      ["* then a", "Select all"],
      ["* then n", "Deselect all"],
      ["* then r", "Select read"],
      ["* then u", "Select unread"],
      ["* then s", "Select starred"],
      ["* then t", "Select unstarred"],
    ],
  },
];
