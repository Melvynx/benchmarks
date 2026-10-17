import { useMemo, useRef, useState } from 'react';
import { CITIES } from '../data/cities';

interface Props {
  selectedIds: string[];
  onAdd: (id: string) => void;
}

export default function CityPicker({ selectedIds, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = CITIES.filter((c) => !selectedIds.includes(c.id));
    if (!q) return available;
    return available.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) || c.region.toLowerCase().includes(q),
    );
  }, [query, selectedIds]);

  const pick = (id: string) => {
    onAdd(id);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="picker">
      <label className="picker-label" htmlFor="city-search">Add a city</label>
      <div className="picker-box">
        <input
          id="city-search"
          ref={inputRef}
          value={query}
          placeholder="Search by city or country…"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          autoComplete="off"
        />
        {query && (
          <button type="button" className="picker-clear" aria-label="Clear search" onClick={() => setQuery('')}>×</button>
        )}
      </div>
      {open && (
        <ul className="picker-list" role="listbox" aria-label="Available cities">
          {results.length === 0 && <li className="picker-empty">No matching cities left to add.</li>}
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" className="picker-item" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c.id)}>
                <span className="picker-city">{c.name}</span>
                <span className="picker-meta">{c.country} · {c.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
