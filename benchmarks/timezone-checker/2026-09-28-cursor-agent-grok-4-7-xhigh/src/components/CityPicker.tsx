import { Fragment, useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { filterCities } from '../lib/search';
import { formatOffset, offsetMinutes } from '../lib/time';
import { CITIES } from '../data/cities';

export function CityPicker({
  selectedIds,
  now,
  onAdd,
}: {
  selectedIds: readonly string[];
  now: Date;
  onAdd: (id: string) => void;
}) {
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => filterCities(selectedIds, query), [selectedIds, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open || results.length === 0) return;
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listId, results.length]);

  function select(id: string) {
    onAdd(id);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      setActive((index) => (results.length === 0 ? 0 : (index + 1) % results.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(Math.max(results.length - 1, 0));
        return;
      }
      setActive((index) => (results.length === 0 ? 0 : (index - 1 + results.length) % results.length));
      return;
    }
    if (event.key === 'Home' && open) {
      event.preventDefault();
      setActive(0);
      return;
    }
    if (event.key === 'End' && open) {
      event.preventDefault();
      setActive(Math.max(results.length - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const city = results[active];
      if (city) select(city.id);
      return;
    }
    if (event.key === 'Escape') {
      if (query) {
        setQuery('');
        return;
      }
      setOpen(false);
    }
  }

  let lastRegion = '';

  return (
    <div
      className="picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label className="field-label" htmlFor={inputId}>
        Add city
      </label>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-opt-${active}` : undefined}
        placeholder="Search cities or countries"
        value={query}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <ul className="menu" id={listId} role="listbox">
          {results.length === 0 ? (
            <li className="menu-empty">
              {selectedIds.length >= CITIES.length
                ? 'Every city is already on the board.'
                : `No matches for “${query.trim()}”.`}
            </li>
          ) : (
            results.map((city, index) => {
              const showRegion = query.trim() === '' && city.region !== lastRegion;
              if (query.trim() === '') lastRegion = city.region;
              return (
                <Fragment key={city.id}>
                  {showRegion ? (
                    <li className="group-label" role="presentation">
                      {city.region}
                    </li>
                  ) : null}
                  <li role="presentation">
                    <button
                      type="button"
                      role="option"
                      id={`${listId}-opt-${index}`}
                      aria-selected={index === active}
                      className="option"
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => select(city.id)}
                    >
                      <span>
                        <span className="option-city">{city.name}</span>
                        <span className="option-country">{city.country}</span>
                      </span>
                      <span className="option-off">{formatOffset(offsetMinutes(city.timeZone, now))}</span>
                    </button>
                  </li>
                </Fragment>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
