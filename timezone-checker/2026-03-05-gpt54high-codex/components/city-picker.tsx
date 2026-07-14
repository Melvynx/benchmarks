"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { CityOption } from "@/lib/city-catalog";

type CityPickerProps = {
  availableCities: CityOption[];
  onAddCity: (cityId: string) => void;
};

export default function CityPicker({
  availableCities,
  onAddCity,
}: CityPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return availableCities.slice(0, 12);
    }

    return availableCities
      .filter((city) =>
        `${city.city} ${city.country} ${city.region}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 12);
  }, [availableCities, query]);

  const hasMatches = results.length > 0;

  function handleAdd(cityId: string) {
    onAddCity(cityId);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="city-picker" ref={wrapperRef}>
      <label className="field-label" htmlFor="city-search">
        Add city
      </label>
      <div className="city-picker__input-shell">
        <input
          id="city-search"
          className="city-picker__input"
          placeholder="Search city or country"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              handleAdd(results[0].id);
            }
          }}
        />
        <button
          className="ghost-button"
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle city list"
        >
          Browse
        </button>
      </div>
      {open ? (
        <div className="city-picker__dropdown" role="listbox">
          {hasMatches ? (
            results.map((city) => (
              <button
                key={city.id}
                className="city-picker__option"
                type="button"
                onClick={() => handleAdd(city.id)}
              >
                <span className="city-picker__city">{city.city}</span>
                <span className="city-picker__meta">
                  {city.country} · {city.region}
                </span>
              </button>
            ))
          ) : (
            <div className="city-picker__empty">
              No matches in the curated city list.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
