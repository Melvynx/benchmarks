import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CITIES, type City } from '../data/cities';
import { cx } from '../lib/cx';
import { formatUtcOffset, getOffsetMinutes } from '../lib/time';
import { CheckIcon, SearchIcon } from './icons';

interface CitySearchProps {
  addedIds: string[];
  onAdd: (cityId: string) => void;
  now: Date;
}

/** Lowercase and strip diacritics so "bogota" matches "Bogotá". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function CitySearch({ addedIds, onAdd, now }: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const added = useMemo(() => new Set(addedIds), [addedIds]);

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return CITIES;
    return CITIES.filter(
      (city) => normalize(city.name).includes(q) || normalize(city.country).includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, City[]>();
    for (const city of matches) {
      const list = map.get(city.region) ?? [];
      list.push(city);
      map.set(city.region, list);
    }
    return map;
  }, [matches]);

  useEffect(() => setActiveIndex(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const select = (city: City) => {
    if (added.has(city.id)) return;
    onAdd(city.id);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const city = matches[activeIndex];
      if (city) select(city);
    } else if (event.key === 'Escape') {
      setOpen(false);
      event.currentTarget.blur();
    }
  };

  return (
    <div className="city-search" ref={rootRef}>
      <div className="search-field">
        <SearchIcon />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label="Add a city"
          placeholder="Add a city…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && (
        <div className="search-dropdown" ref={listRef} role="listbox" aria-label="City catalog">
          {matches.length === 0 && (
            <p className="search-empty">No city or country matches “{query.trim()}”.</p>
          )}
          {[...grouped.entries()].map(([region, cities]) => (
            <div key={region} className="search-group">
              <p className="search-group-label">{region}</p>
              {cities.map((city) => {
                const index = matches.indexOf(city);
                const isAdded = added.has(city.id);
                const isActive = index === activeIndex;
                return (
                  <button
                    key={city.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    className={cx('search-option', isActive && 'is-active', isAdded && 'is-added')}
                    disabled={isAdded}
                    onClick={() => select(city)}
                    onMouseMove={() => setActiveIndex(index)}
                  >
                    <span className="search-option-name">
                      {city.name} <em>{city.country}</em>
                    </span>
                    {isAdded ? (
                      <span className="added-tag">
                        <CheckIcon /> added
                      </span>
                    ) : (
                      <span className="offset-chip">
                        {formatUtcOffset(getOffsetMinutes(city.timeZone, now))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
