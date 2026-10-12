import type { Sample } from '../sim/types'
import type { RunSummary } from '../sim/analysis'

type Props = {
  samples: Sample[]
  summary: RunSummary
}

const FRUIT = '#3d7a32'
const BLUE = '#2a74e6'
const RED = '#d63a48'

export function Charts({ samples, summary }: Props) {
  return (
    <section className="charts">
      <article className="panel">
        <header className="panel-head">
          <h2>Fruit, blue, and red</h2>
          <p>Each line is scaled to its own peak. The counts are recorded from the garden.</p>
        </header>
        <Timeline samples={samples} />
        <Legend samples={samples} />
      </article>
      <article className={`panel summary tone-${summary.tone}`} data-testid="summary">
        <h2>{summary.headline}</h2>
        <ul>
          {summary.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </article>
      <article className="panel">
        <header className="panel-head">
          <h2>Blue against red</h2>
          <p>A loop means the two groups are taking turns.</p>
        </header>
        <Phase samples={samples} />
      </article>
      <article className="panel">
        <header className="panel-head">
          <h2>Inherited traits</h2>
          <p>Average speed and vision passed to new blobs.</p>
        </header>
        <Traits samples={samples} />
      </article>
    </section>
  )
}

function Legend({ samples }: { samples: Sample[] }) {
  const last = samples[samples.length - 1]
  if (!last) return null
  return (
    <div className="legend">
      <span style={{ color: FRUIT }}>Fruit {fmt(last.fruit)}</span>
      <span style={{ color: BLUE }}>Blue {fmt(last.blue)}</span>
      <span style={{ color: RED }}>Red {fmt(last.red)}</span>
    </div>
  )
}

function Timeline({ samples }: { samples: Sample[] }) {
  const view = decimate(samples, 420)
  if (view.length < 2) return <p className="empty">The timeline starts as soon as the garden moves.</p>
  const w = 320
  const h = 150
  const pad = 8
  const fruit = view.map((sample) => sample.fruit)
  const blue = view.map((sample) => sample.blue)
  const red = view.map((sample) => sample.red)
  const path = (values: number[]) => line(values, w, h, pad)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Fruit, blue blobs, and red blobs over time">
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={pad} x2={w - pad} y1={pad + (h - pad * 2) * g} y2={pad + (h - pad * 2) * g} stroke="#eadfce" />
      ))}
      <path d={path(fruit)} stroke={FRUIT} />
      <path d={path(blue)} stroke={BLUE} />
      <path d={path(red)} stroke={RED} />
    </svg>
  )
}

function Phase({ samples }: { samples: Sample[] }) {
  const view = decimate(samples, 500)
  if (view.length < 2) return <p className="empty">The phase plot fills in as both groups change.</p>
  const w = 220
  const h = 160
  const pad = 16
  const maxX = Math.max(1, ...view.map((sample) => sample.blue))
  const maxY = Math.max(1, ...view.map((sample) => sample.red))
  const pts = view.map((sample, index) => {
    const x = pad + (sample.blue / maxX) * (w - pad * 2)
    const y = h - pad - (sample.red / maxY) * (h - pad * 2)
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  })
  const last = view[view.length - 1]
  const lx = pad + (last.blue / maxX) * (w - pad * 2)
  const ly = h - pad - (last.red / maxY) * (h - pad * 2)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart phase" role="img" aria-label="Blue count against red count">
      <path d={pts.join(' ')} stroke="#6d5a48" />
      <circle cx={lx} cy={ly} r="3.5" fill={RED} />
      <text x={pad} y={14} className="axis">red</text>
      <text x={w - 36} y={h - 4} className="axis">blue</text>
    </svg>
  )
}

function Traits({ samples }: { samples: Sample[] }) {
  return (
    <div className="trait-grid">
      <TraitLine samples={samples} title="Speed" blueKey="blueSpeed" redKey="redSpeed" />
      <TraitLine samples={samples} title="Vision" blueKey="blueVision" redKey="redVision" />
    </div>
  )
}

function TraitLine({
  samples,
  title,
  blueKey,
  redKey,
}: {
  samples: Sample[]
  title: string
  blueKey: 'blueSpeed' | 'blueVision'
  redKey: 'redSpeed' | 'redVision'
}) {
  const view = decimate(samples, 240)
  const blue = view.map((sample) => sample[blueKey])
  const red = view.map((sample) => sample[redKey])
  const nums = [...blue, ...red].filter((value): value is number => value != null)
  if (nums.length < 2) return <p className="empty">{title} shows up while a group is alive.</p>
  const min = Math.min(...nums) - 0.02
  const max = Math.max(...nums) + 0.02
  const w = 150
  const h = 72
  const path = (values: (number | null)[]) => {
    let d = ''
    values.forEach((value, index) => {
      if (value == null) return
      const x = (index / Math.max(1, values.length - 1)) * (w - 8) + 4
      const y = h - 8 - ((value - min) / (max - min)) * (h - 16)
      d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `
    })
    return d
  }
  return (
    <div>
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label={`${title} trait trend`}>
        <path d={path(blue)} stroke={BLUE} />
        <path d={path(red)} stroke={RED} />
      </svg>
    </div>
  )
}

function line(values: number[], w: number, h: number, pad: number) {
  const max = Math.max(1, ...values)
  return values
    .map((value, index) => {
      const x = pad + (index / Math.max(1, values.length - 1)) * (w - pad * 2)
      const y = pad + (1 - value / max) * (h - pad * 2)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function decimate<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items
  const stride = items.length / max
  const out: T[] = []
  for (let i = 0; i < max; i++) out.push(items[Math.floor(i * stride)])
  out.push(items[items.length - 1])
  return out
}

function fmt(value: number) {
  return value >= 10 ? Math.round(value).toString() : value.toFixed(1)
}
