import { useMemo, useState } from 'react'
import type { World } from '../sim/world'
import { areaPath, decimate, fmtClock, linePath, niceCeil, niceTimeStep, useWidth } from './chartUtils'

interface Props {
  world: World
  tick: number
  height?: number
}

type Mode = 'counts' | 'relative'
type Span = 0 | 300 | 900

const COLORS = { fruit: '#4cae4f', blue: '#3f8dff', red: '#ff4863' }

export function TimelineChart({ world, tick, height = 232 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(720)
  const [mode, setMode] = useState<Mode>('counts')
  const [span, setSpan] = useState<Span>(0)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const m = { l: 40, r: mode === 'counts' ? 40 : 12, t: 12, b: 24 }
  const pw = Math.max(80, width - m.l - m.r)
  const ph = height - m.t - m.b

  const view = useMemo(() => {
    const h = world.history
    const now = world.t
    const from = span > 0 ? Math.max(0, now - span) : 0
    const pts = decimate(h, from, Math.max(60, Math.floor(pw * 0.9)))
    const t0 = span > 0 ? Math.max(0, now - span) : 0
    const t1 = Math.max(t0 + 30, now, pts.length ? pts[pts.length - 1].t : 0)
    let maxBlobs = 1
    let maxFruit = 1
    let maxB = 1
    let maxR = 1
    for (const s of pts) {
      maxBlobs = Math.max(maxBlobs, s.blue, s.red)
      maxFruit = Math.max(maxFruit, s.fruit)
      maxB = Math.max(maxB, s.blue)
      maxR = Math.max(maxR, s.red)
    }
    return { pts, t0, t1, maxBlobs, maxFruit, maxB, maxR }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, world.history, tick, span, pw])

  const { pts, t0, t1 } = view
  const yBlobMax = niceCeil(view.maxBlobs * 1.08)
  const yFruitMax = niceCeil(view.maxFruit * 1.08)
  const x = (t: number) => m.l + ((t - t0) / (t1 - t0)) * pw
  const yBlobs = (v: number) => m.t + ph - (v / yBlobMax) * ph
  const yFruit = (v: number) => m.t + ph - (v / yFruitMax) * ph
  const rel = (v: number, max: number) => m.t + ph - (v / Math.max(1, max)) * ph * 0.94

  const fruitPts: [number, number][] = []
  const bluePts: [number, number][] = []
  const redPts: [number, number][] = []
  for (const s of pts) {
    if (mode === 'counts') {
      fruitPts.push([x(s.t), yFruit(s.fruit)])
      bluePts.push([x(s.t), yBlobs(s.blue)])
      redPts.push([x(s.t), yBlobs(s.red)])
    } else {
      fruitPts.push([x(s.t), rel(s.fruit, view.maxFruit)])
      bluePts.push([x(s.t), rel(s.blue, view.maxB)])
      redPts.push([x(s.t), rel(s.red, view.maxR)])
    }
  }

  const baseY = m.t + ph
  const xStep = niceTimeStep(t1 - t0, Math.max(3, pw / 90))
  const xTicks: number[] = []
  for (let t = Math.ceil(t0 / xStep) * xStep; t <= t1; t += xStep) xTicks.push(t)

  const yTicksLeft = mode === 'counts' ? [0, 0.25, 0.5, 0.75, 1].map((f) => f * yBlobMax) : [0, 0.5, 1].map((f) => f * 100)

  let hover: (typeof pts)[number] | null = null
  if (hoverX !== null && pts.length) {
    const tt = t0 + ((hoverX - m.l) / pw) * (t1 - t0)
    let best = pts[0]
    for (const s of pts) if (Math.abs(s.t - tt) < Math.abs(best.t - tt)) best = s
    hover = best
  }

  const last = pts[pts.length - 1]
  const cur = { fruit: world.fruitCount, blue: world.blueCount, red: world.redCount }

  return (
    <section className="panel timeline" aria-label="Population timeline">
      <div className="panel-title">
        <h2>The story so far</h2>
        <div className="seg" role="group" aria-label="Chart scale">
          <button type="button" className={mode === 'counts' ? 'on' : ''} onClick={() => setMode('counts')} title="Real counts. Fruit uses the right axis.">
            Counts
          </button>
          <button type="button" className={mode === 'relative' ? 'on' : ''} onClick={() => setMode('relative')} title="Each line scaled to its own peak">
            Relative
          </button>
        </div>
        <div className="seg" role="group" aria-label="Time window">
          <button type="button" className={span === 0 ? 'on' : ''} onClick={() => setSpan(0)}>
            All
          </button>
          <button type="button" className={span === 900 ? 'on' : ''} onClick={() => setSpan(900)}>
            15 min
          </button>
          <button type="button" className={span === 300 ? 'on' : ''} onClick={() => setSpan(300)}>
            5 min
          </button>
        </div>
      </div>
      <div className="legend">
        <span className="lg fruit">
          <i /> Fruit <b>{cur.fruit}</b>
        </span>
        <span className="lg blue">
          <i /> Blue blobs <b>{cur.blue}</b>
        </span>
        <span className="lg red">
          <i /> Red blobs <b>{cur.red}</b>
        </span>
        <span className="lg note">{mode === 'counts' ? 'Blobs on the left axis, fruit on the right.' : 'Every line is scaled to its own peak.'}</span>
      </div>
      <div ref={ref} className="chart-box" style={{ height }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Fruit, blue blobs and red blobs over time"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setHoverX(e.clientX - r.left)
          }}
          onPointerLeave={() => setHoverX(null)}
        >
          <defs>
            <linearGradient id="gBlue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={COLORS.blue} stopOpacity="0.28" />
              <stop offset="1" stopColor={COLORS.blue} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gRed" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={COLORS.red} stopOpacity="0.22" />
              <stop offset="1" stopColor={COLORS.red} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gFruit" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={COLORS.fruit} stopOpacity="0.2" />
              <stop offset="1" stopColor={COLORS.fruit} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicksLeft.map((v, i) => {
            const yy = mode === 'counts' ? yBlobs(v) : rel(v, 100)
            return (
              <g key={i}>
                <line x1={m.l} x2={m.l + pw} y1={yy} y2={yy} className="grid" />
                <text x={m.l - 6} y={yy + 3.5} textAnchor="end" className="axis">
                  {mode === 'counts' ? Math.round(v) : `${Math.round(v)}%`}
                </text>
              </g>
            )
          })}
          {mode === 'counts' &&
            [0, 0.5, 1].map((f, i) => (
              <text key={i} x={m.l + pw + 6} y={yFruit(f * yFruitMax) + 3.5} className="axis fruit">
                {Math.round(f * yFruitMax)}
              </text>
            ))}
          {xTicks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={m.t} y2={baseY} className="grid v" />
              <text x={x(t)} y={baseY + 16} textAnchor="middle" className="axis">
                {fmtClock(t)}
              </text>
            </g>
          ))}

          <path d={areaPath(fruitPts, baseY)} fill="url(#gFruit)" />
          <path d={linePath(fruitPts)} fill="none" stroke={COLORS.fruit} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 0" opacity={0.9} />
          <path d={areaPath(bluePts, baseY)} fill="url(#gBlue)" />
          <path d={areaPath(redPts, baseY)} fill="url(#gRed)" />
          <path d={linePath(bluePts)} fill="none" stroke={COLORS.blue} strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
          <path d={linePath(redPts)} fill="none" stroke={COLORS.red} strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />

          {last && (
            <g>
              <circle cx={fruitPts[fruitPts.length - 1][0]} cy={fruitPts[fruitPts.length - 1][1]} r={3.5} fill={COLORS.fruit} />
              <circle cx={bluePts[bluePts.length - 1][0]} cy={bluePts[bluePts.length - 1][1]} r={4} fill={COLORS.blue} stroke="#fff" strokeWidth={1.5} />
              <circle cx={redPts[redPts.length - 1][0]} cy={redPts[redPts.length - 1][1]} r={4} fill={COLORS.red} stroke="#fff" strokeWidth={1.5} />
            </g>
          )}

          {hover && (
            <g pointerEvents="none">
              <line x1={x(hover.t)} x2={x(hover.t)} y1={m.t} y2={baseY} className="cursor" />
              {[
                ['fruit', mode === 'counts' ? yFruit(hover.fruit) : rel(hover.fruit, view.maxFruit)],
                ['blue', mode === 'counts' ? yBlobs(hover.blue) : rel(hover.blue, view.maxB)],
                ['red', mode === 'counts' ? yBlobs(hover.red) : rel(hover.red, view.maxR)],
              ].map(([k, yy]) => (
                <circle key={k as string} cx={x(hover.t)} cy={yy as number} r={4} fill={COLORS[k as keyof typeof COLORS]} stroke="#fff" strokeWidth={1.5} />
              ))}
            </g>
          )}
        </svg>
        {hover && (
          <div className="tip" style={{ left: Math.min(width - 130, Math.max(4, x(hover.t) + 10)), top: 6 }}>
            <strong>{fmtClock(hover.t)}</strong>
            <span className="fruit">Fruit {hover.fruit}</span>
            <span className="blue">Blue {hover.blue}</span>
            <span className="red">Red {hover.red}</span>
          </div>
        )}
      </div>
    </section>
  )
}
