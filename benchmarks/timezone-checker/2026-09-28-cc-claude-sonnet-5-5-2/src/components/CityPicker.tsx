import { useEffect, useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { CITIES, getCity } from '../data/cities'
import { formatUtcOffset, getUtcOffsetMinutes } from '../lib/time'
import { searchCities } from '../lib/search'
import styles from './CityPicker.module.css'
import { SearchIcon } from './Icons'

interface Props {
  addedIds: readonly string[]
  now: Date
  onAdd: (id: string) => void
}

const HOUR = 3_600_000

export function CityPicker({ addedIds, now, onAdd }: Props) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const available = useMemo(() => CITIES.filter((city) => !addedIds.includes(city.id)), [addedIds])
  const results = useMemo(() => searchCities(query, available), [query, available])
  const active = Math.min(activeIndex, results.length - 1)

  const hourKey = Math.floor(now.getTime() / HOUR)
  const offsets = useMemo(() => {
    const at = new Date(hourKey * HOUR)
    return new Map(CITIES.map((city) => [city.id, formatUtcOffset(getUtcOffsetMinutes(city.timeZone, at))]))
  }, [hourKey])

  useEffect(() => {
    if (!open || active < 0) return
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const alreadyAdded = useMemo(() => {
    if (!query.trim() || results.length) return undefined
    const addedCities = addedIds.flatMap((id) => getCity(id) ?? [])
    return searchCities(query, addedCities)[0]
  }, [query, results.length, addedIds])

  const select = (id: string) => {
    onAdd(id)
    setQuery('')
    setActiveIndex(0)
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        if (!open) {
          setOpen(true)
          return
        }
        if (!results.length) return
        const step = event.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((active + step + results.length) % results.length)
        return
      }
      case 'Enter':
        if (open && results[active]) {
          event.preventDefault()
          select(results[active].id)
        }
        return
      case 'Escape':
        if (open) {
          event.preventDefault()
          setOpen(false)
        } else if (query) {
          setQuery('')
        }
        return
    }
  }

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }

  const showGroups = !query.trim()
  const activeId = open && active >= 0 ? `${listId}-${results[active].id}` : undefined

  return (
    <div className={styles.picker} onBlur={onBlur}>
      <SearchIcon className={styles.icon} size={18} />
      <input
        type="text"
        role="combobox"
        className={styles.input}
        aria-label="Add a city"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        placeholder="Add a city, search by name or country"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label="Cities"
          className={styles.list}
          onMouseDown={(event) => event.preventDefault()}
        >
          {results.map((city, index) => (
            <li key={city.id} role="presentation">
              {showGroups && (index === 0 || results[index - 1].region !== city.region) && (
                <div className={styles.group} aria-hidden="true">
                  {city.region}
                </div>
              )}
              <div
                id={`${listId}-${city.id}`}
                role="option"
                aria-selected={index === active}
                className={styles.option}
                onClick={() => select(city.id)}
                onMouseMove={() => index !== active && setActiveIndex(index)}
              >
                <span className={styles.optionText}>
                  <span className={styles.cityName}>{city.name}</span>
                  <span className={styles.country}>{city.country}</span>
                </span>
                <span className={styles.offset}>{offsets.get(city.id)}</span>
              </div>
            </li>
          ))}
          {!results.length && (
            <li role="presentation" className={styles.empty}>
              {alreadyAdded
                ? `${alreadyAdded.name} is already in your list.`
                : query.trim()
                  ? `No cities match "${query.trim()}".`
                  : 'Every city is already in your list.'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
