import { useSyncExternalStore } from "react";
import type { Category, Route, SystemView } from "./types";

const SYSTEM: SystemView[] = ["inbox", "starred", "snoozed", "important", "sent", "scheduled", "drafts", "all", "spam", "trash"];
const CATS: Category[] = ["primary", "promotions", "social", "updates"];

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const [head, a, b] = parts;
  if (head === "category" && a && CATS.includes(a as Category))
    return { view: "inbox", category: a as Category, threadId: b };
  if (head === "label" && a) return { view: "label", labelId: a, threadId: b };
  if (head === "search" && a !== undefined) return { view: "search", query: a, threadId: b };
  if (head && SYSTEM.includes(head as SystemView)) return { view: head as SystemView, threadId: a };
  return { view: "inbox" };
}

export function routeToHash(r: Route): string {
  let base: string;
  if (r.view === "inbox" && r.category && r.category !== "primary") base = `category/${r.category}`;
  else if (r.view === "label") base = `label/${encodeURIComponent(r.labelId ?? "")}`;
  else if (r.view === "search") base = `search/${encodeURIComponent(r.query ?? "")}`;
  else base = r.view;
  return "#" + base + (r.threadId ? `/${encodeURIComponent(r.threadId)}` : "");
}

export function listRoute(r: Route): Route {
  return { ...r, threadId: undefined };
}

export function navigate(r: Route, replace = false) {
  const h = routeToHash(r);
  if (h === location.hash) return;
  if (replace) history.replaceState(null, "", h);
  else location.hash = h;
  if (replace) window.dispatchEvent(new HashChangeEvent("hashchange"));
}

let cached: { hash: string; route: Route } | null = null;
function getRoute(): Route {
  if (!cached || cached.hash !== location.hash) cached = { hash: location.hash, route: parseHash(location.hash) };
  return cached.route;
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute, getRoute);
}

export function currentRoute() {
  return getRoute();
}

export const sameList = (a: Route, b: Route) =>
  a.view === b.view && (a.category ?? "primary") === (b.category ?? "primary") && a.labelId === b.labelId && a.query === b.query;
