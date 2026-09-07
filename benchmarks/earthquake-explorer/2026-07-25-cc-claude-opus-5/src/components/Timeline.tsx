import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HistogramBin } from '../lib/filters'
import { magnitudeColor } from '../lib/color'
import { cx } from '../lib/cx'

/** One swatch per magnitude band, matching BAND_LABELS. */
const BAND_COLORS = [1, 2.5, 3.5, 4.5, 5.5, 7].map(magnitudeColor)

interface TimelineProps {
  bins: HistogramBin[]
  domain: [number, number]
  selection: [number, number] | null
  onSelect: (range: [number, number] | null) => void
  totalLabel: string
}

const tickFormat = (span: number) =>
  new Intl.DateTimeFormat(undefined, {
    ...(span > 3 * 24 * 3600_000
      ? { month: 'short', day: 'numeric' }
      : { hour: 'numeric', minute: '2-digit' }),
  })

/**
 * Activity over the loaded window, with drag-to-brush time filtering.
 * Bars are coloured by the strongest event in each bucket, so the timeline
 * reads with the same colour language as the map.
 */
export function Timeline({
  bins,
  domain,
  selection,
  onSelect,
  totalLabel,
}: TimelineProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ anchor: number; current: number } | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  const peak = useMemo(() => Math.max(1, ...bins.map((b) => b.count)), [bins])
  const [start, end] = domain
  const span = Math.max(1, end - start)
  const format = useMemo(() => tickFormat(span), [span])

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const rect = plotRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return start
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return start + ratio * span
    },
    [span, start],
  )

  // The pointer handlers read the live drag from a ref: committing the brush
  // from inside a setState updater would notify the parent mid-render.
  const dragRef = useRef(drag)
  dragRef.current = drag

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const next = { ...d, current: timeFromClientX(e.clientX) }
      dragRef.current = next
      setDrag(next)
    }
    const up = () => {
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!d) return
      const lo = Math.min(d.anchor, d.current)
      const hi = Math.max(d.anchor, d.current)
      // A tap rather than a drag clears the brush.
      onSelect(hi - lo < span * 0.012 ? null : [lo, hi])
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [drag, onSelect, span, timeFromClientX])

  const live = drag
    ? ([Math.min(drag.anchor, drag.current), Math.max(drag.anchor, drag.current)] as [
        number,
        number,
      ])
    : selection

  const ratio = (t: number) => ((t - start) / span) * 100
  const pct = (t: number) => `${ratio(t).toFixed(2)}%`
  const hoveredBin = hover !== null ? bins[hover] : null

  return (
    <div className="relative flex h-[104px] shrink-0 flex-col border-t border-line bg-surface px-4 pt-2 pb-1.5">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold tracking-[0.09em] text-ink-faint uppercase">
            Activity timeline
          </span>
          <span className="text-[10px] text-ink-faint">{totalLabel}</span>
        </div>
        {selection ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink"
          >
            Clear time filter
          </button>
        ) : (
          <span className="hidden text-[10px] text-ink-faint sm:block">
            Drag across to filter by time
          </span>
        )}
      </div>

      <div
        ref={plotRef}
        className="relative min-h-0 flex-1 cursor-crosshair touch-none"
        onPointerDown={(e) => {
          e.preventDefault()
          const t = timeFromClientX(e.clientX)
          setDrag({ anchor: t, current: t })
        }}
        onPointerLeave={() => setHover(null)}
      >
        <div className="absolute inset-0 flex items-end gap-px">
          {bins.map((bin, i) => {
            const inRange = !live || (bin.end > live[0] && bin.start < live[1])
            const height = bin.count === 0 ? 0 : Math.max(8, (bin.count / peak) * 100)
            return (
              <div
                key={i}
                className="flex h-full flex-1 items-end"
                onPointerEnter={() => setHover(i)}
              >
                <div
                  className={cx(
                    'flex w-full flex-col-reverse overflow-hidden rounded-t-[2px] transition-opacity duration-150',
                    inRange ? 'opacity-100' : 'opacity-20',
                    hover === i && 'brightness-125',
                  )}
                  style={{ height: `${height}%` }}
                >
                  {/* Stacked by magnitude band, weakest at the base. */}
                  {bin.bands.map((count, band) =>
                    count === 0 ? null : (
                      <span
                        key={band}
                        style={{
                          flexGrow: count,
                          flexBasis: 0,
                          background: BAND_COLORS[band],
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {live && (
          <div
            className="pointer-events-none absolute inset-y-0 border-x border-accent/60 bg-accent/8"
            style={{ left: pct(live[0]), right: `${(100 - ratio(live[1])).toFixed(2)}%` }}
          />
        )}

        {hoveredBin && !drag && (
          <div
            className="pointer-events-none absolute -top-0.5 z-10 -translate-x-1/2 rounded-md border border-line bg-void/95 px-1.5 py-1 text-center whitespace-nowrap shadow-xl"
            style={{
              left: `clamp(3rem, ${pct((hoveredBin.start + hoveredBin.end) / 2)}, calc(100% - 3rem))`,
            }}
          >
            <span className="tabular block text-[10px] font-semibold text-ink">
              {hoveredBin.count} event{hoveredBin.count === 1 ? '' : 's'}
            </span>
            <span className="tabular block text-[9px] text-ink-faint">
              {format.format(new Date(hoveredBin.start))}
              {hoveredBin.maxMag > -Infinity && ` · max M${hoveredBin.maxMag.toFixed(1)}`}
            </span>
          </div>
        )}
      </div>

      <div className="tabular mt-1 flex justify-between text-[9.5px] text-ink-faint">
        <span>{format.format(new Date(start))}</span>
        <span>{format.format(new Date(start + span / 2))}</span>
        <span>now</span>
      </div>
    </div>
  )
}
