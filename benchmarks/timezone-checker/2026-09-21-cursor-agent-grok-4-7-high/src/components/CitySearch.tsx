import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { City } from "../data/cities";
import { formatOffset } from "../lib/format";
import { filterCities, groupByRegion } from "../lib/search";
import { offsetMinutes } from "../lib/time";

type Props = {
  available: City[];
  now: Date;
  onAdd: (id: string) => void;
};

export function CitySearch({ available, now, onAdd }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => filterCities(query, available), [query, available]);
  const groups = useMemo(() => groupByRegion(results), [results]);
  const activeCity = results[active];

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open || !activeCity) return;
    document.getElementById(`${listId}-${activeCity.id}`)?.scrollIntoView({ block: "nearest" });
  }, [active, activeCity, listId, open]);

  function pick(city: City) {
    onAdd(city.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) return;
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      setActive((index) => Math.min(index + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      setOpen(true);
      setActive((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && activeCity) {
      event.preventDefault();
      pick(activeCity);
      return;
    }
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <div className="search" ref={rootRef}>
      <label className="field-label" htmlFor={`${listId}-input`}>
        Add city
      </label>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && activeCity ? `${listId}-${activeCity.id}` : undefined}
        placeholder={available.length === 0 ? "All cities are on the board" : "Search city or country"}
        disabled={available.length === 0}
        value={query}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
        onKeyDown={onKeyDown}
      />
      {open && available.length > 0 ? (
        <div className="search-list" id={listId} role="listbox" aria-label="Cities">
          {results.length === 0 ? (
            <p className="search-empty">No cities match that search.</p>
          ) : (
            groups.map((group) => (
              <div key={group.region} className="search-group">
                <p className="region">{group.region}</p>
                {group.cities.map((city) => {
                  const selected = city.id === activeCity?.id;
                  return (
                    <button
                      key={city.id}
                      id={`${listId}-${city.id}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={selected ? "option is-active" : "option"}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActive(results.findIndex((item) => item.id === city.id))}
                      onClick={() => pick(city)}
                    >
                      <span>
                        <span className="option-name">{city.name}</span>
                        <span className="option-country">{city.country}</span>
                      </span>
                      <span className="option-offset">{formatOffset(offsetMinutes(city.timeZone, now))}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
