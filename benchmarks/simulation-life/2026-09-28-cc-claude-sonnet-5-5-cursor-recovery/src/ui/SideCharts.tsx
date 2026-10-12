import { useMemo } from 'react'
import type { World } from '../sim/world'
import { decimate, fmtClock, linePath, niceCeil, useWidth } from './chartUtils'

interface Props {
  world: World
  tick: number
}

export function PhasePlot({ world, tick }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(320)
  const size = Math.min(width, 300)
  const m = { l: 34, r: 10, t: 10, b: 30 }
  const pw = size - m.l - m.r
  const ph = size - m.t - m.b

  const data = useMemo(() => {
    const pts = decimate(world.history, 0, 240)
    let mb = 1
    let mr = 1
    for (const s of pts) {
      mb = Math.max(mb, s.blue)
      mr = Math.max(mr, s.red)
    }
    return { pts, mb: niceCeil(mb * 1.08), mr: niceCeil(mr * 1.15) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, world.history, tick])

  const { pts, mb, mr } = data
  const X = (v: number) => m.l + (v / mb) * pw
  const Y = (v: number) => m.t + ph - (v / mr) * ph
  const segs = 48
  const per = Math.max(2, Math.ceil(pts.length / segs))
  const paths: { d: string; k: number }[] = []
  for (let i = 0; i < pts.length - 1; i += per - 1) {
    const slice = pts.slice(i, Math.min(pts.length, i + per))
    if (slice.length < 2) continue
    paths.push({ d: linePath(slice.map((s) => [X(s.blue), Y(s.red)] as [number, number])), k: i / Math.max(1, pts.length - 1) })
  }
  const last = pts[pts.length - 1]
  const first = pts[0]

  return (
    <section className="panel phase" aria-label="Blue versus red phase plot">
      <div className="panel-title">
        <h2>Blue vs red</h2>
        <span className="hint">loops mean out-of-phase waves</span>
      </div>
      <div ref={ref} className="chart-box center" style={{ height: size }}>
        <svg width={size} height={size} role="img" aria-label="Red blobs plotted against blue blobs over time">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={m.l} x2={m.l + pw} y1={Y(f * mr)} y2={Y(f * mr)} className="grid" />
              <text x={m.l - 5} y={Y(f * mr) + 3.5} textAnchor="end" className="axis">
                {Math.round(f * mr)}
              </text>
              <line x1={X(f * mb)} x2={X(f * mb)} y1={m.t} y2={m.t + ph} className="grid v" />
              <text x={X(f * mb)} y={m.t + ph + 14} textAnchor="middle" className="axis">
                {Math.round(f * mb)}
              </text>
            </g>
          ))}
          <text x={m.l + pw / 2} y={size - 4} textAnchor="middle" className="axis label blue">
            blue blobs →
          </text>
          <text x={10} y={m.t + ph / 2} textAnchor="middle" className="axis label red" transform={`rotate(-90 10 ${m.t + ph / 2})`}>
            red blobs →
          </text>
          {paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={`hsl(${275 - p.k * 25} ${45 + p.k * 30}% ${72 - p.k * 32}%)`}
              strokeWidth={1.6 + p.k * 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {first && <circle cx={X(first.blue)} cy={Y(first.red)} r={3.5} fill="#fff" stroke="#8a7fb0" strokeWidth={1.6} />}
          {last && (
            <g>
              <circle cx={X(last.blue)} cy={Y(last.red)} r={8} fill="#8b5cf6" opacity={0.18}>
                <animate attributeName="r" values="5;10;5" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx={X(last.blue)} cy={Y(last.red)} r={4.5} fill="#7c3aed" stroke="#fff" strokeWidth={1.6} />
            </g>
          )}
        </svg>
      </div>
      <p className="caption">Hollow dot is the start, the solid dot is now. Older path is lighter.</p>
    </section>
  )
}

export function TraitTrends({ world, tick }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(320)
  const pts = useMemo(
    () => decimate(world.history, 0, 160),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, world.history, tick],
  )
  return (
    <section className="panel traits" aria-label="Trait trends">
      <div className="panel-title">
        <h2>Trait trends</h2>
        <span className="hint">inherited averages</span>
      </div>
      <div ref={ref}>
        <TraitLine
          title="Speed"
          unit="u/s"
          width={width}
          t={pts.map((s) => s.t)}
          blue={pts.map((s) => s.blueSpeed)}
          red={pts.map((s) => s.redSpeed)}
          digits={2}
        />
        <TraitLine
          title="Vision"
          unit="u"
          width={width}
          t={pts.map((s) => s.t)}
          blue={pts.map((s) => s.blueVision)}
          red={pts.map((s) => s.redVision)}
          digits={1}
        />
      </div>
      {world.params.mutation === 0 && <p className="caption">Trait wobble is off, so children copy their parents exactly.</p>}
    </section>
  )
}

function TraitLine({
  title,
  unit,
  width,
  t,
  blue,
  red,
  digits,
}: {
  title: string
  unit: string
  width: number
  t: number[]
  blue: number[]
  red: number[]
  digits: number
}) {
  const h = 74
  const m = { l: 6, r: 6, t: 8, b: 14 }
  const pw = width - m.l - m.r
  const ph = h - m.t - m.b
  const vals = [...blue, ...red].filter((v) => v > 0)
  if (t.length < 2 || !vals.length) {
    return (
      <div className="trait">
        <div className="trait-head">
          <b>{title}</b>
          <span className="hint">waiting for data</span>
        </div>
        <svg width={width} height={h} />
      </div>
    )
  }
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = Math.max((hi - lo) * 0.15, hi * 0.03)
  const y0 = lo - pad
  const y1 = hi + pad
  const t0 = t[0]
  const t1 = t[t.length - 1]
  const X = (v: number) => m.l + ((v - t0) / Math.max(1, t1 - t0)) * pw
  const Y = (v: number) => m.t + ph - ((v - y0) / (y1 - y0)) * ph
  const seg = (arr: number[]) => {
    const parts: [number, number][][] = []
    let cur: [number, number][] = []
    arr.forEach((v, i) => {
      if (v > 0) cur.push([X(t[i]), Y(v)])
      else if (cur.length) {
        parts.push(cur)
        cur = []
      }
    })
    if (cur.length) parts.push(cur)
    return parts.map((p) => linePath(p)).join('')
  }
  const firstB = blue.find((v) => v > 0) ?? 0
  const lastB = [...blue].reverse().find((v) => v > 0) ?? 0
  const firstR = red.find((v) => v > 0) ?? 0
  const lastR = [...red].reverse().find((v) => v > 0) ?? 0
  return (
    <div className="trait">
      <div className="trait-head">
        <b>{title}</b>
        <span className="blue">
          {firstB.toFixed(digits)} → {lastB.toFixed(digits)}
        </span>
        <span className="red">
          {firstR.toFixed(digits)} → {lastR.toFixed(digits)}
        </span>
        <span className="hint">{unit}</span>
      </div>
      <svg width={width} height={h} role="img" aria-label={`${title} trend`}>
        <line x1={m.l} x2={m.l + pw} y1={m.t + ph} y2={m.t + ph} className="grid" />
        <path d={seg(blue)} fill="none" stroke="#3f8dff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={seg(red)} fill="none" stroke="#ff4863" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        <text x={m.l} y={h - 2} className="axis">
          {fmtClock(t0)}
        </text>
        <text x={m.l + pw} y={h - 2} textAnchor="end" className="axis">
          {fmtClock(t1)}
        </text>
      </svg>
    </div>
  )
}
