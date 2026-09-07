import { useMemo } from 'react'
import type { Sample } from '../../sim/history'
import { seriesColor, type Mode } from '../../theme'

type Props = { samples: Sample[]; samplesVersion: number; mode: Mode; height?: number }

const PAD = { top: 12, right: 14, bottom: 30, left: 40 }

/**
 * Blue against red, with time as the path rather than an axis. Loops here mean
 * the two groups are chasing each other round; a drift into a corner means the
 * garden is settling.
 */
export function PhasePlot({ samples, samplesVersion, mode, height = 200 }: Props) {
  const w = 320
  const h = height
  const innerW = w - PAD.left - PAD.right
  const innerH = h - PAD.top - PAD.bottom

  const { path, dots, maxB, maxR } = useMemo(() => {
    const maxB = Math.max(1, ...samples.map((s) => s.blue))
    const maxR = Math.max(1, ...samples.map((s) => s.red))
    const px = (v: number) => PAD.left + (v / maxB) * innerW
    const py = (v: number) => PAD.top + innerH - (v / maxR) * innerH
    let path = ''
    for (let i = 0; i < samples.length; i++) {
      path += `${i ? 'L' : 'M'}${px(samples[i].blue).toFixed(1)} ${py(samples[i].red).toFixed(1)}`
    }
    const last = samples[samples.length - 1]
    const dots = last ? [{ x: px(last.blue), y: py(last.red) }] : []
    return { path, dots, maxB, maxR }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- samples is appended in place; samplesVersion is the real signal.
  }, [samples, samplesVersion, innerW, innerH])

  const blue = seriesColor('blue', mode)
  const red = seriesColor('red', mode)

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Blue population against red population">
      <line className="grid" x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} />
      <line className="grid" x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + innerH} />
      <text className="axis" x={PAD.left} y={h - 16} textAnchor="start">
        0
      </text>
      <text className="axis" x={PAD.left + innerW} y={h - 16} textAnchor="end">
        {Math.round(maxB)}
      </text>
      <text className="axis axis-title" x={PAD.left + innerW / 2} y={h - 4} textAnchor="middle" fill={blue}>
        Blue →
      </text>
      <text className="axis" x={PAD.left - 6} y={PAD.top + 6} textAnchor="end">
        {Math.round(maxR)}
      </text>
      <text
        className="axis axis-title"
        x={12}
        y={PAD.top + innerH / 2}
        textAnchor="middle"
        fill={red}
        transform={`rotate(-90 12 ${PAD.top + innerH / 2})`}
      >
        Red →
      </text>
      <path d={path} fill="none" stroke={blue} strokeOpacity={0.28} strokeWidth={1.5} strokeLinejoin="round" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={5} fill={red} stroke="var(--surface)" strokeWidth={2} />
      ))}
    </svg>
  )
}
