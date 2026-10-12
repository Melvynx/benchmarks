import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { REGIONS, searchCities } from "../lib/cities";
import { formatOffset, getOffsetMinutes } from "../lib/time";
import type { City } from "../types";
import { PlusIcon, SearchIcon } from "./Icons";

interface CityPickerProps {
  selectedIds: readonly string[];
  now: Date;
  onAdd: (id: string) => void;
}

export function CityPicker({ selectedIds, now, onAdd }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const results = useMemo(() => searchCities(query, selectedIds), [query, selectedIds]);

  // Grouped by region when browsing, flat relevance order when searching.
  const groups = useMemo(() => {
    if (query.trim()) return [{ region: null, cities: results }];
    return REGIONS.map((region) => ({ region, cities: results.filter((c) => c.region === region) })).filter(
      (group) => group.cities.length > 0,
    );
  }, [query, results]);
  const flat = useMemo(() => groups.flatMap((group) => group.cities), [groups]);

  useEffect(() => setActiveIndex(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const select = (city: City) => {
    onAdd(city.id);
    setQuery("");
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) setOpen(true);
        else setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter": {
        const city = flat[activeIndex];
        if (open && city) {
          event.preventDefault();
          select(city);
        }
        break;
      }
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else setQuery("");
        break;
    }
  };

  const activeCity = flat[activeIndex];
  const allAdded = selectedIds.length > 0 && searchCities("", selectedIds).length === 0;
  let index = -1;

  return (
    <div className="picker" ref={rootRef}>
      <div className="picker__field">
        <SearchIcon className="picker__icon" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeCity ? `${listId}-${activeCity.id}` : undefined}
          placeholder={allAdded ? "All cities added" : "Add a city or country…"}
          disabled={allAdded}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <kbd className="picker__kbd" aria-hidden>
          ↵
        </kbd>
      </div>

      {open && !allAdded && (
        <ul className="picker__list" id={listId} role="listbox" ref={listRef} aria-label="Cities">
          {flat.length === 0 && <li className="picker__empty">No city matches “{query}”</li>}
          {groups.map((group) => (
            <li key={group.region ?? "results"} role="presentation">
              {group.region && <div className="picker__group">{group.region}</div>}
              <ul role="presentation">
                {group.cities.map((city) => {
                  index += 1;
                  const i = index;
                  return (
                    <li
                      key={city.id}
                      id={`${listId}-${city.id}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      data-index={i}
                      className="picker__option"
                      onPointerMove={() => setActiveIndex(i)}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => select(city)}
                    >
                      <span className="picker__code">{city.countryCode}</span>
                      <span className="picker__name">
                        {city.name}
                        <span className="picker__country">{city.country}</span>
                      </span>
                      <span className="picker__offset">{formatOffset(getOffsetMinutes(city.timeZone, now))}</span>
                      <PlusIcon className="picker__plus" />
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
