"use client";

import { useState, useRef, useEffect } from "react";
import { CITY_CATALOG, City } from "@/lib/cities";

interface CitySelectorProps {
  selectedIds: string[];
  onAdd: (cityId: string) => void;
}

export function CitySelector({ selectedIds, onAdd }: CitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const available = CITY_CATALOG.filter((c) => !selectedIds.includes(c.id));
  const filtered = query.trim()
    ? available.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.country.toLowerCase().includes(query.toLowerCase())
      )
    : available;

  const grouped = filtered.reduce<Record<string, City[]>>((acc, city) => {
    (acc[city.region] ??= []).push(city);
    return acc;
  }, {});

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          setQuery("");
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-900"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add City
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search city or country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <div className="max-h-64 overflow-y-auto px-1 pb-1">
            {Object.keys(grouped).length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-zinc-400">No cities found</p>
            ) : (
              Object.entries(grouped).map(([region, cities]) => (
                <div key={region}>
                  <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {region}
                  </div>
                  {cities.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => {
                        onAdd(city.id);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-emerald-50"
                    >
                      <span className="font-medium text-zinc-900">{city.name}</span>
                      <span className="text-xs text-zinc-400">{city.country}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
