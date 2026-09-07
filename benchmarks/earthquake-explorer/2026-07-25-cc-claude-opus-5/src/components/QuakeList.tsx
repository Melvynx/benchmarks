import { useEffect, useMemo, useRef, useState } from 'react'
import type { Quake } from '../lib/usgs'
import { colorFor, type ColorMode } from '../lib/color'
import * as fmt from '../lib/format'
import { cx } from '../lib/cx'

const PAGE = 60

interface QuakeListProps {
  quakes: Quake[]
  selectedId: string | null
  hoveredId: string | null
  colorMode: ColorMode
  now: number
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

export function QuakeList({
  quakes,
  selectedId,
  hoveredId,
  colorMode,
  now,
  onSelect,
  onHover,
}: QuakeListProps) {
  const [limit, setLimit] = useState(PAGE)
  const scrollRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Any change to the result set starts the list from the top again.
  const signature = quakes.length > 0 ? `${quakes.length}:${quakes[0].id}` : 'empty'
  useEffect(() => {
    setLimit(PAGE)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [signature])

  const visible = useMemo(() => quakes.slice(0, limit), [quakes, limit])

  // Keep an externally selected event (e.g. clicked on the map) in view.
  useEffect(() => {
    if (!selectedId) return
    const index = quakes.findIndex((q) => q.id === selectedId)
    if (index === -1) return
    if (index >= limit) {
      setLimit(Math.ceil((index + 1) / PAGE) * PAGE)
      return
    }
    const node = listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [selectedId, quakes, limit])

  if (quakes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-6 py-12 text-center">
        <span className="text-sm font-medium text-ink-dim">No matching events</span>
        <span className="text-xs text-ink-faint">
          Widen the magnitude or depth range, or clear the search.
        </span>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <ul ref={listRef}>
        {visible.map((quake) => {
          const color = colorFor(colorMode, quake, now)
          const active = quake.id === selectedId
          return (
            <li key={quake.id}>
              <button
                type="button"
                data-id={quake.id}
                onClick={() => onSelect(quake.id)}
                onMouseEnter={() => onHover(quake.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(quake.id)}
                onBlur={() => onHover(null)}
                aria-current={active}
                className={cx(
                  'relative flex w-full items-center gap-3 border-b border-line-soft px-4 py-2.5 text-left transition-colors duration-100',
                  active
                    ? 'bg-hover'
                    : quake.id === hoveredId
                      ? 'bg-raised'
                      : 'hover:bg-raised',
                )}
              >
                <span
                  className={cx(
                    'absolute inset-y-0 left-0 w-[2px] transition-opacity',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                  style={{ background: color }}
                  aria-hidden
                />

                <span
                  className="tabular grid size-9 shrink-0 place-items-center rounded-lg text-[13px] font-semibold"
                  style={{
                    background: `${color}1f`,
                    color,
                    boxShadow: `inset 0 0 0 1px ${color}45`,
                  }}
                >
                  {fmt.magnitude(quake.mag)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] leading-tight font-medium text-ink">
                    {quake.place}
                  </span>
                  <span className="tabular mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-faint">
                    <span>{fmt.timeAgo(quake.time, now)}</span>
                    <span aria-hidden>·</span>
                    <span>{fmt.depth(quake.depth)}</span>
                    {quake.tsunami === 1 && (
                      <span className="font-medium text-sky-400">· tsunami</span>
                    )}
                    {quake.felt ? (
                      <span className="text-ink-faint">· {fmt.compactNumber(quake.felt)} felt</span>
                    ) : null}
                  </span>
                </span>

                {quake.alert && (
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    title={`PAGER alert: ${quake.alert}`}
                    style={{
                      background:
                        quake.alert === 'red'
                          ? '#ef4444'
                          : quake.alert === 'orange'
                            ? '#f97316'
                            : quake.alert === 'yellow'
                              ? '#eab308'
                              : '#22c55e',
                    }}
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {limit < quakes.length && (
        <div className="p-3">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE * 2)}
            className="w-full rounded-lg border border-line bg-raised py-2 text-xs font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink"
          >
            Show more — {fmt.compactNumber(quakes.length - limit)} remaining
          </button>
        </div>
      )}
    </div>
  )
}
