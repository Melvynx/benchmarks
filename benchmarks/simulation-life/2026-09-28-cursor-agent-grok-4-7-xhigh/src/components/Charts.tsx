import { useEffect, useRef, useState } from 'react'
import type { Story } from '../sim/summary'
import type { Sample } from '../sim/types'

type ScaleMode = 'fit' | 'counts'

type Props = {
  history: Sample[]
  story: Story
  frame: number
}

const COLORS = {
  fruit: '#2f9e44',
  blue: '#2f78f0',
  red: '#ef3d55',
}

export function Charts({ history, story, frame }: Props) {
  const mainRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<HTMLCanvasElement>(null)
  const traitRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<ScaleMode>('fit')
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const canvas = mainRef.current
    if (!canvas) return
    const box = fit(canvas)
    if (!box) return
    drawMain(box.ctx, box.w, box.h, history, mode, hover)
  }, [history, frame, mode, hover])

  useEffect(() => {
    const canvas = phaseRef.current
    if (!canvas) return
    const box = fit(canvas)
    if (!box) return
    drawPhase(box.ctx, box.w, box.h, history)
  }, [history, frame])

  useEffect(() => {
    const canvas = traitRef.current
    if (!canvas) return
    const box = fit(canvas)
    if (!box) return
    drawTraits(box.ctx, box.w, box.h, history)
  }, [history, frame])

  const last = history[history.length - 1]
  const pointed = hover != null ? history[hover] : last

  return (
    <section className="charts">
      <header>
        <h2>History</h2>
        <div className="scale">
          <button type="button" aria-pressed={mode === 'fit'} onClick={() => setMode('fit')}>
            Fit each
          </button>
          <button type="button" aria-pressed={mode === 'counts'} onClick={() => setMode('counts')}>
            Same scale
          </button>
        </div>
      </header>
      <div className="legend">
        <span style={{ color: COLORS.fruit }}>Fruit {pointed ? pointed.fruit.toFixed(1) : '0'}</span>
        <span style={{ color: COLORS.blue }}>Blue {pointed ? pointed.blue : 0}</span>
        <span style={{ color: COLORS.red }}>Red {pointed ? pointed.red : 0}</span>
        <span className="muted">{pointed ? `beat ${pointed.tick}` : 'beat 0'}</span>
      </div>
      <canvas
        ref={mainRef}
        className="chart"
        onMouseMove={(event) => setHover(indexAt(event.currentTarget, event.clientX, history.length))}
        onMouseLeave={() => setHover(null)}
      />
      <p className="axis">{mode === 'fit' ? 'Each line is stretched to its own high, from zero.' : 'Fruit, blue blobs, and red blobs share one count axis.'}</p>
      <h2>Blue vs red</h2>
      <canvas ref={phaseRef} className="chart phase" />
      <h2>Trait trends</h2>
      <p className="axis">Inherited speed and metabolism. Gaps mean that group was gone.</p>
      <canvas ref={traitRef} className="chart traits" />
      <div className="trait-legend">
        <span style={{ color: COLORS.blue }}>Blue speed</span>
        <span style={{ color: '#8eb6ff' }}>Blue metabolism</span>
        <span style={{ color: COLORS.red }}>Red speed</span>
        <span style={{ color: '#ffb0b8' }}>Red metabolism</span>
      </div>
      <h2>Story</h2>
      {story.lines.map((line) => (
        <p key={line} className="story">
          {line}
        </p>
      ))}
      <dl className="peaks">
        <div>
          <dt>Blue high</dt>
          <dd>{Math.round(story.bluePeak)}</dd>
        </div>
        <div>
          <dt>Red high</dt>
          <dd>{Math.round(story.redPeak)}</dd>
        </div>
        <div>
          <dt>Fruit high</dt>
          <dd>{story.fruitPeak.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Red lag</dt>
          <dd>{story.lagTicks == null ? '—' : `${story.lagTicks} beats`}</dd>
        </div>
      </dl>
    </section>
  )
}

function indexAt(canvas: HTMLCanvasElement, clientX: number, length: number) {
  if (length <= 1) return 0
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const pad = 8
  const t = (x - pad) / Math.max(1, rect.width - pad * 2)
  return Math.max(0, Math.min(length - 1, Math.round(t * (length - 1))))
}

function fit(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return null
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const width = Math.max(1, Math.floor(rect.width * dpr))
  const height = Math.max(1, Math.floor(rect.height * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w: rect.width, h: rect.height }
}

function drawMain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  history: Sample[],
  mode: ScaleMode,
  hover: number | null,
) {
  ctx.clearRect(0, 0, w, h)
  roundRect(ctx, 0, 0, w, h, 12)
  ctx.fillStyle = '#fffdf8'
  ctx.fill()
  const pad = { l: 8, r: 8, t: 12, b: 18 }
  if (history.length < 2) return
  const fruit = history.map((sample) => sample.fruit)
  const blue = history.map((sample) => sample.blue)
  const red = history.map((sample) => sample.red)
  const globalMax = Math.max(1, ...fruit, ...blue, ...red)
  const series = [
    { values: fruit, color: COLORS.fruit, max: mode === 'fit' ? Math.max(1, ...fruit) : globalMax },
    { values: blue, color: COLORS.blue, max: mode === 'fit' ? Math.max(1, ...blue) : globalMax },
    { values: red, color: COLORS.red, max: mode === 'fit' ? Math.max(1, ...red) : globalMax },
  ]
  ctx.strokeStyle = '#f0e6d8'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i += 1) {
    const y = pad.t + ((h - pad.t - pad.b) * i) / 3
    ctx.beginPath()
    ctx.moveTo(pad.l, y)
    ctx.lineTo(w - pad.r, y)
    ctx.stroke()
  }
  for (const item of series) strokeSeries(ctx, item.values, history, item.color, 0, item.max, w, h, pad)
  if (hover != null) {
    const t0 = history[0].tick
    const t1 = Math.max(t0 + 1, history[history.length - 1].tick)
    const x = pad.l + ((history[hover].tick - t0) / (t1 - t0)) * (w - pad.l - pad.r)
    ctx.strokeStyle = '#c8b49a'
    ctx.beginPath()
    ctx.moveTo(x, pad.t)
    ctx.lineTo(x, h - pad.b)
    ctx.stroke()
  }
  ctx.fillStyle = '#8a7560'
  ctx.font = '11px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.fillText(String(history[0].tick), pad.l, h - 4)
  const end = String(history[history.length - 1].tick)
  ctx.fillText(end, w - pad.r - ctx.measureText(end).width, h - 4)
}

