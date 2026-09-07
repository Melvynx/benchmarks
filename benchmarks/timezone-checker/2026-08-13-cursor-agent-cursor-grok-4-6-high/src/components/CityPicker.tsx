import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { CITIES, REGION_ORDER, type City } from '../data/cities'

type Props = {
  selectedIds: string[]
  onAdd: (id: string) => void
}

export function CityPicker({ selectedIds, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const available = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return CITIES.filter((city) => {
      if (selectedIds.includes(city.id)) return false
      if (!needle) return true
      return (
        city.name.toLowerCase().includes(needle) ||
        city.country.toLowerCase().includes(needle) ||
        city.region.toLowerCase().includes(needle)
      )
    })
  }, [query, selectedIds])

  const grouped = useMemo(() => {
    return REGION_ORDER.map((region) => ({
      region,
      cities: available.filter((city) => city.region === region),
    })).filter((group) => group.cities.length > 0)
  }, [available])

  const flat = available

  useEffect(() => {
    setActive(0)
  }, [query, open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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

  function choose(city: City) {
    onAdd(city.id)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, Math.max(flat.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const city = flat[active]
      if (city) choose(city)
    }
  }

  let running = 0

  return (
    <div className="picker" ref={rootRef}>
      <button
        type="button"
        className="picker-toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        Add city
      </button>
      {open ? (
        <div className="picker-pop">
          <input
            ref={inputRef}
            className="picker-search"
            type="search"
            placeholder="Search city or country"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={flat[active] ? `${listId}-${flat[active].id}` : undefined}
          />
          <div className="picker-list" id={listId} role="listbox" aria-label="Cities">
            {flat.length === 0 ? (
              <p className="picker-empty">
                {selectedIds.length === CITIES.length
                  ? 'Every catalog city is already on the board.'
                  : 'No cities match that search.'}
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.region} className="picker-group">
                  <p className="picker-region">{group.region}</p>
                  {group.cities.map((city) => {
                    const index = running
                    running += 1
                    return (
                      <button
                        key={city.id}
                        type="button"
                        id={`${listId}-${city.id}`}
                        role="option"
                        aria-selected={index === active}
                        className={`picker-option${index === active ? ' is-active' : ''}`}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => choose(city)}
                      >
                        <span>{city.name}</span>
                        <span className="picker-country">{city.country}</span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
