import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, Search, Check } from 'lucide-react'
import { searchCities, type City } from '@/data/cities'
import { formatUtcOffset, getUtcOffsetMinutes } from '@/lib/timezone'
import { useTimezone } from '@/context/TimezoneContext'

export const CityPicker: React.FC = () => {
  const { cityIds, addCity } = useTimezone()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const availableCities = useMemo(() => {
    return searchCities(query, cityIds)
  }, [query, cityIds])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (city: City) => {
    addCity(city.id)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, availableCities.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev <= 0 ? Math.max(0, availableCities.length - 1) : prev - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (availableCities[highlightedIndex]) {
        handleSelect(availableCities[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add city or country... (34 world cities)"
          aria-label="Search and add city from predefined catalog"
          className="w-full bg-ink-900 border border-ink-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-ink-100 placeholder-ink-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen)
            inputRef.current?.focus()
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-400 hover:text-emerald-400 transition-colors cursor-pointer"
          aria-label="Toggle city dropdown"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-ink-900/98 backdrop-blur-md border border-ink-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto scrollbar-thin p-1.5"
        >
          {availableCities.length === 0 ? (
            <div className="p-4 text-center text-xs text-ink-400">
              {cityIds.length >= 34 ? (
                <div className="flex flex-col items-center gap-1 text-emerald-400">
                  <Check className="w-5 h-5" />
                  <span>All 34 cities from catalog added!</span>
                </div>
              ) : (
                <span>No matching city found in predefined catalog.</span>
              )}
            </div>
          ) : (
            availableCities.map((city, idx) => {
              const isSelected = idx === highlightedIndex
              const offsetMinutes = getUtcOffsetMinutes(city.timeZone)
              const offsetStr = formatUtcOffset(offsetMinutes)

              return (
                <button
                  key={city.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(city)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                      : 'text-ink-200 hover:bg-ink-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0" aria-hidden>
                      {city.flag}
                    </span>
                    <div className="truncate">
                      <span className="font-semibold text-white mr-1.5">{city.name}</span>
                      <span className="text-ink-400 text-xs">{city.country}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-ink-800 text-ink-400 border border-ink-700/50">
                      {city.region}
                    </span>
                    <span className="font-mono text-xs text-emerald-400/90 font-semibold tabular">
                      {offsetStr}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
