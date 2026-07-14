import { useEffect, useMemo, useRef, useState } from 'react';
import type { City } from '../lib/types';
import { CITY_CATALOG } from '../lib/timezones';
import { getOffsetMinutes, formatOffset } from '../lib/timezones';

interface CitySelectorProps {
  selectedIds: string[];
  onAdd: (city: City) => void;
}

export function CitySelector({ selectedIds, onAdd }: CitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openMenu = () => {
    setQuery('');
    setHighlight(0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? CITY_CATALOG.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q) ||
            c.region.toLowerCase().includes(q),
        )
      : CITY_CATALOG;
    return list;
  }, [query]);

  const addable = results.filter((c) => !selectedSet.has(c.id));

  function choose(city: City) {
    if (selectedSet.has(city.id)) return;
    onAdd(city);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(addable.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const city = addable[highlight];
      if (city) choose(city);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent-500/20 to-accent-500/10 px-3 py-2 text-sm font-medium text-accent-200 ring-1 ring-inset ring-accent-400/40 transition-colors hover:from-accent-500/30 hover:to-accent-500/15"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add city
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(22rem,92vw)] overflow-hidden rounded-2xl border border-ink-700 bg-ink-850/95 shadow-2xl shadow-black/40 backdrop-blur animate-fade-in">
          <div className="border-b border-ink-700 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-ink-900 px-2.5 py-2 ring-1 ring-inset ring-ink-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-4 w-4 text-slate-500"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search city or country…"
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>
          <ul
            role="listbox"
            className="scrollbar-thin max-h-72 overflow-y-auto p-1"
          >
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                No cities match “{query}”.
              </li>
            )}
            {results.map((city) => {
              const taken = selectedSet.has(city.id);
              const idx = addable.indexOf(city);
              const activeRow = idx === highlight && !taken;
              const offset = getOffsetMinutes(city.tz);
              return (
                <li key={city.id}>
                  <button
                    type="button"
                    disabled={taken}
                    onClick={() => choose(city)}
                    onMouseEnter={() => !taken && setHighlight(idx)}
                    className={[
                      'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      taken
                        ? 'cursor-not-allowed opacity-40'
                        : activeRow
                          ? 'bg-ink-700/70 text-white'
                          : 'text-slate-300 hover:bg-ink-800',
                    ].join(' ')}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-100">
                          {city.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {city.country} · {city.region}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-md bg-ink-900 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-400">
                        {formatOffset(offset)}
                      </span>
                      {taken && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 text-slate-500"
                          aria-hidden
                        >
                          <path d="m20 6-11 11-5-5" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-ink-700 px-3 py-1.5 text-[11px] text-slate-500">
            {CITY_CATALOG.length} cities · ↑↓ navigate · ↵ select
          </div>
        </div>
      )}
    </div>
  );
}
