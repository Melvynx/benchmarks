import { Check, Plus, Search } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { type City, REGIONS, searchCities } from "@/data/cities";
import { useDismiss } from "@/hooks/useDismiss";
import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/cn";
import { formatUtcOffset, getUtcOffsetMinutes } from "@/lib/time";
import { usePlanner } from "@/state/store";

interface Section {
  title: string | null;
  cities: City[];
}

function buildSections(query: string): Section[] {
  const results = searchCities(query);
  if (query.trim()) return [{ title: null, cities: results }];
  return REGIONS.map((region) => ({
    title: region,
    cities: results.filter((city) => city.region === region),
  })).filter((section) => section.cities.length > 0);
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Searchable combobox over the city catalog. Cities already on the board are listed but disabled. */
export function CityPicker() {
  const cityIds = usePlanner((state) => state.cityIds);
  const addCity = usePlanner((state) => state.addCity);
  const now = useNow();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const optionId = (cityId: string) => `${listboxId}-${cityId}`;

  const added = useMemo(() => new Set(cityIds), [cityIds]);
  const sections = useMemo(() => buildSections(query), [query]);
  const selectable = useMemo(
    () => sections.flatMap((section) => section.cities).filter((city) => !added.has(city.id)),
    [sections, added],
  );
  const offsets = useMemo(
    () => (open ? new Map(sections.flatMap((s) => s.cities).map((c) => [c.id, getUtcOffsetMinutes(c.timeZone, now)])) : null),
    [open, sections, now],
  );

  const close = useCallback(() => {
    setOpen(false);
    setActiveId(null);
  }, []);
  useDismiss(rootRef, open, close);

  // Derived during render so Enter right after typing always targets the top match.
  const activeCity = open
    ? (selectable.find((city) => city.id === activeId) ?? (query.trim() ? selectable[0] : undefined))
    : undefined;
  const activeCityId = activeCity?.id ?? null;

  useEffect(() => {
    if (activeCityId) document.getElementById(`${listboxId}-${activeCityId}`)?.scrollIntoView({ block: "nearest" });
  }, [activeCityId, listboxId]);

  // "/" focuses the search from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const choose = (city: City) => {
    if (added.has(city.id)) return;
    addCity(city.id);
    setQuery("");
    setActiveId(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  const move = (step: 1 | -1) => {
    if (selectable.length === 0) return;
    const index = selectable.findIndex((city) => city.id === activeCityId);
    const next = index === -1 ? (step === 1 ? 0 : selectable.length - 1) : (index + step + selectable.length) % selectable.length;
    setActiveId(selectable[next]?.id ?? null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!open) setOpen(true);
        move(event.key === "ArrowDown" ? 1 : -1);
        break;
      case "Enter":
        if (activeCity) {
          event.preventDefault();
          choose(activeCity);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        } else if (query) {
          setQuery("");
        }
        break;
    }
  };

  const hasResults = sections.some((section) => section.cities.length > 0);

  return (
    <div ref={rootRef} className="relative w-full sm:max-w-sm">
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        Add a city
      </label>
      <div className="group relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3 transition-colors group-focus-within:text-ink-2"
        />
        <input
          ref={inputRef}
          id={`${listboxId}-input`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeCityId ? optionId(activeCityId) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Add a city or country…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-full border border-line-strong bg-surface pr-10 pl-10 text-sm text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-[border-color,box-shadow] outline-none placeholder:text-ink-3 hover:border-ink-3 focus:border-focus focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--focus)_18%,transparent)]"
        />
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-line bg-surface-2 px-1.5 font-mono text-[11px] leading-5 text-ink-3 group-focus-within:hidden sm:block"
        >
          /
        </kbd>
      </div>

      {open && (
        <div className="absolute top-full right-0 left-0 z-40 mt-2 animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          <ul id={listboxId} role="listbox" aria-label="Cities" className="max-h-80 overflow-y-auto overscroll-contain p-1.5">
            {sections.map((section) => (
              <li key={section.title ?? "results"} role={section.title ? "group" : "presentation"} aria-label={section.title ?? undefined}>
                {section.title && (
                  <div
                    aria-hidden
                    className="sticky top-0 z-10 bg-surface/95 px-2.5 pt-2.5 pb-1 text-[11px] font-medium tracking-wide text-ink-3 uppercase backdrop-blur"
                  >
                    {section.title}
                  </div>
                )}
                <ul role="presentation">
                  {section.cities.map((city) => {
                    const isAdded = added.has(city.id);
                    const isActive = city.id === activeCityId;
                    const offset = offsets?.get(city.id);
                    return (
                      <li
                        key={city.id}
                        id={optionId(city.id)}
                        role="option"
                        aria-selected={isActive}
                        aria-disabled={isAdded || undefined}
                        onPointerMove={() => !isAdded && activeCityId !== city.id && setActiveId(city.id)}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => choose(city)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm select-none",
                          isActive && "bg-surface-2",
                          isAdded && "cursor-default opacity-55",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-ink">{city.name}</span>
                          <span className="block truncate text-xs text-ink-2">{city.country}</span>
                        </span>
                        {offset !== undefined && (
                          <span className="font-mono text-xs text-ink-2 tabular-nums">{formatUtcOffset(offset)}</span>
                        )}
                        <span className="flex size-6 items-center justify-center" aria-hidden>
                          {isAdded ? (
                            <Check className="size-4 text-overlap-strong" />
                          ) : (
                            <Plus className={cn("size-4 text-ink-3", !isActive && "opacity-0")} />
                          )}
                        </span>
                        {isAdded && <span className="sr-only">(already added)</span>}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          {!hasResults && (
            <p className="px-4 py-6 text-center text-sm text-ink-2">
              No city matches “<span className="font-medium text-ink">{query.trim()}</span>”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
