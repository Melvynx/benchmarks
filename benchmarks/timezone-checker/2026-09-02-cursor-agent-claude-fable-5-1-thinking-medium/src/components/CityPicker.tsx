import { Plus, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CITIES, searchCities, type City, type Region } from '@/data/cities'
import { cn } from '@/lib/cn'
import { formatUtcOffset, getUtcOffsetMinutes } from '@/lib/timezone'
import { useAppStore } from '@/store/useAppStore'

const REGION_ORDER: Region[] = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Middle East',
  'Asia',
  'Oceania',
]

export function CityPicker() {
  const cityIds = useAppStore((state) => state.cityIds)
  const addCity = useAppStore((state) => state.addCity)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const results = useMemo(() => searchCities(query, cityIds), [query, cityIds])
  const grouped = useMemo(() => {
    const byRegion = new Map<Region, City[]>()
    for (const city of results) {
      const bucket = byRegion.get(city.region) ?? []
      bucket.push(city)
      byRegion.set(city.region, bucket)
    }
    return REGION_ORDER.filter((region) => byRegion.has(region)).map((region) => ({
      region,
      cities: byRegion.get(region)!,
    }))
  }, [results])

  const remaining = CITIES.length - cityIds.length

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    document.getElementById(optionId(listboxId, activeIndex))?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, listboxId])

  function close() {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  function select(city: City) {
    addCity(city.id)
    close()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, results.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Enter': {
        event.preventDefault()
        const city = results[activeIndex]
        if (city) select(city)
        break
      }
      case 'Escape':
        event.preventDefault()
        close()
        break
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        disabled={remaining === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400/60 disabled:cursor-not-allowed disabled:opacity-50',
          open
            ? 'border-mint-500/50 bg-mint-500/10 text-mint-300'
            : 'border-ink-700 bg-ink-900/70 text-ink-200 hover:border-ink-600 hover:text-ink-100',
        )}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add city
        <span className="tabular rounded-md bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-400">{remaining}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-fade-up overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 shadow-2xl shadow-black/60"
          role="dialog"
          aria-label="Add a city"
        >
          <div className="flex items-center gap-2 border-b border-ink-700 px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search city or country…"
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-activedescendant={results[activeIndex] ? optionId(listboxId, activeIndex) : undefined}
              aria-autocomplete="list"
              className="h-11 w-full bg-transparent text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
            />
          </div>

          <ul id={listboxId} role="listbox" className="scrollbar-thin max-h-72 overflow-y-auto p-1.5">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-ink-500">No cities match “{query}”.</li>
            )}
            {grouped.map(({ region, cities }) => (
              <li key={region} role="presentation">
                <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  {region}
                </div>
                <ul role="group" aria-label={region}>
                  {cities.map((city) => {
                    const index = results.indexOf(city)
                    const active = index === activeIndex
                    return (
                      <li
                        key={city.id}
                        id={optionId(listboxId, index)}
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => select(city)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                          active ? 'bg-ink-700 text-ink-100' : 'text-ink-300',
                        )}
                      >
                        <span className="truncate">
                          <span className="font-medium text-ink-100">{city.name}</span>
                          <span className="text-ink-500"> · {city.country}</span>
                        </span>
                        <span className="tabular shrink-0 font-mono text-[11px] text-ink-500">
                          {formatUtcOffset(getUtcOffsetMinutes(city.timeZone))}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function optionId(listboxId: string, index: number) {
  return `${listboxId}-option-${index}`
}