function drawPhase(ctx: CanvasRenderingContext2D, w: number, h: number, history: Sample[]) {
  ctx.clearRect(0, 0, w, h)
  roundRect(ctx, 0, 0, w, h, 12)
  ctx.fillStyle = '#fffdf8'
  ctx.fill()
  const pad = 22
  const maxX = Math.max(1, ...history.map((sample) => sample.blue))
  const maxY = Math.max(1, ...history.map((sample) => sample.red))
  ctx.strokeStyle = '#f0e6d8'
  ctx.strokeRect(pad, 10, w - pad - 10, h - pad - 6)
  ctx.fillStyle = '#8a7560'
  ctx.font = '11px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.fillText('Blue', w / 2 - 12, h - 4)
  ctx.save()
  ctx.translate(12, h / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Red', 0, 0)
  ctx.restore()
  if (history.length === 0) return
  ctx.beginPath()
  history.forEach((sample, index) => {
    const x = pad + (sample.blue / maxX) * (w - pad - 14)
    const y = 10 + (1 - sample.red / maxY) * (h - pad - 16)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = '#7d6a58'
  ctx.lineWidth = 1.4
  ctx.stroke()
  const last = history[history.length - 1]
  const x = pad + (last.blue / maxX) * (w - pad - 14)
  const y = 10 + (1 - last.red / maxY) * (h - pad - 16)
  ctx.fillStyle = COLORS.red
  ctx.beginPath()
  ctx.arc(x, y, 4, 0, Math.PI * 2)
  ctx.fill()
}

function drawTraits(ctx: CanvasRenderingContext2D, w: number, h: number, history: Sample[]) {
  ctx.clearRect(0, 0, w, h)
  roundRect(ctx, 0, 0, w, h, 12)
  ctx.fillStyle = '#fffdf8'
  ctx.fill()
  const pad = { l: 8, r: 8, t: 10, b: 8 }
  const lines: { values: (number | null)[]; color: string }[] = [
    { values: history.map((sample) => sample.blueSpeed), color: COLORS.blue },
    { values: history.map((sample) => sample.blueMetabolism), color: '#8eb6ff' },
    { values: history.map((sample) => sample.redSpeed), color: COLORS.red },
    { values: history.map((sample) => sample.redMetabolism), color: '#ffb0b8' },
  ]
  const nums = lines.flatMap((line) => line.values.filter((value): value is number => value != null))
  const min = Math.min(0.7, ...(nums.length ? nums : [0.8]))
  const max = Math.max(1.3, ...(nums.length ? nums : [1.2]))
  for (const line of lines) strokeNullable(ctx, line.values, history, line.color, min, max, w, h, pad)
}

function strokeSeries(
  ctx: CanvasRenderingContext2D,
  values: number[],
  history: Sample[],
  color: string,
  min: number,
  max: number,
  w: number,
  h: number,
  pad: { l: number; r: number; t: number; b: number },
) {
  const t0 = history[0]?.tick ?? 0
  const t1 = Math.max(t0 + 1, history[history.length - 1]?.tick ?? 1)
  ctx.beginPath()
  values.forEach((value, index) => {
    const x = pad.l + ((history[index].tick - t0) / (t1 - t0)) * (w - pad.l - pad.r)
    const y = pad.t + (1 - (value - min) / (max - min || 1)) * (h - pad.t - pad.b)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
}

function strokeNullable(
  ctx: CanvasRenderingContext2D,
  values: (number | null)[],
  history: Sample[],
  color: string,
  min: number,
  max: number,
  w: number,
  h: number,
  pad: { l: number; r: number; t: number; b: number },
) {
  if (history.length < 2) return
  const t0 = history[0].tick
  const t1 = Math.max(t0 + 1, history[history.length - 1].tick)
  let drawing = false
  ctx.beginPath()
  values.forEach((value, index) => {
    if (value == null) {
      drawing = false
      return
    }
    const x = pad.l + ((history[index].tick - t0) / (t1 - t0)) * (w - pad.l - pad.r)
    const y = pad.t + (1 - (value - min) / (max - min || 1)) * (h - pad.t - pad.b)
    if (!drawing) {
      ctx.moveTo(x, y)
      drawing = true
    } else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = color
  ctx.lineWidth = 1.6
  ctx.stroke()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
