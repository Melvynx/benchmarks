import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { useStore } from '../store';
import { CITIES } from '../data/cities';
import { getCityOffsetString } from '../utils/time';

export function CitySearch() {
  const { cities, addCity } = useStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const availableCities = useMemo(() => {
    return CITIES.filter((c) => !cities.includes(c.id)).filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.country.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  }, [cities, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-sm" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-zinc-500"
          placeholder="Add a city..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && availableCities.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-900 shadow-lg max-h-60 rounded-lg py-1 text-sm overflow-auto border border-zinc-200 dark:border-zinc-800 focus:outline-none">
          {availableCities.map((city) => (
            <button
              key={city.id}
              onClick={() => {
                addCity(city.id);
                setQuery('');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between group"
            >
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{city.name}</span>
                <span className="text-zinc-500 ml-2">{city.country}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 font-medium">
                  {getCityOffsetString(city.timezone)}
                </span>
                <Plus className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}
      {isOpen && query && availableCities.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-900 shadow-lg rounded-lg py-3 px-4 text-sm text-center text-zinc-500 border border-zinc-200 dark:border-zinc-800">
          No cities found. Try searching for a country.
        </div>
      )}
    </div>
  );
}
