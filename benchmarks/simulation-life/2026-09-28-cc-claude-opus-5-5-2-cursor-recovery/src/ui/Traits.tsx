import type { History } from '../sim/history.ts'
import { INK, FONT, FONT_BOLD, timeTicks, clock, useCanvas } from './chart.ts'

const PAD = { l: 42, r: 12, t: 12, b: 24 }
const LINES = [
  { key: 'blueSpeed', color: INK.blue, dash: [] as number[], label: 'Blue speed' },
  { key: 'blueVision', color: INK.blue, dash: [5, 4], label: 'Blue vision' },
  { key: 'redSpeed', color: INK.red, dash: [] as number[], label: 'Red speed' },
  { key: 'redVision', color: INK.red, dash: [5, 4], label: 'Red vision' },
] as const

export function Traits({ history, version, mutation }: { history: History; version: number; mutation: number }) {
  const ref = useCanvas(
    (g, w, h) => {
      const c = history.cols
      const n = c.t.length
      const pw = w - PAD.l - PAD.r
      const ph = h - PAD.t - PAD.b
      if (n < 2) return
      let lo = 1
      let hi = 1
      for (const l of LINES) {
        for (const v of c[l.key]) {
          if (!Number.isFinite(v)) continue
          if (v < lo) lo = v
          if (v > hi) hi = v
        }
      }
      const span = Math.max(0.06, hi - lo)
      lo -= span * 0.15
      hi += span * 0.15
      const tEnd = c.t[n - 1]
      const X = (t: number) => PAD.l + (t / Math.max(1e-6, tEnd)) * pw
      const Y = (v: number) => PAD.t + ph - ((v - lo) / (hi - lo)) * ph

      const step = [0.01, 0.02, 0.05, 0.1, 0.2].find((s) => (hi - lo) / s <= 5) ?? 0.5
      g.font = FONT
      g.textAlign = 'right'
      g.textBaseline = 'middle'
      g.lineWidth = 1
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
        const y = Math.round(Y(v)) + 0.5
        g.strokeStyle = Math.abs(v - 1) < 1e-6 ? INK.axis : INK.grid
        if (Math.abs(v - 1) < 1e-6) g.setLineDash([3, 3])
        g.beginPath()
        g.moveTo(PAD.l, y)
        g.lineTo(PAD.l + pw, y)
        g.stroke()
        g.setLineDash([])
        g.fillStyle = INK.muted
        g.fillText(`×${v.toFixed(2)}`, PAD.l - 5, y)
      }
      g.textAlign = 'center'
      g.textBaseline = 'top'
      for (const t of timeTicks(0, tEnd, pw)) g.fillText(clock(t), X(t), PAD.t + ph + 7)

      const stride = Math.max(1, Math.floor(n / (pw * 1.5)))
      for (const l of LINES) {
        const col = c[l.key]
        g.strokeStyle = l.color
        g.lineWidth = 1.8
        g.setLineDash(l.dash)
        g.beginPath()
        let pen = false
        for (let i = 0; i < n; i += stride) {
          const v = col[i]
          if (!Number.isFinite(v)) {
            pen = false
            continue
          }
          if (pen) g.lineTo(X(c.t[i]), Y(v))
          else g.moveTo(X(c.t[i]), Y(v))
          pen = true
        }
        g.stroke()
        g.setLineDash([])
      }
      g.font = FONT_BOLD
      g.fillStyle = INK.muted
      g.textAlign = 'left'
      g.textBaseline = 'top'
      g.fillText('×1.00 = starting average', PAD.l + 4, PAD.t + 2)
    },
    [version],
  )

  const last = (k: (typeof LINES)[number]['key']) => {
    const a = history.cols[k]
    const v = a[a.length - 1]
    return Number.isFinite(v) ? `×${v.toFixed(2)}` : 'gone'
  }

  return (
    <div className="card chart-card">
      <div className="card-head">
        <div>
          <h3>Inherited traits</h3>
          <p className="sub">
            Copies inherit speed and vision with a {Math.round(mutation * 100)}% wobble. The lines show which traits the garden favours.
          </p>
        </div>
      </div>
      <div className="legend">
        {LINES.map((l) => (
          <span key={l.key}>
            <svg width="22" height="8" aria-hidden>
              <line x1="1" y1="4" x2="21" y2="4" stroke={l.color} strokeWidth="2.2" strokeDasharray={l.dash.join(' ')} />
            </svg>
            {l.label} <b>{last(l.key)}</b>
          </span>
        ))}
      </div>
      <div className="chart-box" style={{ height: 170 }}>
        <canvas ref={ref} className="chart" role="img" aria-label="Average inherited speed and vision over time" />
      </div>
    </div>
  )
}
