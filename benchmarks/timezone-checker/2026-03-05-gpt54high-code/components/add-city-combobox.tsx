"use client";

import { useDeferredValue, useEffect, useId, useRef, useState } from "react";
import type { CatalogCity } from "@/lib/types";
import { formatUtcOffset } from "@/lib/timezone";

type AddCityComboboxProps = {
  cities: CatalogCity[];
  onAddCity: (cityId: string) => void;
  selectedCityIds: Set<string>;
};

export function AddCityCombobox({ cities, onAddCity, selectedCityIds }: AddCityComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const deferredQuery = useDeferredValue(query);

  const availableCities = cities.filter((city) => !selectedCityIds.has(city.id));
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const matches = availableCities.filter((city) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      city.name.toLowerCase().includes(normalizedQuery) ||
      city.country.toLowerCase().includes(normalizedQuery)
    );
  });

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <section className="panel-card add-city-panel">
      <div className="panel-header">
        <p className="panel-kicker">City Catalog</p>
        <h2>Add another timezone</h2>
      </div>
      <div className="combobox-shell" ref={rootRef}>
        <label className="field-label" htmlFor={listId}>
          Search city or country
        </label>
        <input
          id={listId}
          className="search-input"
          type="text"
          value={query}
          placeholder="Start typing..."
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
        />
        {isOpen ? (
          <div className="search-results" role="listbox">
            {matches.length ? (
              matches.slice(0, 8).map((city) => (
                <button
                  key={city.id}
                  type="button"
                  className="search-result"
                  onClick={() => {
                    onAddCity(city.id);
                    setQuery("");
                    setIsOpen(false);
                  }}
                >
                  <span>
                    <strong>{city.name}</strong>
                    <small>{city.country}</small>
                  </span>
                  <em>{formatUtcOffset(city.timeZone)}</em>
                </button>
              ))
            ) : (
              <div className="search-empty">No matching cities in the catalog.</div>
            )}
          </div>
        ) : null}
      </div>
      <p className="panel-note">Predefined cities only. Duplicate entries are blocked.</p>
    </section>
  );
}
