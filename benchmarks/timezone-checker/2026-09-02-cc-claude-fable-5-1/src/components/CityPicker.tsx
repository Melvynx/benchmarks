import { useEffect, useMemo, useRef, useState } from 'react'
import { type City, searchCities } from '../lib/cities'

interface Props {
  selectedIds: string[]
  onAdd: (city: City) => void
}

export function CityPicker({ selectedIds, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const excluded = useMemo(() => new Set(selectedIds), [selectedIds])
  const results = useMemo(() => searchCities(query, excluded), [query, excluded])

  useEffect(() => setCursor(0), [query, open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const choose = (city: City) => {
    onAdd(city)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const city = results[cursor]
      if (city) choose(city)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={rootRef} className="relative w-full sm:w-80">
      <div className="relative">
        <svg aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-300" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3 3" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="city-listbox"
          aria-autocomplete="list"
          aria-label="Add a city"
          placeholder="Add a city or country…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-xl border border-ink-700 bg-ink-900/80 pr-3 pl-9 text-sm text-white placeholder:text-ink-400 backdrop-blur transition-colors hover:border-ink-600 focus-visible:border-glow-400 focus-visible:outline-none"
        />
      </div>

      {open && (
        <ul
          id="city-listbox"
          ref={listRef}
          role="listbox"
          className="animate-fade-up absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-1 shadow-2xl shadow-black/60"
        >
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-400">No matching city</li>}
          {results.map((city, i) => {
            const active = i === cursor
            return (
              <li
                key={city.id}
                data-index={i}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(city)}
                className={[
                  'flex cursor-pointer items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-sm',
                  active ? 'bg-ink-700 text-white' : 'text-ink-100',
                ].join(' ')}
              >
                <span>
                  {city.name}
                  <span className="ml-2 text-xs text-ink-400">{city.country}</span>
                </span>
                <span className="shrink-0 text-[10px] tracking-wider text-ink-400 uppercase">{city.region}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
