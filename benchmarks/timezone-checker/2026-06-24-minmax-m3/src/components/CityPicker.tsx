import { useEffect, useMemo, useRef, useState } from 'react'
import { CITIES, REGIONS } from '../data/cities'
import type { City } from '../types'
import { SearchIcon, PlusIcon, CheckIcon } from './icons'

interface Props {
  selectedIds: string[]
  onAdd: (city: City) => void
}

export function CityPicker({ selectedIds, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = CITIES.filter((c) => {
      if (selectedSet.has(c.id)) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.timezone.toLowerCase().includes(q)
      )
    })
    const byRegion = new Map<string, City[]>()
    for (const c of filtered) {
      const arr = byRegion.get(c.region) ?? []
      arr.push(c)
      byRegion.set(c.region, arr)
    }
    for (const arr of byRegion.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name))
    }
    return REGIONS.filter((r) => byRegion.has(r)).map((r) => ({ region: r, cities: byRegion.get(r)! }))
  }, [query, selectedSet])

  const totalCount = useMemo(() => grouped.reduce((acc, g) => acc + g.cities.length, 0), [grouped])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div
        className={[
          'flex items-center gap-2 rounded-xl border bg-ink-850/80 px-3 py-2 transition',
          open ? 'border-accent-500/60 shadow-lg shadow-accent-500/10' : 'border-ink-750 hover:border-ink-600',
        ].join(' ')}
      >
        <SearchIcon width={16} height={16} className="text-ink-400" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          placeholder="Search city or country to add…"
          className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
          aria-label="Add city"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-xs text-ink-400 hover:text-ink-100"
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900/95 p-1 shadow-2xl shadow-black/60 backdrop-blur scroll-fade">
          {totalCount === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-ink-400">
              {query ? `No cities match "${query}"` : 'All available cities added'}
            </div>
          ) : (
            grouped.map(({ region, cities }) => (
              <div key={region} className="mb-1 last:mb-0">
                <div className="sticky top-0 z-10 bg-ink-900/95 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500 backdrop-blur">
                  {region}
                </div>
                {cities.map((c) => {
                  const isExisting = selectedSet.has(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (isExisting) return
                        onAdd(c)
                        setQuery('')
                      }}
                      className={[
                        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-sm transition',
                        isExisting
                          ? 'cursor-default text-ink-500'
                          : 'text-ink-100 hover:bg-ink-800',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-ink-400">{c.country}</span>
                      </span>
                      {isExisting ? (
                        <CheckIcon width={14} height={14} className="text-leaf-500" />
                      ) : (
                        <PlusIcon width={14} height={14} className="text-ink-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}