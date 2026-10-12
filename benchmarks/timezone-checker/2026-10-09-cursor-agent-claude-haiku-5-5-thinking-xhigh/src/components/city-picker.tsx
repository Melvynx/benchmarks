"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { searchCities, type City } from "@/lib/cities";
import { cx } from "@/lib/cx";
import { formatUtcOffset, getUtcOffsetMinutes } from "@/lib/time";
import { INPUT } from "./styles";

interface CityPickerProps {
  /** Cities that are not yet in the list. */
  readonly available: readonly City[];
  readonly now: Date;
  readonly onSelect: (cityId: string) => void;
}

/** Accessible combobox: arrow keys, Enter to add, Escape to close. */
export function CityPicker({ available, now, onSelect }: CityPickerProps) {
  const instanceId = useId();
  const inputId = `${instanceId}-input`;
  const listboxId = `${instanceId}-listbox`;
  const optionId = (cityId: string) => `${instanceId}-option-${cityId}`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => searchCities(available, query), [available, query]);
  const safeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));
  const activeCity = results[safeIndex];
  const isExhausted = available.length === 0;
  const showList = open && !isExhausted;

  function choose(city: City) {
    onSelect(city.id);
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        setActiveIndex(Math.min(safeIndex + 1, results.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex(Math.max(safeIndex - 1, 0));
        break;
      case "Enter":
        if (showList && activeCity) {
          event.preventDefault();
          choose(activeCity);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={inputId} className="sr-only">
        Add a city
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
      />
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        value={query}
        disabled={isExhausted}
        placeholder={isExhausted ? "Every city is already added" : "Add a city or country"}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeCity ? optionId(activeCity.id) : undefined}
        className={cx(INPUT, "pl-9 disabled:cursor-not-allowed disabled:opacity-60")}
      />

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Cities"
          className="absolute top-full z-30 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl shadow-stone-900/10 dark:border-stone-700 dark:bg-stone-900 dark:shadow-black/40"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-stone-500 dark:text-stone-400">
              No city matches “{query}”.
            </li>
          ) : (
            results.map((city, index) => {
              const isActive = index === safeIndex;
              const offset = formatUtcOffset(getUtcOffsetMinutes(city.timeZone, now));
              return (
                <li
                  key={city.id}
                  id={optionId(city.id)}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(city)}
                  className={cx(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
                    isActive
                      ? "bg-emerald-50 text-stone-900 dark:bg-emerald-500/15 dark:text-stone-50"
                      : "text-stone-700 dark:text-stone-300",
                  )}
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{city.name}</span>
                    <span className="text-stone-500 dark:text-stone-400"> · {city.country}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-stone-500 dark:text-stone-400">
                    {offset}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
