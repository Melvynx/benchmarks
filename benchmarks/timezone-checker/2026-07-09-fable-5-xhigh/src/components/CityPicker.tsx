import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { City, TimeFormat } from '../types';
import { CITIES } from '../data/cities';
import { formatLocalClock, formatOffset, utcOffsetMinutes } from '../lib/time';
import { cx } from '../lib/cx';
import { SearchIcon } from './icons';

/** Fold case and accents so "sao" matches "São Paulo". */
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

interface CityPickerProps {
  selectedIds: string[];
  timeFormat: TimeFormat;
  now: Date;
  onAdd: (cityId: string) => void;
}

export function CityPicker({ selectedIds, timeFormat, now, onAdd }: CityPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = normalize(query.trim());

  const options = useMemo(() => {
    const selected = new Set(selectedIds);
    const available = CITIES.filter((city) => !selected.has(city.id));
    if (trimmed === '') return available;
    const score = (city: City) => {
      if (normalize(city.name).startsWith(trimmed)) return 0;
      if (normalize(city.country).startsWith(trimmed)) return 1;
      return 2;
    };
    return available
      .filter((city) => normalize(city.name).includes(trimmed) || normalize(city.country).includes(trimmed))
      .sort((a, b) => score(a) - score(b));
  }, [selectedIds, trimmed]);

  const active = options.length === 0 ? -1 : Math.min(activeIndex, options.length - 1);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    popRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const addCity = (city: City) => {
    onAdd(city.id);
    setQuery('');
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (options.length === 0) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((((active + delta) % options.length) + options.length) % options.length);
    } else if (event.key === 'Enter') {
      if (open && active >= 0) {
        event.preventDefault();
        addCity(options[active]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const listItems: ReactNode[] = [];
  let lastRegion: string | null = null;
  options.forEach((city, index) => {
    if (trimmed === '' && city.region !== lastRegion) {
      lastRegion = city.region;
      listItems.push(
        <div key={`region-${city.region}`} className="opt-region">
          {city.region}
        </div>,
      );
    }
    listItems.push(
      <button
        key={city.id}
        id={`city-option-${city.id}`}
        type="button"
        role="option"
        aria-selected={index === active}
        data-active={index === active ? 'true' : undefined}
        className={cx('opt', index === active && 'active')}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => addCity(city)}
      >
        <span className="opt-name">{city.name}</span>
        <span className="opt-country">{city.country}</span>
        <span className="opt-meta">
          <span>{formatLocalClock(city.timeZone, now, timeFormat)}</span>
          <span className="o-off">{formatOffset(utcOffsetMinutes(city.timeZone, now))}</span>
        </span>
      </button>,
    );
  });

  return (
    <div className="toolbar">
      <div className="picker" ref={rootRef}>
        <span className="picker-icon">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          className="picker-input"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="city-listbox"
          aria-activedescendant={open && active >= 0 ? `city-option-${options[active].id}` : undefined}
          aria-label="Add a city"
          placeholder="Add a city — search by name or country"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <div className="picker-pop" id="city-listbox" role="listbox" ref={popRef}>
            {options.length === 0 ? (
              <div className="picker-empty">
                {selectedIds.length === CITIES.length
                  ? 'Every city in the catalog is already on the board.'
                  : 'No matching city in the catalog.'}
              </div>
            ) : (
              listItems
            )}
          </div>
        )}
      </div>
    </div>
  );
}
