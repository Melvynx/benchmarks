import { useMemo, useRef, useState } from 'react'
import { CITY_CATALOG } from '../data/cities'
import styles from './AddCitySearch.module.css'

interface Props {
  selectedIds: Set<string>
  onAdd: (id: string) => void
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

export function AddCitySearch({ selectedIds, onAdd }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const n = normalize(q)
    if (!n) return CITY_CATALOG.filter((c) => !selectedIds.has(c.id))
    return CITY_CATALOG.filter(
      (c) =>
        !selectedIds.has(c.id) &&
        (normalize(c.name).includes(n) || normalize(c.country).includes(n)),
    ).slice(0, 12)
  }, [q, selectedIds])

  return (
    <div className={styles.wrap} ref={rootRef}>
      <label className={styles.label} htmlFor="city-search">
        Add city
      </label>
      <div className={styles.field}>
        <input
          id="city-search"
          type="search"
          autoComplete="off"
          placeholder="Search by city or country…"
          className={styles.input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false)
          }}
          aria-expanded={open}
          aria-controls="city-search-list"
          aria-autocomplete="list"
        />
        {open && (q.length > 0 || filtered.length > 0) && (
          <ul id="city-search-list" className={styles.list} role="listbox">
            {filtered.length === 0 ? (
              <li className={styles.empty}>No matches</li>
            ) : (
              filtered.map((c) => (
                <li key={c.id} role="option">
                  <button
                    type="button"
                    className={styles.option}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onAdd(c.id)
                      setQ('')
                      setOpen(false)
                    }}
                  >
                    <span className={styles.optName}>{c.name}</span>
                    <span className={styles.optCountry}>{c.country}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
