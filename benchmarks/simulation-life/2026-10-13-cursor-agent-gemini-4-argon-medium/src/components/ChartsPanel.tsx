import React, { useState } from 'react'
import { Activity, GitCommit, Sparkles, TrendingUp } from 'lucide-react'
import { HistoryPoint, SimSummary } from '../sim/types'

interface ChartsPanelProps {
  history: HistoryPoint[]
  summary: SimSummary
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ history, summary }) => {
  const [scaleMode, setScaleMode] = useState<'shared' | 'normalized'>('shared')
  const [secondaryTab, setSecondaryTab] = useState<'phase' | 'traits'>('phase')

  const latest = history[history.length - 1] ?? {
    time: 0,
    fruitCount: 0,
    regrowingFruitCount: 0,
    blueCount: 0,
    redCount: 0,
    avgBlueSpeed: 0,
    avgBlueVision: 0,
    avgRedSpeed: 0,
    avgRedVision: 0,
    avgBlueEnergy: 0,
    avgRedEnergy: 0,
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Narrative Run Summary Banner */}
      <div className="rounded-2xl bg-[#131d19] border border-emerald-900/60 p-3.5 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  Ecological Story Summary
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-800/60 text-emerald-200">
                  t = {latest.time.toFixed(1)}s • {summary.waveCount} wave{summary.waveCount === 1 ? '' : 's'}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-0.5">{summary.headline}</h3>
              <p className="text-xs text-emerald-100/75 mt-0.5 leading-relaxed">{summary.detail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1.5 rounded-xl bg-[#0d1411] border border-lime-500/30 text-lime-300">
              <span className="text-[10px] uppercase text-lime-400/70 block">Peak Fruit</span>
              <span>{summary.peakFruit}</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-xl bg-[#0d1411] border border-sky-500/30 text-sky-300">
              <span className="text-[10px] uppercase text-sky-400/70 block">Peak Blue</span>
              <span>{summary.peakBlue}</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-xl bg-[#0d1411] border border-rose-500/30 text-rose-300">
              <span className="text-[10px] uppercase text-rose-400/70 block">Peak Red</span>
              <span>{summary.peakRed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid: Main Population Timeline + Phase Plot / Trait Evolution */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Main Population Timeline Chart (7 cols) */}
        <div className="xl:col-span-7 rounded-2xl bg-[#131d19] border border-emerald-900/60 p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Population & Fruit Timeline
              </span>
              <div className="flex items-center gap-2 ml-2 text-[11px] font-mono">
                <span className="text-lime-300">🍏 {latest.fruitCount}</span>
                <span className="text-sky-300">🔵 {latest.blueCount}</span>
                <span className="text-rose-300">🔴 {latest.redCount}</span>
              </div>
            </div>

            <div className="flex items-center rounded-lg bg-[#0c1310] p-0.5 border border-emerald-900/60 text-[11px]">
              <button
                type="button"
                onClick={() => setScaleMode('shared')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  scaleMode === 'shared'
                    ? 'bg-emerald-600/30 text-emerald-200 font-medium'
                    : 'text-emerald-200/60 hover:text-white'
                }`}
              >
                Count Scale
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('normalized')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  scaleMode === 'normalized'
                    ? 'bg-emerald-600/30 text-emerald-200 font-medium'
                    : 'text-emerald-200/60 hover:text-white'
                }`}
              >
                Normalized Waves
              </button>
            </div>
          </div>

          <TimelineSvg history={history} scaleMode={scaleMode} />
        </div>

        {/* Secondary Chart: Blue-vs-Red Phase Plot OR Inherited Trait Trends (5 cols) */}
        <div className="xl:col-span-5 rounded-2xl bg-[#131d19] border border-emerald-900/60 p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              {secondaryTab === 'phase' ? (
                <GitCommit className="w-4 h-4 text-sky-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-xs font-semibold text-white">
                {secondaryTab === 'phase' ? 'Blue vs. Red Phase Orbit' : 'Inherited Trait Evolution'}
              </span>
            </div>

            <div className="flex items-center rounded-lg bg-[#0c1310] p-0.5 border border-emerald-900/60 text-[11px]">
              <button
                type="button"
                onClick={() => setSecondaryTab('phase')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  secondaryTab === 'phase'
                    ? 'bg-emerald-600/30 text-emerald-200 font-medium'
                    : 'text-emerald-200/60 hover:text-white'
                }`}
              >
                Phase Plot
              </button>
              <button
                type="button"
                onClick={() => setSecondaryTab('traits')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  secondaryTab === 'traits'
                    ? 'bg-emerald-600/30 text-emerald-200 font-medium'
                    : 'text-emerald-200/60 hover:text-white'
                }`}
              >
                Trait Trends
              </button>
            </div>
          </div>

          {secondaryTab === 'phase' ? (
            <PhasePlotSvg history={history} />
          ) : (
            <TraitTrendsSvg history={history} />
          )}
        </div>
      </div>
    </div>
  )
}

const TimelineSvg: React.FC<{ history: HistoryPoint[]; scaleMode: 'shared' | 'normalized' }> = ({
  history,
  scaleMode,
}) => {
  const w = 520
  const h = 156
  const padL = 34
  const padR = 14
  const padT = 10
  const padB = 22
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const maxFruit = Math.max(10, ...history.map((p) => p.fruitCount))
  const maxBlue = Math.max(10, ...history.map((p) => p.blueCount))
  const maxRed = Math.max(6, ...history.map((p) => p.redCount))
  const sharedMax = Math.max(20, maxFruit, maxBlue, maxRed)

  const buildPath = (getter: (p: HistoryPoint) => number, ownMax: number) => {
    if (history.length === 0) return ''
    return history
      .map((pt, idx) => {
        const x =
          padL +
          (history.length === 1 ? innerW : (idx / (history.length - 1)) * innerW)
        const denom = scaleMode === 'shared' ? sharedMax : ownMax
        const yNorm = Math.min(1, Math.max(0, getter(pt) / Math.max(1, denom)))
        const y = padT + innerH - yNorm * innerH
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  const fruitPath = buildPath((p) => p.fruitCount, maxFruit)
  const bluePath = buildPath((p) => p.blueCount, maxBlue)
  const redPath = buildPath((p) => p.redCount, maxRed)

  const minTime = history[0]?.time ?? 0
  const maxTime = history[history.length - 1]?.time ?? 0

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40 overflow-visible">
      {/* Horizontal grid lines */}
      {[0, 0.5, 1].map((frac) => {
        const y = padT + innerH - frac * innerH
        const label =
          scaleMode === 'shared'
            ? Math.round(frac * sharedMax).toString()
            : `${Math.round(frac * 100)}%`
        return (
          <g key={frac}>
            <line
              x1={padL}
              y1={y}
              x2={w - padR}
              y2={y}
              stroke="rgba(167, 243, 208, 0.08)"
              strokeDasharray="3 3"
            />
            <text
              x={padL - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-emerald-200/50 text-[9px] font-mono"
            >
              {label}
            </text>
          </g>
        )
      })}

      {/* Curves */}
      <path
        d={fruitPath}
        fill="none"
        stroke="#a3e635"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={bluePath}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={redPath}
        fill="none"
        stroke="#fb7185"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Time axis labels */}
      <text x={padL} y={h - 4} className="fill-emerald-200/50 text-[9px] font-mono">
        {minTime.toFixed(0)}s
      </text>
      <text
        x={w - padR}
        y={h - 4}
        textAnchor="end"
        className="fill-emerald-200/50 text-[9px] font-mono"
      >
        {maxTime.toFixed(0)}s
      </text>
    </svg>
  )
}

const PhasePlotSvg: React.FC<{ history: HistoryPoint[] }> = ({ history }) => {
  const w = 340
  const h = 156
  const padL = 32
  const padR = 14
  const padT = 10
  const padB = 24
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const maxBlue = Math.max(25, ...history.map((p) => p.blueCount))
  const maxRed = Math.max(15, ...history.map((p) => p.redCount))

  const points = history.map((pt) => {
    const x = padL + (pt.blueCount / maxBlue) * innerW
    const y = padT + innerH - (pt.redCount / maxRed) * innerH
    return { x, y }
  })

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const startPt = points[0]
  const currentPt = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40 overflow-visible">
      <rect
        x={padL}
        y={padT}
        width={innerW}
        height={innerH}
        rx={6}
        fill="rgba(9, 16, 13, 0.55)"
        stroke="rgba(167, 243, 208, 0.1)"
      />
      <line
        x1={padL}
        y1={padT + innerH / 2}
        x2={w - padR}
        y2={padT + innerH / 2}
        stroke="rgba(167, 243, 208, 0.06)"
        strokeDasharray="3 3"
      />
      <line
        x1={padL + innerW / 2}
        y1={padT}
        x2={padL + innerW / 2}
        y2={padT + innerH}
        stroke="rgba(167, 243, 208, 0.06)"
        strokeDasharray="3 3"
      />

      {pathData && (
        <path
          d={pathData}
          fill="none"
          stroke="url(#phaseGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      <defs>
        <linearGradient id="phaseGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {startPt && (
        <circle
          cx={startPt.x}
          cy={startPt.y}
          r={3}
          fill="#94a3b8"
        />
      )}
      {currentPt && (
        <g>
          <circle cx={currentPt.x} cy={currentPt.y} r={6} fill="rgba(251, 113, 133, 0.28)" />
          <circle cx={currentPt.x} cy={currentPt.y} r={3.5} fill="#fde047" stroke="#0f172a" strokeWidth="1" />
        </g>
      )}

      <text
        x={padL + innerW / 2}
        y={h - 4}
        textAnchor="middle"
        className="fill-sky-300/75 text-[9px] font-mono"
      >
        Blue Blobs (0 → {maxBlue})
      </text>
      <text
        x={10}
        y={padT + innerH / 2}
        textAnchor="middle"
        transform={`rotate(-90 10 ${padT + innerH / 2})`}
        className="fill-rose-300/75 text-[9px] font-mono"
      >
        Red (0 → {maxRed})
      </text>
    </svg>
  )
}

const TraitTrendsSvg: React.FC<{ history: HistoryPoint[] }> = ({ history }) => {
  const w = 340
  const h = 156
  const padL = 30
  const padR = 12
  const padT = 12
  const padB = 22
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const maxSpeed = Math.max(
    75,
    ...history.map((p) => Math.max(p.avgBlueSpeed, p.avgRedSpeed))
  )

  const buildLine = (getter: (p: HistoryPoint) => number) => {
    const valid = history.map((p, i) => ({ val: getter(p), i })).filter((d) => d.val > 0)
    if (valid.length === 0) return ''
    return valid
      .map((d, idx) => {
        const x =
          padL +
          (history.length <= 1 ? innerW : (d.i / (history.length - 1)) * innerW)
        const y = padT + innerH - Math.min(1, d.val / maxSpeed) * innerH
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  const blueSpeedPath = buildLine((p) => p.avgBlueSpeed)
  const redSpeedPath = buildLine((p) => p.avgRedSpeed)
  const latest = history[history.length - 1]

  return (
    <div className="flex flex-col">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36 overflow-visible">
        {[0.3, 0.65, 1].map((frac) => {
          const y = padT + innerH - frac * innerH
          return (
            <g key={frac}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="rgba(167, 243, 208, 0.07)"
                strokeDasharray="3 3"
              />
              <text
                x={padL - 5}
                y={y + 3}
                textAnchor="end"
                className="fill-emerald-200/50 text-[9px] font-mono"
              >
                {Math.round(frac * maxSpeed)}
              </text>
            </g>
          )
        })}

        <path d={blueSpeedPath} fill="none" stroke="#38bdf8" strokeWidth="2.2" />
        <path d={redSpeedPath} fill="none" stroke="#fb7185" strokeWidth="2.2" />
      </svg>
      <div className="flex items-center justify-between text-[10px] font-mono text-emerald-100/75 px-1">
        <span className="text-sky-300">
          Blue Avg: {latest?.avgBlueSpeed ?? 0} u/s • Vis {latest?.avgBlueVision ?? 0}
        </span>
        <span className="text-rose-300">
          Red Avg: {latest?.avgRedSpeed ?? 0} u/s • Vis {latest?.avgRedVision ?? 0}
        </span>
      </div>
    </div>
  )
}
