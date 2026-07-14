import { useState, useRef, useEffect, useMemo } from "react";
import { CITIES } from "./cities";
import "./CitySearch.css";

export function CitySearch({ onAdd, disabled, existing }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const existingTimezones = useMemo(() => new Set(existing.map((c) => c.timezone)), [existing]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return CITIES.filter(
      (c) =>
        (c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)) &&
        !existingTimezones.has(c.timezone)
    ).slice(0, 12);
  }, [query, existingTimezones]);

  useEffect(() => {
    setFocused(0);
  }, [results.length]);

  const handleKey = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((f) => Math.min(f + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((f) => Math.max(f - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[focused]) select(results[focused]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const select = (city) => {
    onAdd(city);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[focused];
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [focused, open]);

  return (
    <div className="city-search" onKeyDown={handleKey}>
      <div className="city-search__input-wrap">
        <span className="city-search__icon">🔍</span>
        <input
          ref={inputRef}
          className="city-search__input"
          type="text"
          placeholder={disabled ? "Max 5 cities" : "Search cities…"}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="city-search__dropdown" ref={listRef} role="listbox">
          {results.map((city, i) => (
            <li
              key={`${city.city}-${city.timezone}`}
              className={`city-search__option ${i === focused ? "city-search__option--focused" : ""}`}
              onMouseDown={() => select(city)}
              onMouseEnter={() => setFocused(i)}
              role="option"
              aria-selected={i === focused}
            >
              <span className="option-city">{city.city}</span>
              <span className="option-country">{city.country}</span>
              <span className="option-tz">{city.timezone}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
