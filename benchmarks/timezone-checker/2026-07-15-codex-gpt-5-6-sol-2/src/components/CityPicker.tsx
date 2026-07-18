import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CITIES } from "../data/cities";
import { formatUtcOffset, getOffsetMinutes } from "../lib/timezone";
import { CheckIcon, CloseIcon, PlusIcon, SearchIcon } from "./Icons";

type CityPickerProps = {
  selectedIds: string[];
  onAdd: (cityId: string) => void;
  now: Date;
  prominent?: boolean;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export function CityPicker({ selectedIds, onAdd, now, prominent = false }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    return CITIES.filter((city) => {
      if (!needle) return true;
      return normalize(`${city.name} ${city.country}`).includes(needle);
    });
  }, [query]);

  const selectableIndexes = useMemo(
    () => results.map((city, index) => (!selected.has(city.id) ? index : -1)).filter((index) => index >= 0),
    [results, selected],
  );

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closePicker();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker(true);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(selectableIndexes[0] ?? -1);
  }, [query, open]);

  function closePicker(restoreFocus = false) {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function addCity(cityId: string) {
    if (selected.has(cityId)) return;
    onAdd(cityId);
    closePicker(true);
  }

  function moveActive(direction: 1 | -1) {
    if (selectableIndexes.length === 0) return;
    const position = selectableIndexes.indexOf(activeIndex);
    const nextPosition = position < 0
      ? direction > 0 ? 0 : selectableIndexes.length - 1
      : (position + direction + selectableIndexes.length) % selectableIndexes.length;
    const next = selectableIndexes[nextPosition];
    setActiveIndex(next);
    document.getElementById(`${listId}-option-${next}`)?.scrollIntoView({ block: "nearest" });
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      addCity(results[activeIndex].id);
    }
  }

  const allAdded = selected.size === CITIES.length;

  return (
    <div className="popover-root city-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        className={prominent ? "control-button primary-control" : "control-button"}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={allAdded}
      >
        <PlusIcon />
        <span>{allAdded ? "All cities added" : "Add city"}</span>
      </button>

      {open && (
        <div className="popover city-popover" role="dialog" aria-label="Add a city">
          <div className="popover-heading">
            <div>
              <strong>Add a city</strong>
              <span>{CITIES.length} locations worldwide</span>
            </div>
            <button className="icon-button" type="button" onClick={() => closePicker(true)} aria-label="Close city picker">
              <CloseIcon />
            </button>
          </div>

          <div className="search-field">
            <SearchIcon />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search city or country"
              role="combobox"
              aria-label="Search city or country"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
            />
          </div>

          <div className="city-results" id={listId} role="listbox" aria-label="Supported cities">
            {results.length === 0 ? (
              <div className="picker-empty">
                <strong>No matching city</strong>
                <span>Try a city or country from the supported catalog.</span>
              </div>
            ) : (
              results.map((city, index) => {
                const isAdded = selected.has(city.id);
                const offset = formatUtcOffset(getOffsetMinutes(city.timeZone, now));
                return (
                  <button
                    id={`${listId}-option-${index}`}
                    key={city.id}
                    className="city-result"
                    data-active={activeIndex === index || undefined}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={isAdded}
                    disabled={isAdded}
                    onMouseMove={() => !isAdded && setActiveIndex(index)}
                    onClick={() => addCity(city.id)}
                  >
                    <span className="city-result-main">
                      <strong>{city.name}</strong>
                      <span>{city.country}</span>
                    </span>
                    <span className="city-result-meta">
                      <span>{offset}</span>
                      {isAdded ? <span className="added-label"><CheckIcon /> Added</span> : <span>{city.region}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
