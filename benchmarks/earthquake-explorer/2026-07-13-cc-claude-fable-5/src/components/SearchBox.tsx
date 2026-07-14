import { useEffect, useRef, useState } from "react";
import { geocode, type GeocodeHit } from "../lib/api";

type Props = {
  query: string;
  onQuery: (q: string) => void;
  onGoTo: (hit: GeocodeHit) => void;
};

export function SearchBox({ query, onQuery, onGoTo }: Props) {
  const [text, setText] = useState(query);
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setText(query), [query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDocClick);
    return () => document.removeEventListener("pointerdown", onDocClick);
  }, []);

  const runGeocode = (value: string) => {
    abortRef.current?.abort();
    if (value.trim().length < 3) {
      setHits([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setGeoError(false);
    geocode(value, controller.signal)
      .then((results) => {
        setHits(results);
        setSearching(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setGeoError(true);
        setSearching(false);
        void err;
      });
  };

  const handleInput = (value: string) => {
    setText(value);
    setOpen(true);
    onQuery(value); // live-filter the stream by place text
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => runGeocode(value), 450);
  };

  return (
    <div className="search" ref={wrapRef}>
      <label className="search-field">
        <span className="sr-only">Search places or filter events by location name</span>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="search-icon">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <input
          type="search"
          className="search-input"
          placeholder="Filter by place, or find a region…"
          value={text}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          aria-expanded={open && (hits.length > 0 || searching)}
        />
        {text && (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search"
            onClick={() => {
              handleInput("");
              setOpen(false);
            }}
          >
            ×
          </button>
        )}
      </label>
      {open && text.trim().length >= 3 && (
        <div className="search-pop">
          <p className="search-pop-note">
            Stream is filtered to places matching “{text.trim()}”.
          </p>
          <p className="search-pop-head">Go to a region</p>
          {searching && <p className="search-pop-note">Searching places…</p>}
          {geoError && <p className="search-pop-note">Place lookup unavailable right now.</p>}
          {!searching && !geoError && hits.length === 0 && (
            <p className="search-pop-note">No matching places found.</p>
          )}
          <ul className="search-hits">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="search-hit"
                  onClick={() => {
                    onGoTo(hit);
                    setOpen(false);
                  }}
                >
                  {hit.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="search-pop-credit">Place search by OpenStreetMap Nominatim</p>
        </div>
      )}
    </div>
  );
}
