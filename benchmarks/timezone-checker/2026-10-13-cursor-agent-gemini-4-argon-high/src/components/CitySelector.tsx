import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Plus, Check, Globe } from 'lucide-react';
import { CITY_CATALOG, City } from '../data/cities';
import { formatUtcOffset, getUtcOffsetMinutes } from '../utils/timezone';

interface CitySelectorProps {
  selectedCityIds: string[];
  onAddCity: (cityId: string) => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({
  selectedCityIds,
  onAddCity,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cityOffsets = useMemo(() => {
    const now = new Date();
    const map: Record<string, string> = {};
    for (const city of CITY_CATALOG) {
      map[city.id] = formatUtcOffset(getUtcOffsetMinutes(city.timeZone, now));
    }
    return map;
  }, []);

  const filteredCities = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return CITY_CATALOG;
    return CITY_CATALOG.filter((city) => {
      const matchName = city.name.toLowerCase().includes(trimmed);
      const matchCountry = city.country.toLowerCase().includes(trimmed);
      const matchRegion = city.region.toLowerCase().includes(trimmed);
      const matchOffset = cityOffsets[city.id].toLowerCase().includes(trimmed);
      const matchAlias = city.aliases?.some((a) => a.toLowerCase().includes(trimmed));
      return matchName || matchCountry || matchRegion || matchOffset || matchAlias;
    });
  }, [query, cityOffsets]);

  const selectableCities = useMemo(
    () => filteredCities.filter((c) => !selectedCityIds.includes(c.id)),
    [filteredCities, selectedCityIds]
  );

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: City) => {
    if (selectedCityIds.includes(city.id)) return;
    onAddCity(city.id);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectableCities.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % selectableCities.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectableCities.length > 0) {
        setHighlightedIndex(
          (prev) => (prev - 1 + selectableCities.length) % selectableCities.length
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = selectableCities[highlightedIndex];
      if (target) {
        handleSelect(target);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-72">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add city or country..."
          aria-label="Add city or country"
          aria-expanded={isOpen}
          className="w-full rounded-lg border border-slate-700/80 bg-slate-900/90 py-2 pl-9 pr-8 text-sm text-slate-100 placeholder-slate-400 shadow-sm transition focus:border-emerald-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-200"
            aria-label="Clear search"
          >
            ✕
          </button>
        ) : (
          <Plus className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
        )}
      </div>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Available cities"
          className="absolute left-0 right-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-700/90 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md"
        >
          {filteredCities.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">
              No matching cities in catalog
            </div>
          ) : (
            filteredCities.map((city) => {
              const isAdded = selectedCityIds.includes(city.id);
              const selectableIdx = selectableCities.findIndex((c) => c.id === city.id);
              const isHighlighted = !isAdded && selectableIdx === highlightedIndex;

              return (
                <button
                  key={city.id}
                  type="button"
                  role="option"
                  aria-selected={isAdded}
                  disabled={isAdded}
                  onClick={() => handleSelect(city)}
                  onMouseEnter={() => {
                    if (!isAdded && selectableIdx !== -1) {
                      setHighlightedIndex(selectableIdx);
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    isAdded
                      ? 'cursor-not-allowed opacity-45'
                      : isHighlighted
                        ? 'bg-emerald-500/20 text-emerald-100'
                        : 'text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{city.name}</span>
                      <span className="truncate text-xs text-slate-400">
                        {city.country}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Globe className="h-3 w-3 shrink-0" />
                      <span>{city.region}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-300 border border-slate-700/70">
                      {cityOffsets[city.id]}
                    </span>
                    {isAdded && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
