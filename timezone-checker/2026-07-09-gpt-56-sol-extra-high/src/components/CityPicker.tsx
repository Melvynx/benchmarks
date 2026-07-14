import { Check, ChevronDown, MapPin, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { CITY_CATALOG } from '../data/cities';

interface CityPickerProps {
  selectedCityIds: string[];
  onAddCity: (cityId: string) => void;
}

export function CityPicker({ selectedCityIds, onAddCity }: CityPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingCities = CITY_CATALOG.filter((city) => {
    if (selectedCityIds.includes(city.id)) return false;
    if (!normalizedQuery) return true;
    return `${city.name} ${city.country}`.toLocaleLowerCase().includes(normalizedQuery);
  });

  function addCity(cityId: string) {
    onAddCity(cityId);
    setQuery('');
    setIsOpen(false);
  }

  const hasEveryCity = selectedCityIds.length === CITY_CATALOG.length;

  return (
    <div className="city-picker" ref={containerRef}>
      <button
        className="add-city-button"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={hasEveryCity}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="add-city-icon"><Plus size={17} /></span>
        <span>
          <strong>{hasEveryCity ? 'All cities added' : 'Add a city'}</strong>
          <small>{CITY_CATALOG.length - selectedCityIds.length} available</small>
        </span>
        <ChevronDown className={isOpen ? 'chevron is-open' : 'chevron'} size={17} />
      </button>

      {isOpen && (
        <div className="city-popover">
          <label className="city-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search cities or countries</span>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search city or country…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setIsOpen(false);
                if (event.key === 'Enter' && matchingCities[0]) addCity(matchingCities[0].id);
              }}
            />
          </label>

          <div className="city-options" role="listbox" aria-label="Available cities">
            {matchingCities.length === 0 ? (
              <div className="city-picker-empty">
                <Check size={18} />
                <span>No matching cities available</span>
              </div>
            ) : (
              matchingCities.map((city) => (
                <button
                  className="city-option"
                  key={city.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => addCity(city.id)}
                >
                  <MapPin size={15} aria-hidden="true" />
                  <span><strong>{city.name}</strong><small>{city.country}</small></span>
                  <Plus size={15} aria-hidden="true" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
