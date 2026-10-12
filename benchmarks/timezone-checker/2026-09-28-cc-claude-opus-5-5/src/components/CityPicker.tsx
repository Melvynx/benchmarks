import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CITIES, REGIONS, flagEmoji, matchesCityQuery, type City } from "../lib/cities";
import { cx } from "../lib/cx";
import { formatOffset, getOffsetMinutes } from "../lib/time";
import styles from "./CityPicker.module.css";

interface CityPickerProps {
  selectedIds: readonly string[];
  now: Date;
  onAdd: (id: string) => void;
}

/** Searchable combobox over the city catalog, grouped by region. */
export function CityPicker({ selectedIds, now, onAdd }: CityPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const groups = useMemo(() => {
    const available = CITIES.filter((city) => !selectedIds.includes(city.id) && matchesCityQuery(city, query));
    return REGIONS.map((region) => ({ region, cities: available.filter((city) => city.region === region) })).filter(
      (group) => group.cities.length > 0,
    );
  }, [selectedIds, query]);
  const options = useMemo(() => groups.flatMap((group) => group.cities), [groups]);
  const activeCity = options[Math.min(activeIndex, options.length - 1)];
  const optionId = (city: City) => `${listId}-${city.id}`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open && activeCity) document.getElementById(optionId(activeCity))?.scrollIntoView({ block: "nearest" });
  }, [open, activeCity]);

  const choose = (city: City) => {
    onAdd(city.id);
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
    inputRef.current?.focus();
  };

  const move = (delta: number) => {
    setOpen(true);
    if (options.length) setActiveIndex((index) => (Math.min(index, options.length - 1) + delta + options.length) % options.length);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Enter":
        if (open && activeCity) {
          event.preventDefault();
          choose(activeCity);
        }
        break;
      case "Escape":
        if (open) setOpen(false);
        else setQuery("");
        break;
    }
  };

  const allAdded = selectedIds.length >= CITIES.length;

  return (
    <div className={styles.picker} ref={rootRef}>
      <div className={styles.inputWrap}>
        <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9 3.5a5.5 5.5 0 1 0 3.4 9.83l3.64 3.63 1.06-1.06-3.63-3.64A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Add a city"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeCity ? optionId(activeCity) : undefined}
          className={styles.input}
          placeholder={allAdded ? "All cities added" : "Add a city or country…"}
          disabled={allAdded}
          value={query}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <kbd className={styles.kbd} aria-hidden="true">
          ↵
        </kbd>
      </div>

      {open && (
        <div className={styles.popover}>
          <ul id={listId} role="listbox" aria-label="Cities" className={styles.list}>
            {groups.map((group) => (
              <li key={group.region} role="presentation">
                <div className={styles.region} role="presentation">
                  {group.region}
                </div>
                <ul role="group" aria-label={group.region} className={styles.groupList}>
                  {group.cities.map((city) => (
                    <li
                      key={city.id}
                      id={optionId(city)}
                      role="option"
                      aria-selected={city === activeCity}
                      className={cx(styles.option, city === activeCity && styles.active)}
                      onPointerDown={(event) => event.preventDefault()}
                      onPointerMove={() => setActiveIndex(options.indexOf(city))}
                      onClick={() => choose(city)}
                    >
                      <span className={styles.flag} aria-hidden="true">
                        {flagEmoji(city.countryCode)}
                      </span>
                      <span className={styles.optionText}>
                        <span className={styles.optionName}>{city.name}</span>
                        <span className={styles.optionCountry}>{city.country}</span>
                      </span>
                      <span className={styles.optionOffset}>{formatOffset(getOffsetMinutes(city.timeZone, now))}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {options.length === 0 && (
            <p className={styles.noResults}>{query ? `No cities match “${query}”` : "Every city is already on your list"}</p>
          )}
        </div>
      )}
    </div>
  );
}
