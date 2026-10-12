import { useMemo } from "react";
import { useMail } from "./store";
import { filterThreads } from "./query";
import type { Route, Thread } from "./types";

export function useThreadList(route: Route): Thread[] {
  const threads = useMail((s) => s.threads);
  const labels = useMail((s) => s.labels);
  const now = useMail((s) => s.now);
  const tabs = useMail((s) => s.settings.inboxTabs);
  const listKey = `${route.view}|${route.category ?? ""}|${route.labelId ?? ""}|${route.query ?? ""}`;
  return useMemo(
    () => filterThreads(Object.values(threads), route, labels, now, tabs),
    [threads, labels, now, tabs, listKey],
  );
}

/** Ids of rows currently rendered in the list, used by keyboard navigation. */
export const visibleRows = { ids: [] as string[] };
