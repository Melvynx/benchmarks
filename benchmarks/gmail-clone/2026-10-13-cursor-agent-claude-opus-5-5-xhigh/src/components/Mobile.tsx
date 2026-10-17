import { useEffect, useMemo, useRef, useState } from "react";
import { useMail } from "../lib/store";
import { useUI, ui } from "../lib/ui";
import { actions } from "../lib/actions";
import { useRoute } from "../lib/router";
import { cn } from "../lib/utils";
import { Icon, IconButton } from "./ui";
import { SuggestionList, runSearch, useSearchSuggestions } from "./SearchBar";
import { ThreadActions } from "./ThreadActions";

export function MobileSearch() {
  const open = useUI((s) => s.mobileSearch);
  const input = useUI((s) => s.searchInput);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLInputElement>(null);
  const close = useMemo(() => () => ui().set({ mobileSearch: false }), []);
  const items = useSearchSuggestions(input, close);
  const clear = useMail((s) => s.clearRecentSearches);

  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 20);
  }, [open]);
  useEffect(() => setActive(-1), [input]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-surface animate-fade" role="dialog" aria-label="Search mail">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && items[active]) items[active].run();
          else runSearch(input);
        }}
        className="flex h-14 shrink-0 items-center gap-1 border-b border-line px-1"
      >
        <IconButton icon="arrow_back" size="lg" label="Close search" onClick={close} />
        <input
          ref={ref}
          value={input}
          onChange={(e) => ui().set({ searchInput: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(items.length - 1, a + 1)));
            else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(-1, a - 1)));
          }}
          placeholder="Search in mail"
          aria-label="Search mail"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent font-sans text-base text-fg outline-none placeholder:text-fg-3"
          autoComplete="off"
        />
        {input && <IconButton icon="close" size="lg" label="Clear" onClick={() => (ui().set({ searchInput: "" }), ref.current?.focus())} />}
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!input.trim() && items.length > 0 && (
          <div className="flex items-center justify-between px-4 pt-3 font-sans text-xs font-medium text-fg-3">
            <span>Recent searches</span>
            <button type="button" onClick={clear} className="rounded px-2 py-1 text-primary">Clear</button>
          </div>
        )}
        <SuggestionList items={items} active={active} term={input.trim()} onHover={setActive} onPick={(s) => s.run()} />
        {!input.trim() && (
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {[
              ["is:unread", "Unread", "mark_email_unread"],
              ["has:attachment", "Attachments", "attach_file"],
              ["is:starred", "Starred", "star"],
              ["newer_than:7d", "Last 7 days", "schedule"],
            ].map(([q, l, icon]) => (
              <button key={q} type="button" onClick={() => runSearch(q)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-soft px-3 font-sans text-sm text-fg-2">
                <Icon name={icon as "star"} size={18} />
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ComposeFab() {
  const composers = useUI((s) => s.composers);
  const route = useRoute();
  const selecting = useUI((s) => s.selected.length > 0);
  const [extended, setExtended] = useState(true);

  useEffect(() => {
    const el = document.querySelector("[data-main-scroll]");
    const scroller = el?.querySelector(".overflow-y-auto") ?? null;
    if (!scroller) return;
    let last = scroller.scrollTop;
    const on = () => {
      const t = scroller.scrollTop;
      if (Math.abs(t - last) > 6) setExtended(t < last || t < 40);
      last = t;
    };
    scroller.addEventListener("scroll", on, { passive: true });
    return () => scroller.removeEventListener("scroll", on);
  }, [route.hash]);

  if (composers.length || route.threadId || route.view.kind === "settings" || selecting) return null;
  return (
    <button
      type="button"
      onClick={() => actions.compose()}
      aria-label="Compose"
      className={cn(
        "no-print fixed bottom-[calc(env(safe-area-inset-bottom)+20px)] right-4 z-[50] inline-flex h-14 items-center gap-3 rounded-2xl bg-compose font-sans text-sm font-medium text-on-compose shadow-e2 transition-[width,padding] active:shadow-e1",
        extended ? "px-4 pr-5" : "w-14 justify-center px-0",
      )}
    >
      <Icon name="edit" size={24} />
      {extended && <span>Compose</span>}
    </button>
  );
}

export function MobileSelectionBar() {
  const selected = useUI((s) => s.selected);
  const route = useRoute();
  if (!selected.length || route.threadId) return null;
  return (
    <div className="no-print fixed inset-x-0 top-0 z-[55] flex h-14 items-center gap-1 bg-surface px-1 shadow-e1 animate-fade">
      <IconButton icon="close" size="lg" label="Clear selection" onClick={() => ui().clearSelection()} />
      <span className="min-w-8 font-sans text-lg text-fg tabular-nums">{selected.length}</span>
      <div className="ml-auto flex min-w-0 items-center">
        <ThreadActions ids={selected} view={route.view} compact />
      </div>
    </div>
  );
}
