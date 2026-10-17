import { Check, Plus, Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { type City, REGIONS, searchCities } from "@/lib/cities";
import { cn } from "@/lib/cn";
import { formatClock, formatUtcOffset, type TimeFormat } from "@/lib/format";
import { getUtcOffsetMinutes, getWallClock } from "@/lib/timezone";

interface CityPickerProps {
  selectedIds: readonly string[];
  now: Date;
  format: TimeFormat;
  onAdd: (city: City) => void;
}

interface Group {
  label: string | null;
  cities: City[];
}

export function CityPicker({ selectedIds, now, format, onAdd }: CityPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const results = useMemo(() => searchCities(query), [query]);

  // Browsing shows the catalog by region; searching shows a single ranked list.
  const groups: Group[] = useMemo(() => {
    if (query.trim()) return [{ label: null, cities: results }];
    return REGIONS.map((region) => ({
      label: region,
      cities: results.filter((city) => city.region === region),
    })).filter((group) => group.cities.length > 0);
  }, [query, results]);

  const selectable = useMemo(
    () => groups.flatMap((group) => group.cities).filter((city) => !selected.has(city.id)),
    [groups, selected],
  );
  const activeCity = selectable.find((city) => city.id === activeId) ?? selectable[0] ?? null;

  const offsets = useMemo(() => {
    const minute = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
    return new Map(results.map((city) => [city.id, getUtcOffsetMinutes(city.timeZone, minute)]));
  }, [results, now]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || !activeCity) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-city-id="${activeCity.id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeCity]);

  const choose = (city: City) => {
    if (selected.has(city.id)) return;
    onAdd(city);
    setQuery("");
    setActiveId(null);
    setOpen(false);
  };

  const move = (step: number) => {
    if (!selectable.length) return;
    const index = activeCity ? selectable.indexOf(activeCity) : -1;
    const next = selectable[(index + step + selectable.length) % selectable.length];
    setActiveId(next?.id ?? null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) setOpen(true);
        else move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) setOpen(true);
        else move(-1);
        break;
      case "Enter":
        if (open && activeCity) {
          event.preventDefault();
          choose(activeCity);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else if (query) {
          setQuery("");
        } else {
          inputRef.current?.blur();
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const optionId = (city: City) => `${listboxId}-${city.id}`;

  return (
    <div ref={rootRef} className="relative w-full sm:w-80">
      <div className="group relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Add a city"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeCity ? optionId(activeCity) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Add a city or country…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveId(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-xl bg-surface-2 pr-10 pl-9 text-sm text-ink ring-1 ring-line-strong transition-shadow ring-inset placeholder:text-ink-3 hover:ring-ink-3 focus:bg-surface focus:ring-2 focus:ring-ink focus:outline-none"
        />
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-md px-1 font-mono text-[11px] text-ink-3 ring-1 ring-line-strong group-focus-within:hidden sm:inline-flex"
        >
          /
        </kbd>
      </div>

      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Cities"
          className="animate-pop-in absolute top-full right-0 z-50 mt-2 max-h-[min(24rem,60dvh)] w-full overflow-y-auto overscroll-contain rounded-2xl bg-surface p-1.5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.25),0_0_0_1px_var(--line)] sm:w-[22rem]"
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-3">
              No city matches “{query.trim()}”.
              <br />
              Try a country name, like “Japan”.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label ?? "results"} role="group" aria-label={group.label ?? "Results"}>
                {group.label && (
                  <div className="sticky -top-1.5 z-10 bg-surface/95 px-2.5 pt-2.5 pb-1 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase backdrop-blur-sm">
                    {group.label}
                  </div>
                )}
                {group.cities.map((city) => {
                  const added = selected.has(city.id);
                  const active = activeCity?.id === city.id;
                  const offset = offsets.get(city.id) ?? 0;
                  return (
                    <div
                      key={city.id}
                      id={optionId(city)}
                      data-city-id={city.id}
                      role="option"
                      aria-selected={active}
                      aria-disabled={added}
                      onPointerMove={() => !added && !active && setActiveId(city.id)}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => choose(city)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm",
                        added ? "cursor-default opacity-50" : "cursor-pointer",
                        active && "bg-sleep",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-lg",
                          added ? "bg-overlap-soft text-overlap-text" : "bg-sleep text-ink-3",
                          active && !added && "bg-ink text-canvas",
                        )}
                      >
                        {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{city.name}</span>
                        <span className="block truncate text-xs text-ink-3">
                          {added ? "Already in your list" : city.country}
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-mono text-xs leading-tight tabular">
                        <span className="block text-ink-2">
                          {formatClock(getWallClock(now, offset).minutesOfDay, format, true)}
                        </span>
                        <span className="block text-ink-3">{formatUtcOffset(offset)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
