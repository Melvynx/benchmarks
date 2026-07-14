import { useState, useRef, useEffect, useMemo } from "react";
import { cities } from "../data/cities";
import type { City, SelectedCity } from "../types";

type Props = {
  onSelect: (city: City) => void;
  selected: SelectedCity[];
  canAdd: boolean;
};

export function CitySearch({ onSelect, selected, canAdd }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedKeys = useMemo(
    () => new Set(selected.map((c) => `${c.name}-${c.timezone}`)),
    [selected]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return cities
      .filter(
        (c) =>
          !selectedKeys.has(`${c.name}-${c.timezone}`) &&
          (c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [query, selectedKeys]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (listRef.current && highlightIndex >= 0) {
      const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  function handleSelect(city: City) {
    onSelect(city);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={!canAdd}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={canAdd ? "Search cities..." : "Max 5 cities reached"}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-card border border-border rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        />
      </div>

      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-2 w-full bg-surface-card border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden fade-enter max-h-72 overflow-y-auto"
        >
          {filtered.map((city, i) => (
            <button
              key={`${city.name}-${city.timezone}`}
              onClick={() => handleSelect(city)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors text-sm ${
                i === highlightIndex
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "text-slate-300 hover:bg-surface-hover"
              }`}
            >
              <span>
                <span className="font-medium text-white">{city.name}</span>
                <span className="text-slate-500 ml-2">{city.country}</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">{city.timezone.split("/").pop()?.replace(/_/g, " ")}</span>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 mt-2 w-full bg-surface-card border border-border rounded-xl shadow-2xl shadow-black/40 p-4 text-center text-sm text-slate-500 fade-enter">
          No cities found for "{query}"
        </div>
      )}
    </div>
  );
}
