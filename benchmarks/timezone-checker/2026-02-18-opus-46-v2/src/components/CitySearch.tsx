import { useState, useRef, useEffect, useCallback } from 'react';
import { cities } from '../data/cities';
import type { City } from '../types';

interface CitySearchProps {
  onSelect: (city: City) => void;
  disabled: boolean;
}

export function CitySearch({ onSelect, disabled }: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? cities.filter((c) => {
        const q = query.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
      }).slice(0, 12)
    : [];

  const handleSelect = useCallback((city: City) => {
    onSelect(city);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(0);
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.children[selectedIndex] as HTMLElement;
      active?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="city-search" ref={containerRef}>
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder={disabled ? 'Max 5 timezones' : 'Search cities...'}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length > 0);
            setSelectedIndex(0);
          }}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {isOpen && filtered.length > 0 && (
        <ul className="search-results" ref={listRef}>
          {filtered.map((city, i) => (
            <li
              key={`${city.name}-${city.country}`}
              className={i === selectedIndex ? 'active' : ''}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => handleSelect(city)}
            >
              <span className="result-city">{city.name}</span>
              <span className="result-country">{city.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
