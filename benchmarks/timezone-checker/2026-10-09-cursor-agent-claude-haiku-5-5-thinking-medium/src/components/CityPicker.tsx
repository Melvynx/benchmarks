import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { City } from '../lib/cities';

interface CityPickerProps {
  available: City[];
  onAdd: (id: string) => void;
}

export function CityPicker({ available, onAdd }: CityPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
    );
  }, [available, query]);

  const choose = (city: City) => {
    onAdd(city.id);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="city-picker" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
    }}>
      <input
        ref={inputRef}
        className="input"
        type="text"
        placeholder="Add a city or country…"
        aria-label="Add a city"
        role="combobox"
        aria-expanded={open}
        aria-controls="city-picker-list"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id="city-picker-list" role="listbox" className="picker-list">
          {matches.length === 0 && <li className="picker-empty">No matching cities</li>}
          {matches.map((city, i) => (
            <li
              key={city.id}
              role="option"
              aria-selected={i === active}
              className={`picker-item${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(city);
              }}
            >
              <span>{city.name}</span>
              <span className="picker-country">{city.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
