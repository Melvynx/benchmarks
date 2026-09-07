import { useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import { summarise } from '../sim/analysis'
import { Engine } from '../sim/engine'
import type { Sample } from '../sim/history'
import { ACTIONS } from '../sim/types'

type Props = {
  engine: Engine
}

const COL = {
  fruit: '#8ee05c',
  blue: '#3ec4e8',
  red: '#f05662',
}

export function Charts({ engine }: Props) {
  useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const samples = engine.history.samples
  const capacity = engine.world.trees.length * engine.params.fruitLimit
  const summary = summarise({
    samples,
    fruitCapacity: capacity,
    blueAlive: engine.world.counts.blue,
    redAlive: engine.world.counts.red,
  })
  const last = samples.at(-1)

  return (
    <div className="charts">
      <section className="chart-main">
        <header>
          <h2>Garden timeline</h2>
          <ul className="legend">
            <li>
              <i style={{ background: COL.fruit }} /> fruit {last?.fruit ?? 0}
            </li>
            <li>
              <i style={{ background: COL.blue }} /> blue {last?.blue ?? 0}
            </li>
            <li>
              <i style={{ background: COL.red }} /> red {last?.red ?? 0}
            </li>
          </ul>
        </header>
        <LineChart samples={samples} />
      </section>
      <section className="chart-side">
        <h2>Blue vs red</h2>
        <PhasePlot samples={samples} />
      </section>
      <section className="chart-side">
        <h2>Traits</h2>
        <TraitChart samples={samples} />
      </section>
      <section className="summary" data-tone={summary.tone}>
        <h2>Run summary</h2>
        <p className="headline">{summary.headline}</p>
        <ul>
          {summary.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="meta">
          t {engine.world.t.toFixed(0)}s · eaten {engine.world.totals.eaten} · contacts {engine.world.totals.contacts} ·
          births {engine.world.totals.births.blue + engine.world.totals.births.red} · deaths{' '}
          {engine.world.totals.deaths.blue + engine.world.totals.deaths.red}
        </p>
      </section>
    </div>
  )
}

function LineChart({ samples }: { samples: Sample[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (samples.length < 2) return

    const pad = { l: 28, r: 10, t: 10, b: 18 }
    const innerW = w - pad.l - pad.r
    const innerH = h - pad.t - pad.b
    const t0 = samples[0]!.t
    const t1 = samples[samples.length - 1]!.t
    const span = Math.max(1, t1 - t0)
    const maxFruit = Math.max(1, ...samples.map((s) => s.fruit))
    const maxPop = Math.max(1, ...samples.map((s) => Math.max(s.blue, s.red)))

    ctx.strokeStyle = 'rgba(200, 220, 210, 0.12)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 3; i++) {
      const y = pad.t + (innerH * i) / 3
      ctx.beginPath()
      ctx.moveTo(pad.l, y)
      ctx.lineTo(w - pad.r, y)
      ctx.stroke()
    }

    const xAt = (t: number) => pad.l + ((t - t0) / span) * innerW
    const yFruit = (v: number) => pad.t + innerH - (v / maxFruit) * innerH
    const yPop = (v: number) => pad.t + innerH - (v / maxPop) * innerH

    const stroke = (key: 'fruit' | 'blue' | 'red', color: string, yOf: (v: number) => number) => {
      ctx.beginPath()
      samples.forEach((s, i) => {
        const x = xAt(s.t)
        const y = yOf(s[key])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 1.8
      ctx.stroke()
    }
    stroke('fruit', COL.fruit, yFruit)
    stroke('blue', COL.blue, yPop)
    stroke('red', COL.red, yPop)

    ctx.fillStyle = 'rgba(210, 224, 218, 0.55)'
    ctx.font = '10px "JetBrains Mono", monospace'
    ctx.fillText(`${Math.round(t0)}s`, pad.l, h - 4)
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(t1)}s`, w - pad.r, h - 4)
    ctx.textAlign = 'left'
    ctx.fillText(`pop ${maxPop}`, 4, pad.t + 8)
    ctx.fillStyle = COL.fruit
    ctx.fillText(`fruit ${maxFruit}`, 4, pad.t + 20)
  }, [samples, samples.length, samples.at(-1)?.t])

  return <canvas ref={ref} className="plot" />
}

function PhasePlot({ samples }: { samples: Sample[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const pad = 16
    const maxB = Math.max(1, ...samples.map((s) => s.blue))
    const maxR = Math.max(1, ...samples.map((s) => s.red))
    ctx.strokeStyle = 'rgba(200, 220, 210, 0.14)'
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2)
    if (samples.length < 2) return
    ctx.beginPath()
    samples.forEach((s, i) => {
      const x = pad + (s.blue / maxB) * (w - pad * 2)
      const y = h - pad - (s.red / maxR) * (h - pad * 2)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = 'rgba(180, 200, 210, 0.55)'
    ctx.lineWidth = 1.3
    ctx.stroke()
    const last = samples[samples.length - 1]!
    const x = pad + (last.blue / maxB) * (w - pad * 2)
    const y = h - pad - (last.red / maxR) * (h - pad * 2)
    ctx.beginPath()
    ctx.arc(x, y, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = COL.red
    ctx.fill()
    ctx.fillStyle = 'rgba(210, 224, 218, 0.55)'
    ctx.font = '10px "JetBrains Mono", monospace'
    ctx.fillText('blue →', pad, h - 4)
    ctx.save()
    ctx.translate(10, h - pad)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('red', 0, 0)
    ctx.restore()
  }, [samples, samples.length, samples.at(-1)?.t])
  return <canvas ref={ref} className="plot" />
}

function TraitChart({ samples }: { samples: Sample[] }) {
  const last = samples.at(-1)
  return (
    <div className="traits">
      <p>
        blue speed <b>{(last?.blueSpeed ?? 1).toFixed(2)}</b>
        <span> vision {(last?.blueVision ?? 1).toFixed(2)}</span>
      </p>
      <p>
        red speed <b>{(last?.redSpeed ?? 1).toFixed(2)}</b>
        <span> vision {(last?.redVision ?? 1).toFixed(2)}</span>
      </p>
      <Mini samples={samples} />
    </div>
  )
}

function Mini({ samples }: { samples: Sample[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (samples.length < 2) return
    const t0 = samples[0]!.t
    const span = Math.max(1, samples[samples.length - 1]!.t - t0)
    const vals = samples.flatMap((s) => [s.blueSpeed, s.redSpeed])
    const lo = Math.min(...vals) - 0.02
    const hi = Math.max(...vals) + 0.02
    const yOf = (v: number) => h - 4 - ((v - lo) / (hi - lo)) * (h - 8)
    const stroke = (key: 'blueSpeed' | 'redSpeed', color: string) => {
      ctx.beginPath()
      samples.forEach((s, i) => {
        const x = ((s.t - t0) / span) * w
        const y = yOf(s[key])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    stroke('blueSpeed', COL.blue)
    stroke('redSpeed', COL.red)
  }, [samples, samples.length, samples.at(-1)?.t])
  return <canvas ref={ref} className="plot mini" />
}

export function Inspector({ engine }: Props) {
  useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const blob = engine.selected()
  if (!blob) {
    return (
      <aside className="inspector empty">
        <p>Click a blob on the dish to see energy, age, and what it is doing.</p>
      </aside>
    )
  }
  return (
    <aside className="inspector" data-kind={blob.kind}>
      <header>
        <b>{blob.kind} blob</b>
        <span>#{blob.id}</span>
      </header>
      <dl>
        <div>
          <dt>Energy</dt>
          <dd>{blob.energy.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Age</dt>
          <dd>{blob.age.toFixed(1)}s</dd>
        </div>
        <div>
          <dt>Action</dt>
          <dd>{ACTIONS[blob.action]}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>
            {((blob.kind === 'blue' ? engine.params.blueSpeed : engine.params.redSpeed) * blob.traits.speed).toFixed(1)}
            <small> ×{blob.traits.speed.toFixed(2)}</small>
          </dd>
        </div>
        <div>
          <dt>Sensing</dt>
          <dd>
            {((blob.kind === 'blue' ? engine.params.blueVision : engine.params.redVision) * blob.traits.vision).toFixed(0)}
            <small> ×{blob.traits.vision.toFixed(2)}</small>
          </dd>
        </div>
        <div>
          <dt>Anim left</dt>
          <dd>{blob.actionTimer > 0 ? `${blob.actionTimer.toFixed(2)}s` : '—'}</dd>
        </div>
        <div>
          <dt>Family</dt>
          <dd>
            gen {blob.generation} · parent {blob.parentId || 'seed'} · kids {blob.children}
          </dd>
        </div>
        <div>
          <dt>Meals</dt>
          <dd>{blob.meals}</dd>
        </div>
      </dl>
    </aside>
  )
}
