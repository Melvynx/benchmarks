import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES, type City } from "../data/cities";
import { formatOffset } from "../lib/timezone";
import { useClickOutside } from "../hooks/useClickOutside";
import { PlusIcon, SearchIcon } from "./Icons";

type Props = {
  selectedIds: string[];
  onAdd: (id: string) => void;
};

export function CitySearch({ selectedIds, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = CITIES.filter((c) => !selected.has(c.id));
    const scored = available.map((c) => ({ city: c, score: matchScore(c, q) }));
    const filtered = q
      ? scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
      : scored.sort((a, b) =>
          a.city.region.localeCompare(b.city.region) ||
          a.city.name.localeCompare(b.city.name) ? 1 : -1,
        );
    return filtered.map((s) => s.city);
  }, [query, selected]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      // focus after mount
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
    }
  }, [open]);

  // Keep active item visible when arrow-navigating
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[activeIndex];
      if (pick) {
        onAdd(pick.id);
        setOpen(false);
      }
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)]/60 px-3.5 py-2 text-sm text-zinc-300 transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/20 hover:text-zinc-100"
      >
        <PlusIcon width={14} height={14} className="text-emerald-400" />
        Add city
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="City catalog"
          className="absolute left-0 top-[calc(100%+8px)] z-30 w-[340px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-3 py-2">
            <SearchIcon width={14} height={14} className="text-zinc-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search cities or countries…"
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>

          <div
            ref={listRef}
            className="scroll-thin max-h-[320px] overflow-y-auto py-1"
          >
            {results.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-zinc-500">
                No cities match "{query}".
              </div>
            ) : (
              groupByRegion(results).map(([region, cities]) => (
                <div key={region}>
                  <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                    {region}
                  </div>
                  {cities.map((city) => {
                    const absoluteIndex = results.indexOf(city);
                    const active = absoluteIndex === activeIndex;
                    return (
                      <button
                        key={city.id}
                        role="option"
                        aria-selected={active}
                        data-index={absoluteIndex}
                        onMouseEnter={() => setActiveIndex(absoluteIndex)}
                        onClick={() => {
                          onAdd(city.id);
                          setOpen(false);
                        }}
                        className={
                          "flex w-full items-center justify-between px-3 py-2 text-left transition-colors " +
                          (active
                            ? "bg-emerald-950/40 text-zinc-100"
                            : "text-zinc-300 hover:bg-zinc-800/60")
                        }
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {city.name}
                          </div>
                          <div className="truncate text-xs text-zinc-500">
                            {city.country}
                          </div>
                        </div>
                        <span className="shrink-0 rounded bg-[var(--panel-2)] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                          {formatOffset(city.timezone)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function matchScore(city: City, query: string): number {
  if (!query) return 1;
  const n = city.name.toLowerCase();
  const c = city.country.toLowerCase();
  if (n === query || c === query) return 100;
  if (n.startsWith(query)) return 50;
  if (c.startsWith(query)) return 40;
  if (n.includes(query)) return 20;
  if (c.includes(query)) return 10;
  if (city.region.toLowerCase().includes(query)) return 5;
  return 0;
}

function groupByRegion(cities: City[]): Array<[string, City[]]> {
  const map = new Map<string, City[]>();
  for (const c of cities) {
    const arr = map.get(c.region) ?? [];
    arr.push(c);
    map.set(c.region, arr);
  }
  return Array.from(map.entries());
}
