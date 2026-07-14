import { useEffect, useMemo, useRef, useState } from 'react'
import { CITIES } from '../data/cities'
import { useAppStore } from '../store/useAppStore'

export function CityPicker() {
  const cityIds = useAppStore((s) => s.cityIds)
  const addCity = useAppStore((s) => s.addCity)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const available = useMemo(() => {
    const selected = new Set(cityIds)
    const q = query.trim().toLowerCase()
    return CITIES.filter((c) => {
      if (selected.has(c.id)) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
      )
    })
  }, [cityIds, query])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()

    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="city-picker" ref={rootRef}>
      <button
        type="button"
        className="city-picker__trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="city-picker__plus" aria-hidden>
          +
        </span>
        Add city
      </button>

      {open && (
        <div className="city-picker__panel">
          <input
            ref={inputRef}
            className="city-picker__search"
            type="search"
            placeholder="Search city or country…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search cities"
          />
          <ul className="city-picker__list" role="listbox">
            {available.length === 0 ? (
              <li className="city-picker__empty">No cities match</li>
            ) : (
              available.map((city) => (
                <li key={city.id}>
                  <button
                    type="button"
                    className="city-picker__option"
                    role="option"
                    onClick={() => {
                      addCity(city.id)
                      setQuery('')
                      setOpen(false)
                    }}
                  >
                    <span className="city-picker__name">{city.name}</span>
                    <span className="city-picker__meta">
                      {city.country} · {city.region}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
