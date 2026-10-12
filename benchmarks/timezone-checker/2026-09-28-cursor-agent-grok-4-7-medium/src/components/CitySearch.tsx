import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CITIES, REGIONS } from '../data/cities';
import { cx } from '../lib/cx';
import { IconClose, IconSearch } from './icons';

type Props = {
  cityIds: readonly string[];
  onAdd: (id: string) => void;
};

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function CitySearch({ cityIds, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = useMemo(() => new Set(cityIds), [cityIds]);
  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    return CITIES.filter((city) => {
      if (!needle) return true;
      return normalize(`${city.city} ${city.country} ${city.region}`).includes(needle);
    });
  }, [query]);

  useEffect(() => {
    const first = matches.findIndex((city) => !selected.has(city.id));
    setActive(first === -1 ? 0 : first);
  }, [matches, selected]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const city = matches[active];
    if (!city) return;
    document.getElementById(`city-option-${city.id}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open, matches]);

  function step(from: number, direction: 1 | -1): number {
    if (matches.length === 0) return 0;
    let index = from;
    for (let count = 0; count < matches.length; count += 1) {
      index = (index + direction + matches.length) % matches.length;
      if (!selected.has(matches[index].id)) return index;
    }
    return from;
  }

  function addAt(index: number) {
    const city = matches[index];
    if (!city || selected.has(city.id)) return;
    onAdd(city.id);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="search" ref={rootRef}>
      <div className="search-field">
        <span className="search-icon">
          <IconSearch />
        </span>
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Add a city"
          aria-activedescendant={open && matches[active] ? `city-option-${matches[active].id}` : undefined}
          placeholder="Search cities or countries"
          value={query}
          autoComplete="off"
          spellCheck={false}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setActive((current) => step(open ? current : -1, 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              setActive((current) => step(open ? current : matches.length, -1));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              if (open) addAt(active);
            } else if (event.key === 'Escape') {
              setOpen(false);
            } else if (event.key === 'Home') {
              event.preventDefault();
              const first = matches.findIndex((city) => !selected.has(city.id));
              if (first >= 0) setActive(first);
            } else if (event.key === 'End') {
              event.preventDefault();
              for (let index = matches.length - 1; index >= 0; index -= 1) {
                if (!selected.has(matches[index].id)) {
                  setActive(index);
                  break;
                }
              }
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className="clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <IconClose />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="results" role="listbox" id={listId} aria-label="Cities">
          {matches.length === 0 ? (
            <p className="results-empty">No cities match “{query.trim()}”.</p>
          ) : (
            REGIONS.map((region) => {
              const cities = matches.filter((city) => city.region === region);
              if (cities.length === 0) return null;
              return (
                <div key={region}>
                  <div className="region-label">{region}</div>
                  {cities.map((city) => {
                    const index = matches.indexOf(city);
                    const added = selected.has(city.id);
                    return (
                      <button
                        key={city.id}
                        type="button"
                        role="option"
                        id={`city-option-${city.id}`}
                        className={cx('option', index === active && !added && 'is-active')}
                        aria-selected={index === active}
                        aria-disabled={added}
                        disabled={added}
                        onMouseEnter={() => {
                          if (!added) setActive(index);
                        }}
                        onClick={() => addAt(index)}
                      >
                        <span>
                          <strong>{city.city}</strong>
                          <span className="option-country">{city.country}</span>
                        </span>
                        {added ? <span className="added">Added</span> : null}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
