import { Check, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CITIES, REGIONS, matchesCity, type City } from '../data/cities'
import { formatUtcOffset } from '../lib/format'
import { getUtcOffsetMinutes } from '../lib/timezone'

interface CityPickerProps {
  selectedIds: readonly string[]
  now: Date
  onAdd: (cityId: string) => void
}

const LISTBOX_ID = 'city-picker-listbox'
const optionId = (cityId: string) => `city-option-${cityId}`

/**
 * Trigger + popover. The popover is absolutely positioned against the nearest
 * positioned ancestor (the toolbar), so it stays inside the viewport on mobile.
 */
export function CityPicker({ selectedIds, now, onAdd }: CityPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? LISTBOX_ID : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-canvas shadow-sm hover:opacity-90 sm:w-auto"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add city
      </button>

      {open && (
        <CityPickerPanel
          selectedIds={selectedIds}
          now={now}
          onSelect={(cityId) => {
            onAdd(cityId)
            close(true)
          }}
          onDismiss={() => close(true)}
        />
      )}
    </div>
  )
}

interface CityPickerPanelProps {
  selectedIds: readonly string[]
  now: Date
  onSelect: (cityId: string) => void
  onDismiss: () => void
}

function CityPickerPanel({ selectedIds, now, onSelect, onDismiss }: CityPickerPanelProps) {
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const minute = Math.floor(now.getTime() / 60_000)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const offsets = useMemo(() => {
    const at = new Date(minute * 60_000)
    return new Map(CITIES.map((city) => [city.id, getUtcOffsetMinutes(city.timeZone, at)]))
  }, [minute])

  const groups = useMemo(
    () =>
      REGIONS.map((region) => ({
        region,
        cities: CITIES.filter((city) => city.region === region && matchesCity(city, query)),
      })).filter((group) => group.cities.length > 0),
    [query],
  )

  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectable = groups.flatMap((group) => group.cities).filter((city) => !selected.has(city.id))
  const active = selectable.find((city) => city.id === activeId) ?? selectable[0]

  useEffect(() => {
    if (active) document.getElementById(optionId(active.id))?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const move = (step: number) => {
    if (selectable.length === 0) return
    const index = active ? selectable.indexOf(active) : -1
    const next = (index + step + selectable.length) % selectable.length
    setActiveId(selectable[next]!.id)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        move(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        move(-1)
        break
      case 'Home':
        if (selectable.length) {
          event.preventDefault()
          setActiveId(selectable[0]!.id)
        }
        break
      case 'End':
        if (selectable.length) {
          event.preventDefault()
          setActiveId(selectable[selectable.length - 1]!.id)
        }
        break
      case 'Enter':
        event.preventDefault()
        if (active) onSelect(active.id)
        break
      case 'Escape':
        event.preventDefault()
        onDismiss()
        break
    }
  }

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_16px_48px_-12px_rgb(0_0_0/0.35)]">
      <div className="relative border-b border-line">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search cities by name or country"
          aria-expanded="true"
          aria-controls={LISTBOX_ID}
          aria-activedescendant={active ? optionId(active.id) : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search city or country"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-12 w-full bg-transparent pl-11 pr-4 text-sm outline-none placeholder:text-ink-3"
        />
      </div>

      <div id={LISTBOX_ID} role="listbox" aria-label="Cities" className="max-h-72 overflow-y-auto p-1.5">
        {groups.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-ink-2">No cities match “{query.trim()}”.</p>
        )}
        {groups.map((group) => (
          <div key={group.region} role="group" aria-label={group.region}>
            <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              {group.region}
            </div>
            {group.cities.map((city) => (
              <CityOption
                key={city.id}
                city={city}
                offsetMinutes={offsets.get(city.id) ?? 0}
                added={selected.has(city.id)}
                active={city.id === active?.id}
                onSelect={() => onSelect(city.id)}
                onHover={() => setActiveId(city.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface CityOptionProps {
  city: City
  offsetMinutes: number
  added: boolean
  active: boolean
  onSelect: () => void
  onHover: () => void
}

function CityOption({ city, offsetMinutes, added, active, onSelect, onHover }: CityOptionProps) {
  return (
    <div
      id={optionId(city.id)}
      role="option"
      aria-selected={active}
      aria-disabled={added}
      onClick={added ? undefined : onSelect}
      onMouseMove={added ? undefined : onHover}
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
        added ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${active ? 'bg-accent-soft' : ''}`}
    >
      <span className="min-w-0">
        <span className="font-medium text-ink">{city.name}</span>
        <span className="ml-2 text-ink-2">{city.country}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-ink-2">
        {added ? (
          <>
            <Check className="size-3.5" aria-hidden="true" />
            Added
          </>
        ) : (
          formatUtcOffset(offsetMinutes)
        )}
      </span>
    </div>
  )
}
