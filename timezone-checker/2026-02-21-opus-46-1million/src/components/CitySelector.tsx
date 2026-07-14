import { useState, useRef, useEffect } from 'react'
import { CITIES } from '../data/cities'
import { formatUtcOffset, getUtcOffset } from '../utils/timezone'

interface CitySelectorProps {
  selectedIds: string[]
  onAdd: (id: string) => void
}

export function CitySelector({ selectedIds, onAdd }: CitySelectorProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = CITIES.filter(
    (c) =>
      !selectedIds.includes(c.id) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.country.toLowerCase().includes(search.toLowerCase())),
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative max-w-sm">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Add a city..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
        />
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl">
          {filtered.map((city) => (
            <button
              key={city.id}
              onClick={() => {
                onAdd(city.id)
                setSearch('')
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-700/70 transition-colors"
            >
              <span className="text-base">{city.flag}</span>
              <span className="text-slate-100">{city.name}</span>
              <span className="text-slate-500 text-xs">{city.country}</span>
              <span className="ml-auto text-xs text-slate-600">{formatUtcOffset(getUtcOffset(city.timezone))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
