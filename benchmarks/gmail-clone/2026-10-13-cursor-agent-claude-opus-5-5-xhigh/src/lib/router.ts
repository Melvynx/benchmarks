import { useSyncExternalStore } from "react";
import type { Category, SystemFolder, ViewRef } from "./types";

export interface Route {
  view: ViewRef;
  /** Inbox tab when the view is the inbox. */
  tab: Category;
  threadId: string | null;
  page: number;
  hash: string;
}

const FOLDERS: SystemFolder[] = ["inbox", "starred", "snoozed", "important", "sent", "scheduled", "drafts", "all", "spam", "trash"];
const TABS: Category[] = ["primary", "promotions", "social", "updates", "forums"];

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "");
  const segs = raw.split("/").map((s) => decodeURIComponent(s));
  const head = segs[0] || "inbox";
  let view: ViewRef = { kind: "folder", folder: "inbox" };
  let tab: Category = "primary";
  let rest: string[] = [];
  if ((FOLDERS as string[]).includes(head)) {
    view = { kind: "folder", folder: head as SystemFolder };
    rest = segs.slice(1);
  } else if (head === "category" && TABS.includes(segs[1] as Category)) {
    view = { kind: "folder", folder: "inbox" };
    tab = segs[1] as Category;
    rest = segs.slice(2);
  } else if (head === "label" && segs[1]) {
    view = { kind: "label", labelId: segs[1] };
    rest = segs.slice(2);
  } else if (head === "search") {
    view = { kind: "search", query: segs[1] || "" };
    rest = segs.slice(2);
  } else if (head === "settings") {
    view = { kind: "settings", tab: segs[1] || "general" };
  }
  let page = 1;
  let threadId: string | null = null;
  for (const s of rest) {
    const p = s.match(/^p(\d+)$/);
    if (p) page = Math.max(1, Number(p[1]));
    else if (s) threadId = s;
  }
  return { view, tab, threadId, page, hash: raw };
}

export function viewHash(view: ViewRef, tab: Category = "primary") {
  switch (view.kind) {
    case "folder":
      if (view.folder === "inbox" && tab !== "primary") return `category/${tab}`;
      return view.folder;
    case "category":
      return `category/${view.category}`;
    case "label":
      return `label/${encodeURIComponent(view.labelId)}`;
    case "search":
      return `search/${encodeURIComponent(view.query)}`;
    case "settings":
      return `settings/${view.tab}`;
  }
}

export function routeHash(r: { view: ViewRef; tab?: Category; threadId?: string | null; page?: number }) {
  let h = viewHash(r.view, r.tab);
  if (r.page && r.page > 1) h += `/p${r.page}`;
  if (r.threadId) h += `/${r.threadId}`;
  return h;
}

export function navigate(hash: string, replace = false) {
  const target = `#${hash}`;
  if (location.hash === target) return;
  if (replace) history.replaceState(null, "", target);
  else history.pushState(null, "", target);
  window.dispatchEvent(new Event("hashchange"));
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
  };
}

let cachedHash = "";
let cachedRoute: Route = parseHash("");
function snapshot() {
  if (location.hash !== cachedHash) {
    cachedHash = location.hash;
    cachedRoute = parseHash(location.hash);
  }
  return cachedRoute;
}

export function useRoute() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const getRoute = snapshot;

export function sameView(a: ViewRef, b: ViewRef) {
  return JSON.stringify(a) === JSON.stringify(b);
}
