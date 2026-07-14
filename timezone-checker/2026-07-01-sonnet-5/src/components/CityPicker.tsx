import { useMemo, useRef, useState } from "react";
import { CITY_CATALOG } from "../lib/cities";
import { useClickOutside } from "../hooks/useClickOutside";
import { useTimezoneStore } from "../store/useTimezoneStore";

export function CityPicker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cityIds = useTimezoneStore((state) => state.cityIds);
  const addCity = useTimezoneStore((state) => state.addCity);

  useClickOutside(
    containerRef,
    () => {
      setOpen(false);
      setQuery("");
    },
    open,
  );

  const results = useMemo(() => {
    const added = new Set(cityIds);
    const available = CITY_CATALOG.filter((city) => !added.has(city.id));
    const q = query.trim().toLowerCase();
    const filtered = q
      ? available.filter(
          (city) => city.name.toLowerCase().includes(q) || city.country.toLowerCase().includes(q),
        )
      : available;

    const byRegion = new Map<string, typeof filtered>();
    for (const city of filtered) {
      const list = byRegion.get(city.region) ?? [];
      list.push(city);
      byRegion.set(city.region, list);
    }
    return byRegion;
  }, [cityIds, query]);

  const hasResults = Array.from(results.values()).some((list) => list.length > 0);

  function handleOpen() {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleAdd(id: string) {
    addCity(id);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-xl border border-base-700/70 bg-base-850/80 px-3.5 py-2 text-sm font-medium text-base-200 transition-colors hover:border-overlap-500/50 hover:text-overlap-400"
      >
        <PlusIcon />
        Add city
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-80 overflow-hidden rounded-xl border border-base-700/70 bg-base-850 shadow-2xl shadow-black/50">
          <div className="border-b border-base-700/70 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search city or country…"
              className="w-full rounded-lg bg-base-800 px-3 py-2 text-sm text-base-100 placeholder:text-base-500 focus:outline-none focus:ring-2 focus:ring-overlap-500/40"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {!hasResults && (
              <p className="px-3 py-6 text-center text-sm text-base-400">
                {cityIds.length >= 34 ? "All catalog cities added." : "No cities match your search."}
              </p>
            )}
            {Array.from(results.entries()).map(([region, cities]) =>
              cities.length === 0 ? null : (
                <div key={region} className="mb-1.5">
                  <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-500">
                    {region}
                  </p>
                  {cities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleAdd(city.id)}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm text-base-200 transition-colors hover:bg-overlap-500/10 hover:text-overlap-300"
                    >
                      <span>{city.name}</span>
                      <span className="text-xs text-base-500">{city.country}</span>
                    </button>
                  ))}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
