import type { Sample } from '../../sim/history'
import { seriesColor, type Mode } from '../../theme'

type Props = { samples: Sample[]; mode: Mode }

type Row = {
  label: string
  hint: string
  blue: (s: Sample) => number
  red: (s: Sample) => number
}

const ROWS: Row[] = [
  { label: 'Speed', hint: 'higher = faster, and costlier to run', blue: (s) => s.blueSpeed, red: (s) => s.redSpeed },
  { label: 'Vision', hint: 'higher = senses further, and costs upkeep', blue: (s) => s.blueVision, red: (s) => s.redVision },
  { label: 'Thrift', hint: 'higher = burns less energy', blue: (s) => s.blueThrift, red: (s) => s.redThrift },
]

/**
 * Small multiples rather than one crowded panel: each trait keeps its own row,
 * and all six lines share the 0.5–1.8 range traits are clamped to.
 */
export function TraitChart({ samples, mode }: Props) {
  const w = 300
  const h = 54
  const lo = 0.5
  const hi = 1.8
  const tMin = samples.length ? samples[0].t : 0
  const tMax = samples.length ? samples[samples.length - 1].t : 1
  const span = Math.max(1e-6, tMax - tMin)

  const line = (pick: (s: Sample) => number) => {
    let d = ''
    for (let i = 0; i < samples.length; i++) {
      const x = ((samples[i].t - tMin) / span) * w
      const v = Math.max(lo, Math.min(hi, pick(samples[i])))
      const y = h - ((v - lo) / (hi - lo)) * h
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    }
    return d
  }

  return (
    <div className="trait-grid">
      {ROWS.map((row) => (
        <div key={row.label} className="trait-row">
          <div className="trait-head">
            <span className="trait-label">{row.label}</span>
            <span className="trait-hint">{row.hint}</span>
          </div>
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${row.label} trait over time`}>
            {/* 1.0 is where every blob starts, so it reads as the baseline. */}
            <line className="grid" x1={0} x2={w} y1={h - ((1 - lo) / (hi - lo)) * h} y2={h - ((1 - lo) / (hi - lo)) * h} />
            <path d={line(row.blue)} fill="none" stroke={seriesColor('blue', mode)} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <path d={line(row.red)} fill="none" stroke={seriesColor('red', mode)} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      ))}
    </div>
  )
}
