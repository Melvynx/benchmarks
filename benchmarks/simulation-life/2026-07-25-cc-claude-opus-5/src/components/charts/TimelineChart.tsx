import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Sample } from '../../sim/history'
import { seriesColor, SERIES_LABEL, type Mode, type SeriesKey } from '../../theme'

export type Series = { key: SeriesKey; values: number[] }

type Props = {
  samples: Sample[]
  series: Series[]
  mode: Mode
  height?: number
  /** Indexed mode rescales every series to its own peak so all three read together. */
  indexed: boolean
  yLabel: string
}

const PAD = { top: 14, right: 58, bottom: 26, left: 46 }

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10
  const out: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(Math.round(v * 1000) / 1000)
  return out
}

function fmtTime(t: number) {
  if (t < 90) return `${Math.round(t)}s`
  const m = Math.floor(t / 60)
  return `${m}m${String(Math.round(t - m * 60)).padStart(2, '0')}`
}

export function TimelineChart({ samples, series, mode, height = 208, indexed, yLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const [box, setBox] = useState({ w: 640 })
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const clipId = useId()

  // In indexed mode each series is shown against its own peak, which is what
  // keeps three very different counts legible on a single shared axis.
  const peaks = useMemo(() => series.map((s) => (indexed ? Math.max(1, ...s.values) : 1)), [series, indexed])

  const yMax = useMemo(() => {
    if (indexed) return 100
    const top = Math.max(1, ...series.flatMap((s) => s.values))
    const ticks = niceTicks(top)
    return Math.max(top, ticks[ticks.length - 1])
  }, [series, indexed])

  const w = box.w
  const h = height
  const innerW = Math.max(10, w - PAD.left - PAD.right)
  const innerH = Math.max(10, h - PAD.top - PAD.bottom)
  const tMin = samples.length ? samples[0].t : 0
  const tMax = samples.length ? samples[samples.length - 1].t : 1
  const span = Math.max(1e-6, tMax - tMin)

  const x = (t: number) => PAD.left + ((t - tMin) / span) * innerW
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH

  const scaled = series.map((s, i) => s.values.map((v) => (indexed ? (v / peaks[i]) * 100 : v)))
  const paths = scaled.map((vals) => {
    let d = ''
    for (let i = 0; i < vals.length; i++) {
      d += `${i ? 'L' : 'M'}${x(samples[i].t).toFixed(1)} ${y(vals[i]).toFixed(1)}`
    }
    return d
  })

  // Lines that finish close together would stack their labels on top of each
  // other, so nudge them apart from the top down and keep them inside the plot.
  const endLabels = (() => {
    const LINE = 13
    const placed = scaled
      .map((vals, i) => ({ key: series[i].key, y: vals.length ? y(vals[vals.length - 1]) : NaN }))
      .filter((l) => !Number.isNaN(l.y))
      .sort((a, b) => a.y - b.y)
    for (let i = 1; i < placed.length; i++) {
      placed[i].y = Math.max(placed[i].y, placed[i - 1].y + LINE)
    }
    const overshoot = placed.length ? placed[placed.length - 1].y - (PAD.top + innerH) : 0
    if (overshoot > 0) for (const l of placed) l.y -= overshoot
    return placed
  })()

  const ticks = niceTicks(yMax)
  const timeTicks = useMemo(() => {
    const out: number[] = []
    for (let i = 0; i <= 4; i++) out.push(tMin + (span * i) / 4)
    return out
  }, [tMin, span])

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const t = tMin + ((px - PAD.left) / innerW) * span
    if (!samples.length) return
    let lo = 0
    let hi = samples.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (samples[mid].t < t) lo = mid + 1
      else hi = mid
    }
    setHover(lo)
  }

  // Track width so the SVG can be a plain responsive block.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setBox({ w: el.clientWidth })
  }, [])
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hoverSample = hover !== null ? samples[hover] : null

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${yLabel} over time`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top - 4} width={innerW} height={innerH + 8} />
          </clipPath>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line className="grid" x1={PAD.left} x2={PAD.left + innerW} y1={y(tick)} y2={y(tick)} />
            <text className="axis" x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {indexed ? `${tick}%` : tick}
            </text>
          </g>
        ))}
        {timeTicks.map((t) => (
          <text key={t} className="axis" x={x(t)} y={h - 8} textAnchor="middle">
            {fmtTime(t)}
          </text>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {paths.map((d, i) => (
            <path key={series[i].key} d={d} fill="none" stroke={seriesColor(series[i].key, mode)} strokeWidth={2} strokeLinejoin="round" />
          ))}
        </g>

        {/* Direct labels at the line ends: identity without a legend round-trip. */}
        {endLabels.map((l) => (
          <text
            key={l.key}
            className="series-label"
            x={PAD.left + innerW + 6}
            y={l.y}
            fill={seriesColor(l.key, mode)}
            dominantBaseline="middle"
          >
            {SERIES_LABEL[l.key].replace(' blobs', '')}
          </text>
        ))}

        {hoverSample && (
          <g>
            <line className="crosshair" x1={x(hoverSample.t)} x2={x(hoverSample.t)} y1={PAD.top} y2={PAD.top + innerH} />
            {scaled.map((vals, i) => (
              <circle
                key={series[i].key}
                cx={x(hoverSample.t)}
                cy={y(vals[hover!])}
                r={4}
                fill={seriesColor(series[i].key, mode)}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>

      {hoverSample && (
        <div className="tooltip" style={{ left: `${(x(hoverSample.t) / w) * 100}%` }}>
          <div className="tooltip-time">{fmtTime(hoverSample.t)}</div>
          {series.map((s) => (
            <div key={s.key} className="tooltip-row">
              <span className="swatch" style={{ background: seriesColor(s.key, mode) }} />
              <span className="tooltip-name">{SERIES_LABEL[s.key]}</span>
              <span className="tooltip-value">{Math.round(s.values[hover!])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
