import { useEffect, useState } from "react";
import type { Route, ViewId } from "../types";

const PARAM_VIEWS = new Set<ViewId>(["label", "search", "category"]);
const VIEWS = new Set<ViewId>([
  "inbox", "category", "starred", "snoozed", "important", "sent", "scheduled", "drafts", "all", "spam", "trash", "label", "search", "settings",
]);

export function parseHash(hash: string): Route {
  const segs = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const view = (segs[0] ?? "inbox") as ViewId;
  if (!VIEWS.has(view)) return { view: "inbox" };
  if (PARAM_VIEWS.has(view)) return { view, param: segs[1] ?? "", threadId: segs[2] };
  return { view, threadId: segs[1] };
}

export function routeToHash(r: Route): string {
  const parts: string[] = [r.view];
  if (PARAM_VIEWS.has(r.view)) parts.push(encodeURIComponent(r.param ?? ""));
  if (r.threadId) parts.push(r.threadId);
  return "#/" + parts.join("/");
}

export function navigate(r: Route, replace = false) {
  const hash = routeToHash(r);
  if (hash === window.location.hash) return;
  if (replace) {
    history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else window.location.hash = hash;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function listRoute(r: Route): Route {
  return { view: r.view, param: r.param };
}
