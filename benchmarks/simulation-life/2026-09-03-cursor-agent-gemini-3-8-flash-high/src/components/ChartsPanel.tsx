import React, { useEffect, useRef, useState } from 'react';
import {
  TrendingUp,
  CircleDot,
  Dna,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { HistoryPoint, SimulationConfig } from '../types/simulation';
import { generateNarrative } from '../simulation/narrative';

interface ChartsPanelProps {
  history: HistoryPoint[];
  config: SimulationConfig;
  elapsedTime: number;
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({
  history,
  config,
  elapsedTime,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'phase' | 'traits' | 'story'>('timeline');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const timelineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const traitsCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const narrative = generateNarrative(history, config, elapsedTime);

  // 1. Draw Timeline Chart
  useEffect(() => {
    if (activeTab !== 'timeline' || isMinimized) return;
    const canvas = timelineCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (history.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Recording population dynamics...', width / 2, height / 2);
      return;
    }

    const padding = { top: 20, right: 24, bottom: 28, left: 38 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Find max for scaling
    let maxVal = 10;
    for (const pt of history) {
      if (pt.fruitCount > maxVal) maxVal = pt.fruitCount;
      if (pt.blueCount > maxVal) maxVal = pt.blueCount;
      if (pt.redCount > maxVal) maxVal = pt.redCount;
    }
    maxVal = Math.ceil((maxVal * 1.15) / 10) * 10;

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = Math.round((maxVal / ySteps) * i);
      const y = padding.top + chartH - (i / ySteps) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(yVal.toString(), padding.left - 6, y + 3);
    }

    // Time X axis labels
    const tStart = history[0].time;
    const tEnd = history[history.length - 1].time;
    ctx.textAlign = 'center';
    ctx.fillText(`${tStart.toFixed(0)}s`, padding.left, height - 10);
    ctx.fillText(`${((tStart + tEnd) / 2).toFixed(0)}s`, padding.left + chartW / 2, height - 10);
    ctx.fillText(`${tEnd.toFixed(0)}s`, width - padding.right, height - 10);

    const getX = (idx: number) => padding.left + (idx / (history.length - 1)) * chartW;
    const getY = (val: number) => padding.top + chartH - (val / maxVal) * chartH;

    // Draw Line helper
    const drawLine = (
      accessor: (pt: HistoryPoint) => number,
      color: string,
      fillColor: string,
      lineWidth = 2
    ) => {
      // Area fill
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(accessor(history[0])));
      for (let i = 1; i < history.length; i++) {
        ctx.lineTo(getX(i), getY(accessor(history[i])));
      }
      ctx.lineTo(getX(history.length - 1), padding.top + chartH);
      ctx.lineTo(getX(0), padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Stroke line
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(accessor(history[0])));
      for (let i = 1; i < history.length; i++) {
        ctx.lineTo(getX(i), getY(accessor(history[i])));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    // Draw curves: Fruit (Green), Blue Blobs (Sky), Red Blobs (Rose)
    drawLine((p) => p.fruitCount, '#4ade80', 'rgba(74, 222, 128, 0.08)', 2);
    drawLine((p) => p.blueCount, '#38bdf8', 'rgba(56, 189, 248, 0.12)', 2.2);
    drawLine((p) => p.redCount, '#f43f5e', 'rgba(244, 63, 94, 0.14)', 2.2);

    // Hover tooltip line
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < history.length) {
      const hx = getX(hoverIndex);
      ctx.beginPath();
      ctx.moveTo(hx, padding.top);
      ctx.lineTo(hx, padding.top + chartH);
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      const pt = history[hoverIndex];
      // Draw indicator dots
      const dots = [
        { y: getY(pt.fruitCount), color: '#4ade80' },
        { y: getY(pt.blueCount), color: '#38bdf8' },
        { y: getY(pt.redCount), color: '#f43f5e' },
      ];
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(hx, d.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }, [history, activeTab, isMinimized, hoverIndex]);

  // 2. Draw Phase Plot (Blue vs Red)
  useEffect(() => {
    if (activeTab !== 'phase' || isMinimized) return;
    const canvas = phaseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (history.length < 3) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Tracing predator-prey phase orbit...', width / 2, height / 2);
      return;
    }

    const padding = { top: 24, right: 30, bottom: 32, left: 42 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    let maxBlue = 10;
    let maxRed = 10;
    for (const pt of history) {
      if (pt.blueCount > maxBlue) maxBlue = pt.blueCount;
      if (pt.redCount > maxRed) maxRed = pt.redCount;
    }
    maxBlue = Math.ceil((maxBlue * 1.2) / 5) * 5;
    maxRed = Math.ceil((maxRed * 1.2) / 5) * 5;

    // Grid lines & Axis labels
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';

    // Y Axis (Red Predators)
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round((maxRed / 4) * i);
      const y = padding.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(val.toString(), padding.left - 6, y + 3);
    }

    // X Axis (Blue Foragers)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round((maxBlue / 4) * i);
      const x = padding.left + (i / 4) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();
      ctx.fillText(val.toString(), x, height - 12);
    }

    // Axis Titles
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Blue Blobs (Prey) →', padding.left + chartW / 2, height - 2);

    ctx.save();
    ctx.translate(14, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('Red Blobs (Predators) →', 0, 0);
    ctx.restore();

    const getX = (b: number) => padding.left + (b / maxBlue) * chartW;
    const getY = (r: number) => padding.top + chartH - (r / maxRed) * chartH;

    // Draw Phase Trajectory Loop
    ctx.beginPath();
    ctx.moveTo(getX(history[0].blueCount), getY(history[0].redCount));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(history[i].blueCount), getY(history[i].redCount));
    }
    // Gradient along trajectory
    const grad = ctx.createLinearGradient(padding.left, padding.top, width, height);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#a855f7');
    grad.addColorStop(1, '#f43f5e');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Mark current position with pulsing beacon
    const latest = history[history.length - 1];
    const curX = getX(latest.blueCount);
    const curY = getY(latest.redCount);

    ctx.beginPath();
    ctx.arc(curX, curY, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(curX, curY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [history, activeTab, isMinimized]);

  // 3. Draw Trait Evolution Canvas
  useEffect(() => {
    if (activeTab !== 'traits' || isMinimized) return;
    const canvas = traitsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (history.length < 2) return;

    const padding = { top: 20, right: 24, bottom: 28, left: 38 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Fixed trait bounds (0.6 to 1.6 multiplier)
    const minTrait = 0.7;
    const maxTrait = 1.4;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 3; i++) {
      const val = minTrait + ((maxTrait - minTrait) / 3) * i;
      const y = padding.top + chartH - (i / 3) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${val.toFixed(2)}x`, padding.left - 6, y + 3);
    }

    const getX = (idx: number) => padding.left + (idx / (history.length - 1)) * chartW;
    const getY = (val: number) => padding.top + chartH - ((val - minTrait) / (maxTrait - minTrait)) * chartH;

    // Draw Blue Speed trait curve
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(history[0].avgBlueSpeed));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].avgBlueSpeed));
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Red Speed trait curve
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(history[0].avgRedSpeed));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].avgRedSpeed));
    }
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [history, activeTab, isMinimized]);

  // Handle canvas mouse move for hover tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = timelineCanvasRef.current;
    if (!canvas || history.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 38;
    const paddingRight = 24;
    const chartW = rect.width - paddingLeft - paddingRight;
    const ratio = Math.max(0, Math.min(1, (x - paddingLeft) / chartW));
    const idx = Math.round(ratio * (history.length - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const latest = history[history.length - 1] || {
    fruitCount: 0,
    blueCount: 0,
    redCount: 0,
    time: 0,
  };

  return (
    <section
      className={`absolute bottom-4 right-4 z-20 flex flex-col bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all text-slate-200 ${
        isMinimized
          ? 'w-72 h-12'
          : isExpanded
          ? 'w-[calc(100vw-2rem)] sm:w-[580px] h-96'
          : 'w-[calc(100vw-2rem)] sm:w-[460px] h-72'
      }`}
    >
      {/* Panel Top Header Bar */}
      <div className="h-11 px-3.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-display font-bold">Living Garden Story & Analytics</h3>
        </div>

        <div className="flex items-center gap-1">
          {/* Narrative status badge */}
          <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-emerald-300">
            {narrative.badge}
          </span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
            title={isExpanded ? 'Restore size' : 'Expand chart'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
            title={isMinimized ? 'Expand panel' : 'Minimize panel'}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Subheader Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-2 py-1 bg-slate-950/20 shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === 'timeline'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Timeline</span>
              </button>

              <button
                onClick={() => setActiveTab('phase')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === 'phase'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <CircleDot className="w-3 h-3" />
                <span>Phase Orbit</span>
              </button>

              <button
                onClick={() => setActiveTab('traits')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === 'traits'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Dna className="w-3 h-3" />
                <span>Traits</span>
              </button>

              <button
                onClick={() => setActiveTab('story')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === 'story'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Run Story</span>
              </button>
            </div>

            {/* Quick Live Pill Legend */}
            {activeTab === 'timeline' && (
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {hoverIndex !== null ? history[hoverIndex].fruitCount : latest.fruitCount} Fruit
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  {hoverIndex !== null ? history[hoverIndex].blueCount : latest.blueCount} Blue
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  {hoverIndex !== null ? history[hoverIndex].redCount : latest.redCount} Red
                </span>
              </div>
            )}
          </div>

          {/* Tab Views */}
          <div className="flex-1 relative overflow-hidden bg-slate-950/30 p-2">
            {activeTab === 'timeline' && (
              <canvas
                ref={timelineCanvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full h-full cursor-crosshair"
              />
            )}

            {activeTab === 'phase' && (
              <canvas
                ref={phaseCanvasRef}
                className="w-full h-full"
              />
            )}

            {activeTab === 'traits' && (
              <div className="w-full h-full flex flex-col">
                <div className="flex items-center justify-between px-2 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-sky-400">
                    <span className="w-2 h-0.5 bg-sky-400" /> Avg Blue Speed
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-0.5 bg-rose-400" /> Avg Red Speed
                  </span>
                </div>
                <canvas
                  ref={traitsCanvasRef}
                  className="w-full flex-1"
                />
              </div>
            )}

            {activeTab === 'story' && (
              <div className="w-full h-full overflow-y-auto p-2 space-y-2.5 text-slate-200">
                {/* Headline Card */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                      {narrative.phase}
                    </span>
                    <span className="text-xs font-bold text-slate-100 font-display">
                      {narrative.headline}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">
                    {narrative.detail}
                  </p>
                </div>

                {/* Ecological Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                    <div className="text-[10px] text-slate-400 font-mono">Stability</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      {narrative.stabilityScore}%
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                    <div className="text-[10px] text-slate-400 font-mono">Waves Detected</div>
                    <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                      {narrative.cycleEstimate}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                    <div className="text-[10px] text-slate-400 font-mono">Total Births</div>
                    <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">
                      {latest.totalBirths ?? 0}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                    <div className="text-[10px] text-slate-400 font-mono">Total Deaths</div>
                    <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
                      {latest.totalDeaths ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};
