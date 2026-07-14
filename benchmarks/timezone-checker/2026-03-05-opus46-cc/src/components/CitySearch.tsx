"use client";

import { useEffect, useRef, useState } from "react";
import { CITY_CATALOG, City } from "@/lib/cities";

export function CitySearch({
  existingIds,
  onSelect,
}: {
  existingIds: string[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const available = CITY_CATALOG.filter((c) => !existingIds.includes(c.id));

  const filtered = query.trim()
    ? available.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.country.toLowerCase().includes(query.toLowerCase())
      )
    : available;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (city: City) => {
    onSelect(city.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative max-w-sm">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Add a city..."
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 transition-colors"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg bg-slate-800 border border-slate-700 shadow-xl">
          {filtered.map((city) => (
            <button
              key={city.id}
              onClick={() => select(city)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex justify-between items-center"
            >
              <span>{city.name}</span>
              <span className="text-slate-500 text-xs">{city.country}</span>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && query.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 shadow-xl p-3 text-sm text-slate-500">
          No cities found
        </div>
      )}
    </div>
  );
}
