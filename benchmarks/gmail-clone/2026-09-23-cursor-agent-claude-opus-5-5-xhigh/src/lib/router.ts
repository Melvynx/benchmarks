import { useSyncExternalStore } from "react";
import type { Category, FolderId, Route, View } from "./types";

const FOLDERS: FolderId[] = ["inbox", "starred", "snoozed", "important", "sent", "scheduled", "drafts", "all", "spam", "trash"];
const CATEGORIES: Category[] = ["primary", "promotions", "social", "updates"];

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, "");
  const parts = h.split("/");
  const [head, a, b] = parts;
  if (head === "search" && a !== undefined) {
    return { view: { kind: "search", q: decodeURIComponent(a) }, threadId: b || undefined };
  }
  if (head === "label" && a) return { view: { kind: "label", id: decodeURIComponent(a) }, threadId: b || undefined };
  if (head === "category" && CATEGORIES.includes(a as Category)) {
    return { view: { kind: "category", id: a as Category }, threadId: b || undefined };
  }
  if (FOLDERS.includes(head as FolderId)) return { view: { kind: "folder", id: head as FolderId }, threadId: a || undefined };
  return { view: { kind: "folder", id: "inbox" } };
}

export function viewHash(view: View) {
  switch (view.kind) {
    case "folder":
      return `#${view.id}`;
    case "category":
      return view.id === "primary" ? "#inbox" : `#category/${view.id}`;
    case "label":
      return `#label/${encodeURIComponent(view.id)}`;
    case "search":
      return `#search/${encodeURIComponent(view.q)}`;
  }
}

export function threadHash(view: View, threadId: string) {
  return `${viewHash(view)}/${threadId}`;
}

export function navigate(hash: string, replace = false) {
  if (replace) history.replaceState(null, "", hash);
  else if (location.hash !== hash) history.pushState(null, "", hash);
  window.dispatchEvent(new Event("routechange"));
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  window.addEventListener("routechange", cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
    window.removeEventListener("routechange", cb);
  };
}

export function useHash() {
  return useSyncExternalStore(subscribe, () => location.hash);
}

export function sameView(a: View, b: View) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "search" && b.kind === "search") return a.q === b.q;
  return (a as { id: string }).id === (b as { id: string }).id;
}
