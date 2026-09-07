import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTimezone } from '../context/TimezoneContext';
import { Search, Plus, X } from 'lucide-react';
import { City } from '../types';
import { getCityCurrentUtcOffset } from '../lib/timezone';

export const CitySearchDropdown: React.FC = () => {
  const { cities, addCity, availableCities } = useTimezone();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredCities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return availableCities;
    return availableCities.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.country.toLowerCase().includes(term) ||
        c.region.toLowerCase().includes(term)
    );
  }, [availableCities, searchTerm]);

  // Group by region
  const groupedCities = useMemo(() => {
    const groups: Record<string, City[]> = {};
    for (const city of filteredCities) {
      if (!groups[city.region]) {
        groups[city.region] = [];
      }
      groups[city.region].push(city);
    }
    return groups;
  }, [filteredCities]);

  const handleSelectCity = (cityId: string) => {
    addCity(cityId);
    setSearchTerm('');
    // Keep open or close? Closing on add is clean and standard
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        <span>Add City</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-84 max-w-[90vw] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search city, country, or region..."
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* City Catalog List */}
          <div className="max-h-72 overflow-y-auto p-1.5 divide-y divide-slate-800/40">
            {Object.keys(groupedCities).length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-slate-400">
                {availableCities.length === 0
                  ? 'All available catalog cities are already added!'
                  : 'No cities found matching your search.'}
              </div>
            ) : (
              Object.entries(groupedCities).map(([region, regionCities]) => (
                <div key={region} className="py-1">
                  <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {region}
                  </div>
                  <div className="space-y-0.5">
                    {regionCities.map((city) => {
                      const offset = getCityCurrentUtcOffset(city.timezone);
                      return (
                        <button
                          key={city.id}
                          onClick={() => handleSelectCity(city.id)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{city.flag}</span>
                            <div className="truncate">
                              <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-emerald-300">
                                {city.name}
                              </span>
                              <span className="text-[11px] text-slate-400 ml-1.5 truncate">
                                {city.country}
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                            {offset.formatted}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 text-center flex items-center justify-between px-3">
            <span>{availableCities.length} available to add</span>
            <span className="text-slate-500">{cities.length} added</span>
          </div>
        </div>
      )}
    </div>
  );
};
