import { useEffect, useMemo, useRef, useState } from 'react';
import { CITY_CATALOG, type City } from '../data/cities';

interface Props {
  selectedIds: string[];
  onAdd: (id: string) => void;
}

export function CitySearch({ selectedIds, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = CITY_CATALOG.filter((c) => !selected.has(c.id));
    if (!q) return pool;
    return pool.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
    );
  }, [query, selected]);

  useEffect(() => setActiveIndex(0), [query, open]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const pick = (city: City) => {
    onAdd(city.id);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[activeIndex]) pick(matches[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="city-search" ref={rootRef}>
      <span className="city-search__icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <input
        type="text"
        className="city-search__input"
        placeholder="Add a city…"
        value={query}
        role="combobox"
        aria-expanded={open}
        aria-label="Search cities by name or country"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="city-search__list" role="listbox" ref={listRef}>
          {matches.length === 0 && <li className="city-search__empty">No matching city</li>}
          {matches.map((city, i) => (
            <li key={city.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                data-active={i === activeIndex}
                className="city-search__option"
                onPointerEnter={() => setActiveIndex(i)}
                onClick={() => pick(city)}
              >
                <span className="city-search__name">{city.name}</span>
                <span className="city-search__meta">
                  {city.country} · {city.region}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
