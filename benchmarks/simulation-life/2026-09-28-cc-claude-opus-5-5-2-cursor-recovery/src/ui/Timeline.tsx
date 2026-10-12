import { useRef, useState } from 'react'
import type { History } from '../sim/history.ts'
import { INK, FONT, FONT_BOLD, niceTicks, timeTicks, clock, useCanvas, spreadLabels } from './chart.ts'

export type Scale = 'counts' | 'root' | 'peak'
type Win = 'all' | 'recent'

const SERIES = [
  { key: 'fruit', label: 'Fruit', color: INK.fruit, width: 1.6 },
  { key: 'blue', label: 'Blue', color: INK.blue, width: 2.2 },
  { key: 'red', label: 'Red', color: INK.red, width: 2.2 },
] as const

const PAD = { l: 40, r: 74, t: 14, b: 24 }

export function Timeline({ history, version }: { history: History; version: number }) {
  const [scale, setScale] = useState<Scale>('counts')
  const [win, setWin] = useState<Win>('all')
  const [hoverX, setHoverX] = useState<number | null>(null)
  const layout = useRef<{ tStart: number; tEnd: number; pw: number; w: number } | null>(null)

  const ref = useCanvas(
    (g, w, h) => {
      const { t, fruit, blue, red } = history.cols
      const n = t.length
      const pw = w - PAD.l - PAD.r
      const ph = h - PAD.t - PAD.b
      if (n < 2 || pw < 20) {
        g.font = FONT
        g.fillStyle = INK.muted
        g.fillText('Press play to start recording.', PAD.l, PAD.t + 20)
        return
      }
      const tEnd = t[n - 1]
      const tStart = win === 'recent' ? Math.max(0, tEnd - 300) : 0
      const i0 = win === 'recent' ? Math.max(0, history.indexAt(tStart)) : 0
      const cols = [fruit, blue, red]
      const peaks = cols.map((c) => {
        let m = 0
        for (let i = i0; i < n; i++) if (c[i] > m) m = c[i]
        return Math.max(1, m)
      })
      const maxAll = Math.max(...peaks)
      const ticks = scale === 'peak' ? [0, 0.25, 0.5, 0.75, 1] : niceTicks(maxAll, 4)
      const top = ticks[ticks.length - 1]
      const f = (v: number) => (scale === 'root' ? Math.sqrt(v / top) : v / top)
      layout.current = { tStart, tEnd, pw, w }
      const X = (tt: number) => PAD.l + ((tt - tStart) / Math.max(1e-6, tEnd - tStart)) * pw
      const Y = (v: number, s: number) => PAD.t + ph - (scale === 'peak' ? v / peaks[s] : f(v)) * ph

      // grid + axis labels
      g.font = FONT
      g.textBaseline = 'middle'
      g.textAlign = 'right'
      g.lineWidth = 1
      const yTicks = scale === 'root' ? rootTicks(top) : ticks
      for (const v of yTicks) {
        const y = scale === 'peak' ? PAD.t + ph - v * ph : PAD.t + ph - f(v) * ph
        g.strokeStyle = v === 0 ? INK.axis : INK.grid
        g.beginPath()
        g.moveTo(PAD.l, Math.round(y) + 0.5)
        g.lineTo(PAD.l + pw, Math.round(y) + 0.5)
        g.stroke()
        g.fillStyle = INK.muted
        g.fillText(scale === 'peak' ? `${Math.round(v * 100)}%` : String(v), PAD.l - 6, y)
      }
      g.textAlign = 'center'
      g.textBaseline = 'top'
      for (const tt of timeTicks(tStart, tEnd, pw)) {
        const x = X(tt)
        g.fillStyle = INK.muted
        g.fillText(clock(tt), x, PAD.t + ph + 7)
        g.strokeStyle = INK.axis
        g.beginPath()
        g.moveTo(Math.round(x) + 0.5, PAD.t + ph)
        g.lineTo(Math.round(x) + 0.5, PAD.t + ph + 4)
        g.stroke()
      }

      const stride = Math.max(1, Math.floor((n - i0) / (pw * 1.5)))
      g.save()
      g.beginPath()
      g.rect(PAD.l, PAD.t - 2, pw, ph + 4)
      g.clip()
      // fruit as a soft area so it reads as "supply" behind the two groups
      g.beginPath()
      g.moveTo(X(t[i0]), Y(0, 0))
      for (let i = i0; i < n; i += stride) g.lineTo(X(t[i]), Y(fruit[i], 0))
      g.lineTo(X(t[n - 1]), Y(fruit[n - 1], 0))
      g.lineTo(X(t[n - 1]), Y(0, 0))
      g.closePath()
      g.fillStyle = 'rgba(0,131,0,0.09)'
      g.fill()
      SERIES.forEach((s, si) => {
        const c = cols[si]
        g.beginPath()
        for (let i = i0; i < n; i += stride) {
          const x = X(t[i])
          const y = Y(c[i], si)
          if (i === i0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        g.lineTo(X(t[n - 1]), Y(c[n - 1], si))
        g.strokeStyle = s.color
        g.lineWidth = s.width
        g.lineJoin = 'round'
        g.stroke()
      })
      g.restore()

      // direct labels at the line ends
      g.font = FONT_BOLD
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      const labels = spreadLabels(
        SERIES.map((s, si) => ({ y: Y(cols[si][n - 1], si), s, v: cols[si][n - 1] })),
        15,
        PAD.t + 4,
        PAD.t + ph,
      )
      for (const l of labels) {
        g.fillStyle = l.s.color
        g.beginPath()
        g.arc(PAD.l + pw + 7, l.y, 3, 0, Math.PI * 2)
        g.fill()
        g.fillText(`${l.s.label} ${Math.round(l.v)}`, PAD.l + pw + 14, l.y)
      }

      // hover crosshair
      if (hoverX !== null && hoverX >= PAD.l && hoverX <= PAD.l + pw) {
        const tt = tStart + ((hoverX - PAD.l) / pw) * (tEnd - tStart)
        const i = history.indexAt(tt)
        const x = X(t[i])
        g.strokeStyle = 'rgba(43,39,51,0.35)'
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(Math.round(x) + 0.5, PAD.t)
        g.lineTo(Math.round(x) + 0.5, PAD.t + ph)
        g.stroke()
        SERIES.forEach((s, si) => {
          g.fillStyle = INK.surface
          g.strokeStyle = s.color
          g.lineWidth = 2
          g.beginPath()
          g.arc(x, Y(cols[si][i], si), 3.5, 0, Math.PI * 2)
          g.fill()
          g.stroke()
        })
      }
    },
    [version, scale, win, hoverX],
  )

  let tip: { x: number; flip: boolean; t: number; v: number[] } | null = null
  const L = layout.current
  if (hoverX !== null && L && history.length > 1 && hoverX >= PAD.l && hoverX <= PAD.l + L.pw) {
    const tt = L.tStart + ((hoverX - PAD.l) / L.pw) * (L.tEnd - L.tStart)
    const i = history.indexAt(tt)
    const c = history.cols
    const x = PAD.l + ((c.t[i] - L.tStart) / Math.max(1e-6, L.tEnd - L.tStart)) * L.pw
    tip = { x, flip: x > L.w * 0.62, t: c.t[i], v: [c.fruit[i], c.blue[i], c.red[i]] }
  }

  return (
    <div className="card chart-card timeline">
      <div className="card-head">
        <div>
          <h3>Garden timeline</h3>
          <p className="sub">Ripe fruit, blue blobs and red blobs, recorded every half second of garden time.</p>
        </div>
        <div className="seg-group">
          <Seg value={scale} onChange={setScale} options={[['counts', 'Counts'], ['root', '√ scale'], ['peak', '% of peak']]} label="Scale" />
          <Seg value={win} onChange={setWin} options={[['all', 'Whole run'], ['recent', 'Last 5 min']]} label="Window" />
        </div>
      </div>
      <div className="chart-box" style={{ height: 230 }}>
        <canvas
          ref={ref}
          className="chart"
          onPointerMove={(e) => setHoverX(e.nativeEvent.offsetX)}
          onPointerLeave={() => setHoverX(null)}
          role="img"
          aria-label="Line chart of fruit, blue and red counts over time"
        />
        {tip && (
          <div className="tip" style={{ left: tip.x, top: PAD.t, transform: tip.flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}>
            <b>{clock(tip.t)}</b>
            {SERIES.map((s, i) => (
              <span key={s.key}>
                <i style={{ background: s.color }} />
                {s.label} <b>{Math.round(tip.v[i])}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function rootTicks(top: number): number[] {
  const cands = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]
  const t = cands.filter((v) => v <= top)
  if (t[t.length - 1] !== top) t.push(top)
  // keep labels from crowding near zero
  return t.filter((v, i) => i === 0 || v === top || Math.sqrt(v / top) - Math.sqrt(t[i - 1] / top) > 0.12 || v >= top * 0.25)
}

export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}
