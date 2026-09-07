import { useMemo } from 'react'
import type { Sample } from '../sim/history'
import { summarise } from '../sim/analysis'
import { SERIES, SERIES_LABEL, type SeriesKey } from '../theme'

type Props = {
  samples: Sample[]
  version: number
  fruitCapacity: number
  blueAlive: number
  redAlive: number
}

export function Charts({ samples, version, fruitCapacity, blueAlive, redAlive }: Props) {
  const summary = useMemo(
    () => summarise({ samples, fruitCapacity, blueAlive, redAlive }),
    [samples, version, fruitCapacity, blueAlive, redAlive],
  )

  return (
    <div className="charts">
      <section>
        <h2>Timeline</h2>
        <Timeline samples={samples} />
      </section>
      <section>
        <h2>Blue vs red</h2>
        <PhasePlot samples={samples} />
      </section>
      <section>
        <h2>Run summary</h2>
        <p className="headline">{summary.headline}</p>
        <ul>
          {summary.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Trait trends</h2>
        <TraitChart samples={samples} />
      </section>
    </div>
  )
}

function Timeline({ samples }: { samples: Sample[] }) {
  const w = 320
  const h = 128
  const pad = { l: 8, r: 8, t: 8, b: 18 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const keys: SeriesKey[] = ['fruit', 'blue', 'red']
  const maxes = {
    fruit: Math.max(1, ...samples.map((s) => s.fruit)),
    blue: Math.max(1, ...samples.map((s) => s.blue)),
    red: Math.max(1, ...samples.map((s) => s.red)),
  }
  const t0 = samples[0]?.t ?? 0
  const t1 = samples[samples.length - 1]?.t ?? 1
  const span = Math.max(1, t1 - t0)

  const path = (key: SeriesKey) => {
    if (samples.length < 2) return ''
    return samples
      .map((s, i) => {
        const x = pad.l + ((s.t - t0) / span) * innerW
        const y = pad.t + innerH - (s[key] / maxes[key]) * innerH
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  const last = samples[samples.length - 1]
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="Fruit, blue, and red counts over time">
        {keys.map((key) => (
          <path key={key} d={path(key)} fill="none" stroke={SERIES[key]} strokeWidth="1.8" strokeLinejoin="round" />
        ))}
        <text x={pad.l} y={h - 4} className="axis">
          {t0.toFixed(0)}s
        </text>
        <text x={w - pad.r} y={h - 4} textAnchor="end" className="axis">
          {t1.toFixed(0)}s
        </text>
      </svg>
      <div className="legend">
        {keys.map((key) => (
          <span key={key}>
            <i style={{ background: SERIES[key] }} />
            {SERIES_LABEL[key]} {last ? last[key] : 0}
            <em> / {maxes[key]}</em>
          </span>
        ))}
      </div>
    </div>
  )
}

function PhasePlot({ samples }: { samples: Sample[] }) {
  const size = 160
  const pad = 16
  const inner = size - pad * 2
  const maxB = Math.max(1, ...samples.map((s) => s.blue))
  const maxR = Math.max(1, ...samples.map((s) => s.red))
  const pts = samples.map((s) => ({
    x: pad + (s.blue / maxB) * inner,
    y: pad + inner - (s.red / maxR) * inner,
  }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="chart-svg phase" role="img" aria-label="Phase plot of blue versus red">
      <text x={size / 2} y={size - 2} textAnchor="middle" className="axis">
        blue
      </text>
      <text x={4} y={size / 2} className="axis" transform={`rotate(-90 4 ${size / 2})`}>
        red
      </text>
      {d && <path d={d} fill="none" stroke={SERIES.blue} strokeWidth="1.4" opacity="0.85" />}
      {last && <circle cx={last.x} cy={last.y} r="3.2" fill={SERIES.red} />}
    </svg>
  )
}

function TraitChart({ samples }: { samples: Sample[] }) {
  const w = 320
  const h = 96
  const pad = { l: 8, r: 8, t: 8, b: 8 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const t0 = samples[0]?.t ?? 0
  const t1 = samples[samples.length - 1]?.t ?? 1
  const span = Math.max(1, t1 - t0)
  const keys = ['blueSpeed', 'redSpeed', 'blueVision', 'redVision'] as const
  const colors = [SERIES.blue, SERIES.red, '#9bb6ff', '#ff9a8c']
  const labels = ['blue speed', 'red speed', 'blue vision', 'red vision']

  const path = (key: (typeof keys)[number]) => {
    if (samples.length < 2) return ''
    return samples
      .map((s, i) => {
        const x = pad.l + ((s.t - t0) / span) * innerW
        const y = pad.t + innerH - ((s[key] - 0.5) / 1.3) * innerH
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="Inherited speed and vision over time">
        {keys.map((key, i) => (
          <path key={key} d={path(key)} fill="none" stroke={colors[i]} strokeWidth="1.5" opacity={i < 2 ? 1 : 0.7} />
        ))}
      </svg>
      <div className="legend">
        {labels.map((label, i) => (
          <span key={label}>
            <i style={{ background: colors[i] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
