import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { REGIONS, searchCities, type City } from "../lib/cities";
import { formatUtcOffset, getUtcOffsetMinutes } from "../lib/time";
import styles from "./CityPicker.module.css";
import { PlusIcon, SearchIcon } from "./icons";

interface CityPickerProps {
  selectedIds: readonly string[];
  onSelect: (id: string) => void;
}

export function CityPicker({ selectedIds, onSelect }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const excluded = useMemo(() => new Set(selectedIds), [selectedIds]);
  const results = useMemo(() => searchCities(query, excluded), [query, excluded]);
  const groups = useMemo(
    () =>
      REGIONS.map((region) => ({ region, cities: results.filter((c) => c.region === region) })).filter(
        (g) => g.cities.length > 0,
      ),
    [results],
  );
  const flat = useMemo(() => groups.flatMap((g) => g.cities), [groups]);
  const offsets = useMemo(() => {
    if (!open) return new Map<string, string>();
    const now = new Date();
    return new Map(flat.map((c) => [c.id, formatUtcOffset(getUtcOffsetMinutes(c.timeZone, now))]));
  }, [flat, open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const choose = (city: City) => {
    onSelect(city.id);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter": {
        event.preventDefault();
        const city = flat[activeIndex];
        if (city) choose(city);
        break;
      }
      case "Escape":
        event.preventDefault();
        close();
        break;
    }
  };

  const activeCity = flat[activeIndex];
  const optionId = (city: City) => `${listId}-${city.id}`;

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <PlusIcon size={15} />
        Add city
      </button>

      {open && (
        <div className={styles.popover}>
          <div className={styles.search}>
            <SearchIcon size={15} />
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeCity ? optionId(activeCity) : undefined}
              aria-label="Search cities by name or country"
              placeholder="Search city or country…"
              value={query}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
            />
          </div>

          <div ref={listRef} id={listId} role="listbox" aria-label="Cities" className={styles.list}>
            {groups.map(({ region, cities }) => (
              <div key={region} role="group" aria-label={region}>
                <div className={styles.groupLabel} aria-hidden="true">
                  {region}
                </div>
                {cities.map((city) => {
                  const active = city === activeCity;
                  return (
                    <div
                      key={city.id}
                      id={optionId(city)}
                      role="option"
                      aria-selected={active}
                      data-active={active}
                      className={styles.option}
                      onPointerMove={() => setActiveIndex(flat.indexOf(city))}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => choose(city)}
                    >
                      <span className={styles.optionName}>{city.name}</span>
                      <span className={styles.optionCountry}>{city.country}</span>
                      <span className={styles.optionOffset}>{offsets.get(city.id)}</span>
                    </div>
                  );
                })}
              </div>
            ))}

            {flat.length === 0 && (
              <p className={styles.empty}>
                {query ? `No cities match “${query}”.` : "Every city in the catalog is already on your list."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
