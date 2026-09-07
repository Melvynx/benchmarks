import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CITIES, REGION_ORDER, type City, type Region } from '../data/cities'
import { useDismiss } from '../hooks/use-dismiss'
import { formatUtcOffset, getUtcOffsetMinutes } from '../lib/time'
import { cx } from './cell-style'

/** Case- and accent-insensitive, so "sao paulo" finds "São Paulo". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function CityPicker({
  selectedIds,
  now,
  onAdd,
}: {
  selectedIds: string[]
  now: Date
  onAdd: (cityId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])
  const ref = useDismiss<HTMLDivElement>(open, close)

  const available = useMemo(
    () => CITIES.filter((city) => !selectedIds.includes(city.id)),
    [selectedIds],
  )

  const matches = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return available
    return available.filter(
      (city) =>
        normalize(city.name).includes(needle) || normalize(city.country).includes(needle),
    )
  }, [available, query])

  const grouped = useMemo(() => {
    const byRegion = new Map<Region, City[]>()
    for (const city of matches) {
      const bucket = byRegion.get(city.region)
      if (bucket) bucket.push(city)
      else byRegion.set(city.region, [city])
    }
    return REGION_ORDER.filter((region) => byRegion.has(region)).map((region) => ({
      region,
      cities: byRegion.get(region)!,
    }))
  }, [matches])

  useEffect(() => setActiveIndex(0), [query, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Keep the keyboard cursor inside the scroll viewport.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const commit = (city: City | undefined) => {
    if (!city) return
    onAdd(city.id)
    setQuery('')
    inputRef.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) => {
        if (matches.length === 0) return 0
        return (index + step + matches.length) % matches.length
      })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      commit(matches[activeIndex])
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        className={cx(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
          open
            ? 'border-glow/40 bg-glow-soft text-glow'
            : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
        )}
      >
        <span className="text-base leading-none">+</span>
        Add city
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 flex max-h-[26rem] w-[21rem] flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2xl shadow-black/60">
          <div className="border-b border-line p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search city or country…"
              aria-label="Search city or country"
              className="w-full rounded-lg bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </div>

          <div ref={listRef} className="overflow-y-auto overscroll-contain py-1">
            {matches.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-faint">
                {available.length === 0
                  ? 'Every city in the catalog is already on your board.'
                  : `No city matches “${query}”.`}
              </p>
            ) : (
              grouped.map(({ region, cities }) => (
                <section key={region}>
                  <h3 className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
                    {region}
                  </h3>
                  {cities.map((city) => {
                    const index = matches.indexOf(city)
                    const active = index === activeIndex
                    return (
                      <button
                        key={city.id}
                        data-active={active}
                        onMouseMove={() => setActiveIndex(index)}
                        onClick={() => commit(city)}
                        className={cx(
                          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors',
                          active ? 'bg-raised' : 'hover:bg-raised/60',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-ink">{city.name}</span>
                          <span className="block truncate text-xs text-ink-faint">
                            {city.country}
                          </span>
                        </span>
                        <span className="tnum shrink-0 font-mono text-xs text-ink-faint">
                          {formatUtcOffset(getUtcOffsetMinutes(city.timeZone, now))}
                        </span>
                      </button>
                    )
                  })}
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
