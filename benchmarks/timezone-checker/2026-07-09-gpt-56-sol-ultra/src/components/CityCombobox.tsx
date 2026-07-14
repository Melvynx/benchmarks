import { useEffect, useId, useRef, useState } from 'react';
import { Check, MapPin, Plus, Search } from 'lucide-react';

import { CITIES, getFlagEmoji } from '../data/cities';
import type { City } from '../types';

interface CityComboboxProps {
  selectedCityIds: string[];
  onSelect: (city: City) => void;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
}

export function CityCombobox({ selectedCityIds, onSelect }: CityComboboxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeOptionRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = normalizeSearchText(query.trim());
  const selectedIds = new Set(selectedCityIds);
  const availableCities = CITIES.filter((city) => !selectedIds.has(city.id)).filter((city) => {
    if (!normalizedQuery) return true;
    return normalizeSearchText(`${city.name} ${city.country}`).includes(normalizedQuery);
  });

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    activeOptionRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, query]);

  const chooseCity = (city: City) => {
    onSelect(city);
    setQuery('');
    setActiveIndex(0);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) =>
        (index + direction + availableCities.length) % Math.max(availableCities.length, 1),
      );
      return;
    }
    if (event.key === 'Enter' && isOpen && availableCities[activeIndex]) {
      event.preventDefault();
      chooseCity(availableCities[activeIndex]);
    }
  };

  return (
    <div className="city-picker" ref={wrapperRef}>
      <label className="control-label" htmlFor="city-search">Add a city</label>
      <div className="city-picker__field">
        <Search size={17} aria-hidden="true" />
        <input
          id="city-search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && availableCities[activeIndex]
              ? `${listboxId}-${availableCities[activeIndex].id}`
              : undefined
          }
          value={query}
          placeholder="Search city or country"
          autoComplete="off"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <Plus size={17} aria-hidden="true" />
      </div>

      {isOpen && (
        <div className="city-picker__menu" id={listboxId} role="listbox">
          <div className="city-picker__menu-label">
            <MapPin size={14} aria-hidden="true" />
            {availableCities.length} {availableCities.length === 1 ? 'city' : 'cities'} available
          </div>
          <div className="city-picker__options">
            {availableCities.map((city, index) => (
              <div
                id={`${listboxId}-${city.id}`}
                className="city-option"
                data-active={activeIndex === index}
                key={city.id}
                ref={activeIndex === index ? activeOptionRef : undefined}
                role="option"
                aria-selected={activeIndex === index}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseCity(city)}
              >
                <span className="city-option__flag" aria-hidden="true">
                  {getFlagEmoji(city.countryCode)}
                </span>
                <span className="city-option__copy">
                  <strong>{city.name}</strong>
                  <span>{city.country}</span>
                </span>
                {activeIndex === index && <Check size={16} aria-hidden="true" />}
              </div>
            ))}
            {availableCities.length === 0 && (
              <div className="city-picker__empty">
                {selectedCityIds.length === CITIES.length
                  ? 'Every city is already on the board.'
                  : 'No cities match that search.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
