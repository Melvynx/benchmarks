import type { History } from '../sim/history.ts'
import { INK, FONT, FONT_BOLD, niceTicks, useCanvas } from './chart.ts'

const PAD = { l: 38, r: 12, t: 12, b: 32 }
const SMOOTH_SEC = 8

/** Centred moving average; the window shrinks at the ends so the path still starts and ends on real samples. */
function smoothed(v: number[], half: number): number[] {
  const n = v.length
  const pre = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + v[i]
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const h = Math.min(half, i, n - 1 - i)
    out[i] = (pre[i + h + 1] - pre[i - h]) / (2 * h + 1)
  }
  return out
}

export function PhasePlot({ history, version, loops }: { history: History; version: number; loops: number }) {
  const ref = useCanvas(
    (g, w, h) => {
      const { t } = history.cols
      const n = t.length
      const dtS = n > 1 ? (t[n - 1] - t[0]) / (n - 1) : 1
      const half = Math.max(0, Math.round(SMOOTH_SEC / 2 / dtS))
      const blue = smoothed(history.cols.blue, half)
      const red = smoothed(history.cols.red, half)
      const pw = w - PAD.l - PAD.r
      const ph = h - PAD.t - PAD.b
      let mb = 1
      let mr = 1
      for (let i = 0; i < n; i++) {
        if (blue[i] > mb) mb = blue[i]
        if (red[i] > mr) mr = red[i]
      }
      const xt = niceTicks(mb, 4)
      const yt = niceTicks(mr, 4)
      const xMax = xt[xt.length - 1]
      const yMax = yt[yt.length - 1]
      const X = (v: number) => PAD.l + (v / xMax) * pw
      const Y = (v: number) => PAD.t + ph - (v / yMax) * ph

      g.font = FONT
      g.lineWidth = 1
      g.textAlign = 'right'
      g.textBaseline = 'middle'
      for (const v of yt) {
        g.strokeStyle = v === 0 ? INK.axis : INK.grid
        g.beginPath()
        g.moveTo(PAD.l, Math.round(Y(v)) + 0.5)
        g.lineTo(PAD.l + pw, Math.round(Y(v)) + 0.5)
        g.stroke()
        g.fillStyle = INK.muted
        g.fillText(String(v), PAD.l - 6, Y(v))
      }
      g.textAlign = 'center'
      g.textBaseline = 'top'
      for (const v of xt) {
        g.strokeStyle = v === 0 ? INK.axis : INK.grid
        g.beginPath()
        g.moveTo(Math.round(X(v)) + 0.5, PAD.t)
        g.lineTo(Math.round(X(v)) + 0.5, PAD.t + ph)
        g.stroke()
        g.fillStyle = INK.muted
        g.fillText(String(v), X(v), PAD.t + ph + 5)
      }
      g.font = FONT_BOLD
      g.fillStyle = INK.blue
      g.textAlign = 'right'
      g.fillText('Blue blobs →', PAD.l + pw, PAD.t + ph + 18)
      g.save()
      g.translate(11, PAD.t)
      g.rotate(-Math.PI / 2)
      g.textAlign = 'right'
      g.textBaseline = 'middle'
      g.fillStyle = INK.red
      g.fillText('Red blobs →', 0, 0)
      g.restore()

      if (n < 2) return
      // older path fades out so the current loop stands out
      const stride = Math.max(1, Math.floor(n / 1500))
      const chunks = 40
      const per = Math.max(1, Math.ceil(n / chunks))
      g.lineJoin = 'round'
      g.lineCap = 'round'
      for (let c = 0; c * per < n - 1; c++) {
        const a = c * per
        const b = Math.min(n - 1, a + per)
        const k = (b / (n - 1)) ** 1.6
        g.strokeStyle = `rgba(74, 64, 96, ${0.1 + 0.8 * k})`
        g.lineWidth = 1 + k * 1.4
        g.beginPath()
        g.moveTo(X(blue[a]), Y(red[a]))
        for (let i = a + stride; i <= b; i += stride) g.lineTo(X(blue[i]), Y(red[i]))
        g.lineTo(X(blue[b]), Y(red[b]))
        g.stroke()
      }
      // direction arrows along the recent part
      const recent = Math.max(0, n - Math.min(n, 600))
      for (let k = 1; k <= 3; k++) {
        const i = recent + Math.floor(((n - 1 - recent) * k) / 4)
        const j = Math.min(n - 1, i + 8)
        const dx = X(blue[j]) - X(blue[i])
        const dy = Y(red[j]) - Y(red[i])
        const len = Math.hypot(dx, dy)
        if (len < 3) continue
        const ux = dx / len
        const uy = dy / len
        const px = X(blue[j])
        const py = Y(red[j])
        g.fillStyle = 'rgba(74, 64, 96, 0.9)'
        g.beginPath()
        g.moveTo(px + ux * 5, py + uy * 5)
        g.lineTo(px - ux * 4 - uy * 4, py - uy * 4 + ux * 4)
        g.lineTo(px - ux * 4 + uy * 4, py - uy * 4 - ux * 4)
        g.closePath()
        g.fill()
      }
      // start + now
      g.strokeStyle = INK.muted
      g.lineWidth = 1.5
      g.beginPath()
      g.arc(X(blue[0]), Y(red[0]), 4, 0, Math.PI * 2)
      g.stroke()
      g.font = FONT
      g.fillStyle = INK.muted
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      g.fillText('start', X(blue[0]) + 7, Y(red[0]))
      const nx = X(blue[n - 1])
      const ny = Y(red[n - 1])
      g.fillStyle = '#fff'
      g.strokeStyle = INK.text
      g.lineWidth = 2
      g.beginPath()
      g.arc(nx, ny, 5.5, 0, Math.PI * 2)
      g.fill()
      g.stroke()
      g.fillStyle = INK.text
      g.font = FONT_BOLD
      g.textAlign = nx > PAD.l + pw - 40 ? 'right' : 'left'
      g.fillText('now', nx + (g.textAlign === 'right' ? -9 : 9), ny - 9)
    },
    [version],
  )

  const loopText = loops >= 1 ? `${Math.floor(loops)} counter-clockwise loop${Math.floor(loops) === 1 ? '' : 's'} so far` : 'no full loop yet'
  return (
    <div className="card chart-card">
      <div className="card-head">
        <div>
          <h3>Blue vs red</h3>
          <p className="sub">Each point is one moment ({SMOOTH_SEC}s average). Counter-clockwise loops mean red trails blue: {loopText}.</p>
        </div>
      </div>
      <div className="chart-box" style={{ height: 220 }}>
        <canvas ref={ref} className="chart" role="img" aria-label="Phase plot of red blob count against blue blob count" />
      </div>
    </div>
  )
}
