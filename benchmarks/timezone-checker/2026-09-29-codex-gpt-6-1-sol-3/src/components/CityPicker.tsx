import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, MapPin, Plus, Search, X } from 'lucide-react';
import { CITIES } from '../lib/cities';
import { formatOffset, utcOffset } from '../lib/time';

interface Props {
  selected: string[];
  onAdd: (id: string) => void;
  now: Date;
}
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export default function CityPicker({ selected, onAdd, now }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = CITIES.filter((city) =>
    normalize(`${city.name} ${city.country}`).includes(normalize(query)),
  );
  const available = matches.filter((city) => !selected.includes(city.id));

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  useEffect(() => {
    if (open && available[active]) {
      rootRef.current
        ?.querySelector(`#option-${available[active].id}`)
        ?.scrollIntoView({ block: 'nearest' });
    }
  }, [active, open, query]);

  const add = (id: string) => {
    onAdd(id);
    setOpen(false);
    setQuery('');
    setActive(0);
  };

  return (
    <div className="city-picker" ref={rootRef}>
      <button
        className="add-city-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Plus size={17} /> Add city
      </button>
      {open && (
        <div className="city-popover">
          <div className="picker-heading">
            <span>Bring another city in</span>
            <button
              className="icon-button"
              aria-label="Close city search"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="search-input">
            <Search size={17} />
            <input
              ref={inputRef}
              placeholder="Search city or country…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              role="combobox"
              aria-label="Search cities"
              aria-expanded={true}
              aria-controls="city-options"
              aria-autocomplete="list"
              aria-activedescendant={
                available[active] ? `option-${available[active].id}` : undefined
              }
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActive((index) => Math.min(index + 1, available.length - 1));
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActive((index) => Math.max(index - 1, 0));
                }
                if (event.key === 'Enter' && available[active]) {
                  event.preventDefault();
                  add(available[active].id);
                }
              }}
            />
          </div>
          <div
            className="city-results"
            id="city-options"
            role="listbox"
            aria-label="Available cities"
          >
            {available.map((city, index) => (
              <button
                id={`option-${city.id}`}
                key={city.id}
                role="option"
                aria-selected={index === active}
                className={`city-option ${index === active ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => add(city.id)}
              >
                <span className="city-flag">{city.flag}</span>
                <span className="option-text">
                  <strong>{city.name}</strong>
                  <small>{city.country}</small>
                </span>
                <span className="option-offset">{formatOffset(utcOffset(city.timezone, now))}</span>
                <Plus size={15} />
              </button>
            ))}
            {matches
              .filter((city) => selected.includes(city.id))
              .map((city) => (
                <div
                  key={city.id}
                  className="city-option already-added"
                  role="option"
                  aria-selected="false"
                  aria-disabled="true"
                >
                  <span className="city-flag">{city.flag}</span>
                  <span className="option-text">
                    <strong>{city.name}</strong>
                    <small>Already in your planner</small>
                  </span>
                  <Check size={16} />
                </div>
              ))}
            {!matches.length && (
              <div className="no-results">
                <MapPin size={24} />
                <strong>No cities found</strong>
                <span>Try another city or country.</span>
              </div>
            )}
          </div>
          <div className="picker-footer">
            <span>{CITIES.length} cities. One connected world.</span>
            <ArrowUpRight size={13} />
          </div>
        </div>
      )}
    </div>
  );
}
