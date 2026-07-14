import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES, type City } from "../data/cities";

type Props = {
  selectedIds: string[];
  onAdd: (id: string) => void;
};

export function AddCity({ selectedIds, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = useMemo(
    () => CITIES.filter((c) => !selectedIds.includes(c.id)),
    [selectedIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q),
    );
  }, [available, query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => setActiveIdx(0), [query]);

  const pick = (city: City) => {
    onAdd(city.id);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIdx]) pick(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Group by region in display order
  const grouped = useMemo(() => {
    const order: City["region"][] = [
      "North America",
      "South America",
      "Europe",
      "Africa",
      "Middle East",
      "Asia",
      "Oceania",
    ];
    const map = new Map<City["region"], City[]>();
    filtered.forEach((c) => {
      if (!map.has(c.region)) map.set(c.region, []);
      map.get(c.region)!.push(c);
    });
    return order
      .map((r) => [r, map.get(r) ?? []] as const)
      .filter(([, arr]) => arr.length > 0);
  }, [filtered]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-zinc-950 font-semibold px-3.5 py-2 text-sm hover:bg-emerald-400 transition shadow-sm shadow-emerald-500/20"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add city
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] max-h-[420px] rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-50 flex flex-col fade-in">
          <div className="p-2 border-b border-white/10">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search by city or country..."
              className="w-full bg-zinc-800/60 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                No cities match "{query}"
              </div>
            )}
            {grouped.map(([region, arr]) => (
              <div key={region}>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-500">
                  {region}
                </div>
                {arr.map((city) => {
                  const globalIdx = filtered.indexOf(city);
                  const active = globalIdx === activeIdx;
                  return (
                    <button
                      key={city.id}
                      onClick={() => pick(city)}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left transition ${
                        active
                          ? "bg-emerald-500/10 text-zinc-50"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base leading-none">{city.flag}</span>
                        <span className="truncate font-medium">{city.name}</span>
                      </span>
                      <span className="text-xs text-zinc-500 shrink-0">
                        {city.country}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
