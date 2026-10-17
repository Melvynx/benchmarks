import React, { useState } from 'react';
import {
  Activity,
  BookOpen,
  GitCommit,
  LineChart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  HistoryPoint,
  RunSummaryAnalysis,
  StoryEvent,
} from '../simulation/types.ts';

interface ChartsPanelProps {
  history: HistoryPoint[];
  summary: RunSummaryAnalysis;
  storyEvents: StoryEvent[];
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({
  history,
  summary,
  storyEvents,
}) => {
  const [scaleMode, setScaleMode] = useState<'normalized' | 'absolute'>(
    'normalized'
  );
  const [activeSecondaryTab, setActiveSecondaryTab] = useState<
    'phase' | 'traits' | 'log'
  >('phase');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const latest = history[history.length - 1] ?? {
    time: 0,
    tick: 0,
    fruit: 0,
    growingFruit: 0,
    blue: 0,
    red: 0,
    avgBlueEnergy: 0,
    avgRedEnergy: 0,
    avgBlueSpeed: 50,
    avgBlueVision: 100,
    avgRedSpeed: 55,
    avgRedVision: 110,
  };

  const inspectedPoint =
    hoverIdx !== null && history[hoverIdx] ? history[hoverIdx] : latest;

  // Compute maxes for readable scaling
  const maxFruit = Math.max(12, ...history.map((p) => p.fruit));
  const maxBlue = Math.max(10, ...history.map((p) => p.blue));
  const maxRed = Math.max(8, ...history.map((p) => p.red));
  const globalMax = Math.max(maxFruit, maxBlue, maxRed, 15);

  // Main chart SVG dimensions
  const W = 540;
  const H = 175;
  const padL = 30;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const getX = (idx: number) => {
    if (history.length <= 1) return padL;
    return padL + (idx / (history.length - 1)) * plotW;
  };

  const getY = (val: number, groupMax: number) => {
    const denom = scaleMode === 'normalized' ? groupMax : globalMax;
    const ratio = Math.min(1, Math.max(0, val / Math.max(1, denom)));
    return padT + plotH - ratio * plotH;
  };

  const buildPath = (
    extractor: (p: HistoryPoint) => number,
    groupMax: number
  ) => {
    if (history.length === 0) return '';
    return history
      .map((p, i) => {
        const x = getX(i).toFixed(1);
        const y = getY(extractor(p), groupMax).toFixed(1);
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');
  };

  const buildArea = (
    extractor: (p: HistoryPoint) => number,
    groupMax: number
  ) => {
    if (history.length <= 1) return '';
    const line = buildPath(extractor, groupMax);
    const lastX = getX(history.length - 1).toFixed(1);
    const firstX = getX(0).toFixed(1);
    const baseY = (padT + plotH).toFixed(1);
    return `${line} L${lastX},${baseY} L${firstX},${baseY} Z`;
  };

  const fruitPath = buildPath((p) => p.fruit, maxFruit * 1.08);
  const bluePath = buildPath((p) => p.blue, maxBlue * 1.08);
  const redPath = buildPath((p) => p.red, maxRed * 1.08);

  const badgeColors: Record<RunSummaryAnalysis['badgeTone'], string> = {
    emerald: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    blue: 'bg-blue-100 text-blue-900 border-blue-300',
    rose: 'bg-rose-100 text-rose-900 border-rose-300',
    amber: 'bg-amber-100 text-amber-900 border-amber-300',
    slate: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Main Population Timeline Chart (Fruit, Blue Blobs, Red Blobs together) */}
      <div className="bg-white/95 backdrop-blur-sm border border-[#E5DEC9] rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-[#1F2924]">
              Population Waves Timeline
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-[#F4F0E6] p-0.5 rounded-lg border border-[#E5DEC9]">
            <button
              type="button"
              onClick={() => setScaleMode('normalized')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                scaleMode === 'normalized'
                  ? 'bg-white text-[#1F2924] shadow-sm'
                  : 'text-[#68766E] hover:text-[#1F2924]'
              }`}
              title="Scales each group to its run range so all three waves are clearly visible together"
            >
              Relative Waves
            </button>
            <button
              type="button"
              onClick={() => setScaleMode('absolute')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                scaleMode === 'absolute'
                  ? 'bg-white text-[#1F2924] shadow-sm'
                  : 'text-[#68766E] hover:text-[#1F2924]'
              }`}
              title="Shows raw counts on a single shared axis"
            >
              Raw Counts
            </button>
          </div>
        </div>

        {/* Live Readout Strip */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5 text-xs bg-[#F9F7F2] border border-[#EBE5D5] rounded-xl px-3 py-1.5">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#68766E] block">
              Time
            </span>
            <span className="font-mono font-bold text-[#1F2924]">
              {inspectedPoint.time.toFixed(1)}s
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Fruit
            </span>
            <span className="font-mono font-bold text-emerald-800">
              {inspectedPoint.fruit}{' '}
              <span className="text-[10px] font-normal text-[#68766E]">
                / {summary.peakFruit} pk
              </span>
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Blue
            </span>
            <span className="font-mono font-bold text-blue-800">
              {inspectedPoint.blue}{' '}
              <span className="text-[10px] font-normal text-[#68766E]">
                / {summary.peakBlue} pk
              </span>
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              Red
            </span>
            <span className="font-mono font-bold text-rose-800">
              {inspectedPoint.red}{' '}
              <span className="text-[10px] font-normal text-[#68766E]">
                / {summary.peakRed} pk
              </span>
            </span>
          </div>
        </div>

        {/* SVG Timeline Chart */}
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-40 overflow-visible select-none"
            onMouseMove={(e) => {
              if (history.length <= 1) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const relX =
                ((e.clientX - rect.left) / rect.width) * W - padL;
              const ratio = Math.max(0, Math.min(1, relX / plotW));
              setHoverIdx(Math.round(ratio * (history.length - 1)));
            }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="fruitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="redFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E11D48" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
              const y = padT + frac * plotH;
              const labelVal =
                scaleMode === 'normalized'
                  ? `${Math.round((1 - frac) * 100)}%`
                  : `${Math.round((1 - frac) * globalMax)}`;
              return (
                <g key={idx}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={W - padR}
                    y2={y}
                    stroke="#EAE3D2"
                    strokeDasharray={frac === 1 ? undefined : '3 3'}
                    strokeWidth="1"
                  />
                  {idx % 2 === 0 && (
                    <text
                      x={padL - 5}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-[#7A877F] text-[9px] font-mono"
                    >
                      {labelVal}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Area fills */}
            {history.length > 1 && (
              <>
                <path
                  d={buildArea((p) => p.fruit, maxFruit * 1.08)}
                  fill="url(#fruitFill)"
                />
                <path
                  d={buildArea((p) => p.blue, maxBlue * 1.08)}
                  fill="url(#blueFill)"
                />
                <path
                  d={buildArea((p) => p.red, maxRed * 1.08)}
                  fill="url(#redFill)"
                />
              </>
            )}

            {/* Fruit, Blue, and Red Curves */}
            <path
              d={fruitPath}
              fill="none"
              stroke="#16A34A"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={bluePath}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={redPath}
              fill="none"
              stroke="#E11D48"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* End / Hover dots */}
            {history.length > 0 &&
              (() => {
                const idx =
                  hoverIdx !== null ? hoverIdx : history.length - 1;
                const pt = history[idx];
                if (!pt) return null;
                const cx = getX(idx);
                const fy = getY(pt.fruit, maxFruit * 1.08);
                const by = getY(pt.blue, maxBlue * 1.08);
                const ry = getY(pt.red, maxRed * 1.08);

                return (
                  <g>
                    {hoverIdx !== null && (
                      <line
                        x1={cx}
                        y1={padT}
                        x2={cx}
                        y2={padT + plotH}
                        stroke="#68766E"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={fy}
                      r="4"
                      fill="#16A34A"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={cx}
                      cy={by}
                      r="4.5"
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={cx}
                      cy={ry}
                      r="4.5"
                      fill="#E11D48"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })()}

            {/* Time axis labels */}
            {history.length > 1 && (
              <>
                <text
                  x={padL}
                  y={H - 5}
                  className="fill-[#7A877F] text-[9px] font-mono"
                >
                  {history[0].time.toFixed(0)}s
                </text>
                <text
                  x={padL + plotW * 0.5}
                  y={H - 5}
                  textAnchor="middle"
                  className="fill-[#7A877F] text-[9px] font-mono"
                >
                  {history[Math.floor(history.length / 2)].time.toFixed(0)}s
                </text>
                <text
                  x={W - padR}
                  y={H - 5}
                  textAnchor="end"
                  className="fill-[#7A877F] text-[9px] font-mono"
                >
                  {latest.time.toFixed(0)}s
                </text>
              </>
            )}
          </svg>
        </div>
      </div>

      {/* 2. Run Summary Narrative Card */}
      <div className="bg-white/95 backdrop-blur-sm border border-[#E5DEC9] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-[#1F2924]">
              Story of What Happened
            </h2>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              badgeColors[summary.badgeTone]
            }`}
          >
            {summary.badgeText}
          </span>
        </div>

        <p className="text-xs font-bold text-[#1F2924] mb-1">
          {summary.headline}
        </p>
        <p className="text-xs text-[#55635B] leading-relaxed mb-2.5">
          {summary.narrative}
        </p>

        <ul className="space-y-1 border-t border-[#EFEAD8] pt-2">
          {summary.bullets.map((b, idx) => (
            <li
              key={idx}
              className="text-[11px] text-[#334139] flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Secondary Views: Blue-vs-Red Phase Plot, Trait Trends & Event Log */}
      <div className="bg-white/95 backdrop-blur-sm border border-[#E5DEC9] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1 bg-[#F4F0E6] p-0.5 rounded-lg border border-[#E5DEC9] w-full">
            <button
              type="button"
              onClick={() => setActiveSecondaryTab('phase')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs font-semibold transition ${
                activeSecondaryTab === 'phase'
                  ? 'bg-white text-[#1F2924] shadow-sm'
                  : 'text-[#68766E] hover:text-[#1F2924]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Phase Plot
            </button>
            <button
              type="button"
              onClick={() => setActiveSecondaryTab('traits')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs font-semibold transition ${
                activeSecondaryTab === 'traits'
                  ? 'bg-white text-[#1F2924] shadow-sm'
                  : 'text-[#68766E] hover:text-[#1F2924]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              Trait Trends
            </button>
            <button
              type="button"
              onClick={() => setActiveSecondaryTab('log')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs font-semibold transition ${
                activeSecondaryTab === 'log'
                  ? 'bg-white text-[#1F2924] shadow-sm'
                  : 'text-[#68766E] hover:text-[#1F2924]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Events
            </button>
          </div>
        </div>

        {activeSecondaryTab === 'phase' && (
          <PhasePlotView history={history} maxBlue={maxBlue} maxRed={maxRed} />
        )}

        {activeSecondaryTab === 'traits' && (
          <TraitTrendsView history={history} />
        )}

        {activeSecondaryTab === 'log' && (
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {storyEvents.map((ev) => (
              <div
                key={ev.id}
                className="text-xs bg-[#F9F7F2] border border-[#EBE5D5] rounded-xl px-2.5 py-1.5 flex items-start gap-2"
              >
                <span className="font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                  {ev.time.toFixed(0)}s
                </span>
                <span className="text-[#334139] text-[11px] leading-snug">
                  {ev.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PhasePlotView: React.FC<{
  history: HistoryPoint[];
  maxBlue: number;
  maxRed: number;
}> = ({ history, maxBlue, maxRed }) => {
  const W = 320;
  const H = 155;
  const padL = 32;
  const padR = 16;
  const padT = 12;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xMax = Math.max(15, maxBlue * 1.12);
  const yMax = Math.max(10, maxRed * 1.15);

  const toX = (blue: number) => padL + (blue / xMax) * plotW;
  const toY = (red: number) => padT + plotH - (red / yMax) * plotH;

  // Use recent 160 points so the phase orbit loop is clean and easy to read
  const tail = history.slice(-160);
  const pathStr = tail
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.blue).toFixed(1)},${toY(p.red).toFixed(1)}`)
    .join(' ');

  const startPt = tail[0];
  const currPt = tail[tail.length - 1];

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-[#55635B] mb-1">
        <span>Blue vs. Red Phase Portrait (Counter-clockwise wave loops)</span>
        <span className="font-mono text-[#1F2924] font-semibold">
          ({currPt?.blue ?? 0}B, {currPt?.red ?? 0}R)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36 overflow-visible">
        {/* Grid box */}
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          fill="#F9F7F2"
          stroke="#E5DEC9"
          rx="6"
        />
        <line
          x1={padL}
          y1={padT + plotH * 0.5}
          x2={padL + plotW}
          y2={padT + plotH * 0.5}
          stroke="#EAE3D2"
          strokeDasharray="3 3"
        />
        <line
          x1={padL + plotW * 0.5}
          y1={padT}
          x2={padL + plotW * 0.5}
          y2={padT + plotH}
          stroke="#EAE3D2"
          strokeDasharray="3 3"
        />

        {/* Phase orbit path */}
        {tail.length > 1 && (
          <path
            d={pathStr}
            fill="none"
            stroke="#6366F1"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        )}

        {/* Start and Now markers */}
        {startPt && (
          <circle
            cx={toX(startPt.blue)}
            cy={toY(startPt.red)}
            r="3.5"
            fill="#94A3B8"
            stroke="#FFFFFF"
            strokeWidth="1"
          />
        )}
        {currPt && (
          <circle
            cx={toX(currPt.blue)}
            cy={toY(currPt.red)}
            r="5.5"
            fill="#4F46E5"
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />
        )}

        {/* Axis labels */}
        <text
          x={padL + plotW * 0.5}
          y={H - 4}
          textAnchor="middle"
          className="fill-blue-700 text-[10px] font-semibold"
        >
          Blue Blobs (0 → {Math.round(xMax)})
        </text>
        <text
          x={10}
          y={padT + plotH * 0.5}
          textAnchor="middle"
          transform={`rotate(-90, 10, ${padT + plotH * 0.5})`}
          className="fill-rose-700 text-[10px] font-semibold"
        >
          Red (0 → {Math.round(yMax)})
        </text>
      </svg>
    </div>
  );
};

const TraitTrendsView: React.FC<{ history: HistoryPoint[] }> = ({
  history,
}) => {
  const W = 320;
  const H = 150;
  const padL = 28;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const latest = history[history.length - 1];
  const allSpeeds = history.flatMap((p) => [p.avgBlueSpeed, p.avgRedSpeed]);
  const minSpd = Math.max(10, Math.min(...allSpeeds, 40) * 0.88);
  const maxSpd = Math.max(...allSpeeds, 75) * 1.08;

  const getX = (i: number) =>
    history.length <= 1 ? padL : padL + (i / (history.length - 1)) * plotW;
  const getY = (val: number) =>
    padT +
    plotH -
    ((val - minSpd) / Math.max(1, maxSpd - minSpd)) * plotH;

  const blueSpdPath = history
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(p.avgBlueSpeed).toFixed(1)}`)
    .join(' ');
  const redSpdPath = history
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(p.avgRedSpeed).toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-[#55635B]">Inherited Speed & Vision Evolution</span>
        {latest && (
          <span className="font-mono text-[10px] text-[#334139]">
            Blue: <b>{latest.avgBlueSpeed.toFixed(0)}</b> u/s ({latest.avgBlueVision.toFixed(0)} vis) • Red:{' '}
            <b>{latest.avgRedSpeed.toFixed(0)}</b> u/s ({latest.avgRedVision.toFixed(0)} vis)
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-34 overflow-visible">
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          fill="#F9F7F2"
          stroke="#E5DEC9"
          rx="6"
        />
        {history.length > 1 && (
          <>
            <path
              d={blueSpdPath}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.2"
            />
            <path
              d={redSpdPath}
              fill="none"
              stroke="#E11D48"
              strokeWidth="2.2"
            />
          </>
        )}
        <text
          x={padL + 6}
          y={padT + 13}
          className="fill-blue-700 text-[9px] font-semibold"
        >
          — Avg Blue Speed
        </text>
        <text
          x={padL + 95}
          y={padT + 13}
          className="fill-rose-700 text-[9px] font-semibold"
        >
          — Avg Red Speed
        </text>
      </svg>
    </div>
  );
};
