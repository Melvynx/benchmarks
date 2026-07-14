import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES, type City } from "../data/cities";

interface Props {
  selectedIds: string[];
  onAdd: (id: string) => void;
}

export function CitySearch({ selectedIds, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selected = new Set(selectedIds);
    return CITIES.filter((c) => !selected.has(c.id))
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, selectedIds]);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (city: City) => {
    onAdd(city.id);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="search" ref={rootRef}>
      <svg className="search__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
        />
      </svg>
      <input
        className="search__input"
        placeholder="Add a city - search by name or country"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Add a city"
        aria-expanded={open}
        role="combobox"
        aria-controls="city-listbox"
      />
      {open && (
        <div className="search__dropdown" id="city-listbox" role="listbox">
          {results.length === 0 ? (
            <div className="search__empty">No cities match "{query}"</div>
          ) : (
            results.map((city, i) => (
              <button
                key={city.id}
                role="option"
                aria-selected={i === active}
                className={`search__option ${i === active ? "is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(city)}
              >
                <span className="search__city">{city.name}</span>
                <span className="search__meta">
                  {city.country} · {city.region}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
