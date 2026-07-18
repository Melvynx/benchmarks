import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { CITIES, type City } from '../lib/cities';
import { formatOffset, getOffsetMinutes } from '../lib/time';
import { PlusIcon, SearchIcon } from './Icons';

interface Props {
  addedIds: ReadonlySet<string>;
  onAdd: (id: string) => void;
}

/**
 * Searchable catalog picker. Already-added cities are hidden (no duplicates),
 * results are grouped by region, and the list is fully keyboard-navigable.
 */
export function CityCombobox({ addedIds, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CITIES.filter((c) => {
      if (addedIds.has(c.id)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        (c.aka?.some((a) => a.toLowerCase().includes(q)) ?? false)
      );
    });
  }, [query, addedIds]);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const select = (city: City) => {
    onAdd(city.id);
    setQuery('');
    inputRef.current?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      const next =
        e.key === 'ArrowDown'
          ? (active + 1) % results.length
          : (active - 1 + results.length) % results.length;
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const city = results[active];
      if (city) select(city);
    }
  };

  // CITIES is region-ordered, so filtering preserves contiguous region groups.
  const items: ReactNode[] = [];
  let lastRegion: string | null = null;
  results.forEach((city, i) => {
    if (city.region !== lastRegion) {
      lastRegion = city.region;
      items.push(
        <div key={`group-${city.region}`} className="combo-group">
          {city.region}
        </div>,
      );
    }
    items.push(
      <div
        key={city.id}
        role="option"
        aria-selected={i === active}
        data-index={i}
        className={`combo-item ${i === active ? 'active' : ''}`}
        onMouseEnter={() => setActive(i)}
        onClick={() => select(city)}
      >
        <span className="font-medium">
          {city.name}
          {city.aka && <span className="font-normal text-fog"> ({city.aka[0]})</span>}
        </span>
        <span className="country">
          {city.country} · {formatOffset(getOffsetMinutes(city.tz, Date.now()))}
        </span>
      </div>,
    );
  });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="btn-add"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <PlusIcon size={14} /> Add city
      </button>
      {open && (
        <div className="popover">
          <div className="combo-search">
            <SearchIcon size={14} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search city or country…"
              aria-label="Search cities by name or country"
              role="combobox"
              aria-expanded="true"
              aria-controls="city-listbox"
            />
          </div>
          <div className="combo-list" role="listbox" id="city-listbox" ref={listRef}>
            {results.length === 0 ? (
              <div className="combo-empty">
                {query ? 'No matches — try another search.' : 'All cities have been added.'}
              </div>
            ) : (
              items
            )}
          </div>
        </div>
      )}
    </div>
  );
}
