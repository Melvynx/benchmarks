import { useState } from 'react'

import { CITY_CATALOG } from '../data/cities'

interface CityPickerProps {
  selectedCityIds: string[]
  onAddCity: (cityId: string) => void
}

export function CityPicker({ selectedCityIds, onAddCity }: CityPickerProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const availableCities = CITY_CATALOG.filter(
    (city) => !selectedCityIds.includes(city.id),
  )

  const normalizedQuery = query.trim().toLowerCase()
  const matches = availableCities.filter((city) => {
    if (!normalizedQuery) {
      return true
    }

    return `${city.name} ${city.country} ${city.region}`
      .toLowerCase()
      .includes(normalizedQuery)
  })

  const visibleMatches = matches.slice(0, 8)
  const showResults = isOpen && availableCities.length > 0

  return (
    <section className="panel">
      <div className="panel__heading">
        <p className="panel__eyebrow">City catalog</p>
        <h2>Add cities</h2>
      </div>

      <p className="panel__copy">
        Search a curated set of remote-work hubs. Duplicate cities are blocked
        automatically.
      </p>

      <label className="search">
        <span className="sr-only">Search cities or countries</span>
        <input
          type="search"
          value={query}
          placeholder="Search city or country"
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
        />
      </label>

      {showResults ? (
        <div className="search-results" role="listbox" aria-label="Available cities">
          {visibleMatches.length > 0 ? (
            visibleMatches.map((city) => (
              <button
                key={city.id}
                type="button"
                className="search-results__item"
                onMouseDown={(event) => {
                  event.preventDefault()
                  onAddCity(city.id)
                  setQuery('')
                  setIsOpen(false)
                }}
              >
                <span>
                  <strong>{city.name}</strong>
                  <small>{city.country}</small>
                </span>
                <small>{city.region}</small>
              </button>
            ))
          ) : (
            <p className="search-results__empty">No catalog match for that search.</p>
          )}
        </div>
      ) : null}

      <div className="panel__footer">
        <span>{availableCities.length} cities still available</span>
        <span>Curated across every major region</span>
      </div>
    </section>
  )
}
