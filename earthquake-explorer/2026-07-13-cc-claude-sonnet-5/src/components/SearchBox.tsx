import { useEffect, useRef, useState } from "react";
import { geocodePlace, type GeocodeResult } from "../lib/geocode";
import type { PlaceFilter } from "../lib/urlState";

export interface SearchBoxProps {
  place: PlaceFilter | null;
  onChange: (place: PlaceFilter | null) => void;
}

export function SearchBox({ place, onChange }: SearchBoxProps) {
  const [query, setQuery] = useState(place?.label ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(place?.label ?? "");
  }, [place]);

  useEffect(() => {
    if (!open) return;
    window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setErrorMsg(null);
      try {
        const r = await geocodePlace(query, controller.signal);
        setResults(r);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setErrorMsg("Place search is unavailable right now.");
        }
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, open]);

  function selectResult(r: GeocodeResult) {
    onChange({ label: r.label, lat: r.lat, lon: r.lon, radiusKm: 500 });
    setQuery(r.label);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setResults([]);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-xs"
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <label htmlFor="place-search" className="sr-only">
        Search for a place or region
      </label>
      <div className="flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-900 px-2.5 focus-within:border-accent">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-ink-400">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id="place-search"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="place-search-results"
          autoComplete="off"
          placeholder="Search a place, e.g. Tokyo"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="min-h-11 w-full bg-transparent text-[13px] text-ink-50 outline-none placeholder:text-ink-500"
        />
        {(place || query) && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear place search"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-400 hover:text-ink-50"
          >
            ×
          </button>
        )}
      </div>

      {open && (query.trim().length >= 2 || loading) && (
        <ul
          id="place-search-results"
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ink-600 bg-ink-850 py-1 shadow-lg"
        >
          {loading && <li className="px-3 py-2 text-[12.5px] text-ink-400">Searching…</li>}
          {!loading && errorMsg && <li className="px-3 py-2 text-[12.5px] text-alert-orange">{errorMsg}</li>}
          {!loading && !errorMsg && results.length === 0 && (
            <li className="px-3 py-2 text-[12.5px] text-ink-400">No places found.</li>
          )}
          {!loading &&
            results.map((r, i) => (
              <li key={`${r.lat}-${r.lon}-${i}`}>
                <button
                  type="button"
                  onClick={() => selectResult(r)}
                  className="block w-full px-3 py-2 text-left text-[12.5px] text-ink-100 hover:bg-ink-800"
                >
                  {r.label}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
