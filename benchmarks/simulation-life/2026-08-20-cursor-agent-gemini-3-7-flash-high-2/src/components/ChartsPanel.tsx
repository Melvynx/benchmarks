import React, { useEffect, useRef, useState } from 'react';
import {
  TrendingUp,
  CircleDot,
  Flame,
  Apple,
  Compass,
  Sparkles,
  BarChart3,
  Dna,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { HistoryPoint } from '../types/simulation';
import { analyzeEcosystemStory, EcosystemStory } from '../simulation/narrative';

interface ChartsPanelProps {
  history: HistoryPoint[];
}

type ChartViewMode = 'timeline' | 'phase' | 'traits' | 'story';

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ history }) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('timeline');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const timelineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const traitsCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoveredPoint, setHoveredPoint] = useState<HistoryPoint | null>(null);
  const story: EcosystemStory = analyzeEcosystemStory(history);

  // 1. Draw Main Timeline Chart
  useEffect(() => {
    if (viewMode !== 'timeline' || isCollapsed) return;
    const canvas = timelineCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (history.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Figtree", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Gathering ecology data...', width / 2, height / 2);
      return;
    }

    // Determine max Y across all 3 series with headroom
    let maxY = 10;
    for (const pt of history) {
      if (pt.fruitCount > maxY) maxY = pt.fruitCount;
      if (pt.blueCount > maxY) maxY = pt.blueCount;
      if (pt.redCount > maxY) maxY = pt.redCount;
    }
    maxY = Math.ceil(maxY * 1.2 / 10) * 10;

    const padding = { top: 20, right: 15, bottom: 25, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Grid lines & Y axis labels
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = Math.round((maxY / ySteps) * i);
      const y = padding.top + chartH - (i / ySteps) * chartH;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`${val}`, padding.left - 6, y + 3);
    }

    // Helper to compute (x, y)
    const getX = (index: number) => padding.left + (index / (history.length - 1)) * chartW;
    const getY = (val: number) => padding.top + chartH - (val / maxY) * chartH;

    // Draw Line Series with Smooth Bezier or Polyline
    const drawSeries = (
      accessor: (p: HistoryPoint) => number,
      color: string,
      fillColor: string,
      lineWidth: number = 2.5
    ) => {
      // Area Fill
      ctx.beginPath();
      ctx.moveTo(getX(0), padding.top + chartH);
      for (let i = 0; i < history.length; i++) {
        ctx.lineTo(getX(i), getY(accessor(history[i])));
      }
      ctx.lineTo(getX(history.length - 1), padding.top + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grad.addColorStop(0, fillColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Stroke Line
      ctx.beginPath();
      for (let i = 0; i < history.length; i++) {
        const x = getX(i);
        const y = getY(accessor(history[i]));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Current End Point Dot
      const lastX = getX(history.length - 1);
      const lastY = getY(accessor(history[history.length - 1]));
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    // 1. Fruit (Emerald)
    drawSeries((p) => p.fruitCount, '#10b981', 'rgba(16, 185, 129, 0.15)', 2.0);

    // 2. Blue Blobs (Blue)
    drawSeries((p) => p.blueCount, '#3b82f6', 'rgba(59, 130, 246, 0.22)', 2.8);

    // 3. Red Blobs (Rose)
    drawSeries((p) => p.redCount, '#f43f5e', 'rgba(244, 63, 94, 0.22)', 2.8);

    // X Axis Time Labels
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    const firstTime = history[0].time;
    const lastTime = history[history.length - 1].time;
    ctx.fillText(`${firstTime.toFixed(0)}s`, padding.left, height - 8);
    ctx.fillText(`${((firstTime + lastTime) / 2).toFixed(0)}s`, padding.left + chartW / 2, height - 8);
    ctx.fillText(`${lastTime.toFixed(0)}s`, width - padding.right, height - 8);
  }, [history, viewMode, isCollapsed]);

  // 2. Draw Blue-vs-Red Phase Plot (Lotka-Volterra Attractor)
  useEffect(() => {
    if (viewMode !== 'phase' || isCollapsed) return;
    const canvas = phaseCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (history.length < 5) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Figtree", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Accumulating phase trajectory...', width / 2, height / 2);
      return;
    }

    let maxBlue = 10;
    let maxRed = 10;
    for (const pt of history) {
      if (pt.blueCount > maxBlue) maxBlue = pt.blueCount;
      if (pt.redCount > maxRed) maxRed = pt.redCount;
    }
    maxBlue = Math.ceil(maxBlue * 1.25 / 5) * 5;
    maxRed = Math.ceil(maxRed * 1.25 / 5) * 5;

    const padding = { top: 20, right: 20, bottom: 30, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Grid & Axis
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';

    // Y Axis (Red)
    ctx.textAlign = 'right';
    for (let i = 0; i <= 3; i++) {
      const val = Math.round((maxRed / 3) * i);
      const y = padding.top + chartH - (i / 3) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${val}`, padding.left - 5, y + 3);
    }

    // X Axis (Blue)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 3; i++) {
      const val = Math.round((maxBlue / 3) * i);
      const x = padding.left + (i / 3) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();
      ctx.fillText(`${val}`, x, height - 12);
    }

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Figtree", sans-serif';
    ctx.fillText('🔵 Blue Population (Prey)', padding.left + chartW / 2, height - 1);

    ctx.save();
    ctx.translate(12, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('🔴 Red (Predator)', 0, 0);
    ctx.restore();

    // Map Coordinates
    const getPhaseX = (b: number) => padding.left + (b / maxBlue) * chartW;
    const getPhaseY = (r: number) => padding.top + chartH - (r / maxRed) * chartH;

    // Draw Orbit Trajectory with Gradient Fade
    for (let i = 1; i < history.length; i++) {
      const p1 = history[i - 1];
      const p2 = history[i];
      const progress = i / history.length;

      ctx.beginPath();
      ctx.moveTo(getPhaseX(p1.blueCount), getPhaseY(p1.redCount));
      ctx.lineTo(getPhaseX(p2.blueCount), getPhaseY(p2.redCount));
      ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 + progress * 0.85})`;
      ctx.lineWidth = 1.5 + progress * 1.5;
      ctx.stroke();
    }

    // Head Current Point
    const current = history[history.length - 1];
    const headX = getPhaseX(current.blueCount);
    const headY = getPhaseY(current.redCount);

    ctx.fillStyle = '#c084fc';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(headX, headY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [history, viewMode, isCollapsed]);

  // 3. Draw Trait Trends (Speed & Vision)
  useEffect(() => {
    if (viewMode !== 'traits' || isCollapsed) return;
    const canvas = traitsCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (history.length < 2) return;

    const padding = { top: 20, right: 15, bottom: 25, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minTrait = 0.7;
    const maxTrait = 1.4;

    const getX = (i: number) => padding.left + (i / (history.length - 1)) * chartW;
    const getY = (val: number) => padding.top + chartH - ((val - minTrait) / (maxTrait - minTrait)) * chartH;

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 3; i++) {
      const val = (minTrait + (maxTrait - minTrait) * (i / 3)).toFixed(1);
      const y = padding.top + chartH - (i / 3) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${val}x`, padding.left - 5, y + 3);
    }

    // Draw 4 Trait Lines
    const drawTrait = (accessor: (p: HistoryPoint) => number, color: string, isDashed: boolean = false) => {
      ctx.beginPath();
      if (isDashed) ctx.setLineDash([4, 4]);
      else ctx.setLineDash([]);

      for (let i = 0; i < history.length; i++) {
        const x = getX(i);
        const y = getY(accessor(history[i]));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawTrait((p) => p.avgBlueSpeed, '#60a5fa', false);  // Blue Speed
    drawTrait((p) => p.avgBlueVision, '#93c5fd', true);  // Blue Vision
    drawTrait((p) => p.avgRedSpeed, '#f43f5e', false);   // Red Speed
    drawTrait((p) => p.avgRedVision, '#fda4af', true);   // Red Vision
  }, [history, viewMode, isCollapsed]);

  const latest = history[history.length - 1] || {
    fruitCount: 0,
    blueCount: 0,
    redCount: 0,
    time: 0,
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 w-96 max-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-slate-200">Ecology Analytics</span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand Charts' : 'Collapse Charts'}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Chart View Switcher */}
          <div className="flex items-center border-b border-slate-800 p-1 gap-1 bg-slate-950/30">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Waves</span>
            </button>

            <button
              onClick={() => setViewMode('phase')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'phase'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Phase Orbit</span>
            </button>

            <button
              onClick={() => setViewMode('traits')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'traits'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Dna className="w-3.5 h-3.5" />
              <span>Traits</span>
            </button>

            <button
              onClick={() => setViewMode('story')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'story'
                  ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Story</span>
            </button>
          </div>

          {/* Canvas or Story Content */}
          <div className="p-4 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar text-xs">
            {/* Timeline Waves Chart */}
            {viewMode === 'timeline' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                      <span>Fruit: {latest.fruitCount}</span>
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                      <span>Blue: {latest.blueCount}</span>
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                      <span>Red: {latest.redCount}</span>
                    </span>
                  </div>
                </div>

                <div className="w-full h-44 bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden p-1 shadow-inner relative">
                  <canvas
                    ref={timelineCanvasRef}
                    width={340}
                    height={165}
                    className="w-full h-full block"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Real recorded history of populations. Observe out-of-phase predator-prey waves.
                </p>
              </div>
            )}

            {/* Phase Orbit Plot */}
            {viewMode === 'phase' && (
              <div className="space-y-2">
                <div className="w-full h-48 bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden p-1 shadow-inner">
                  <canvas
                    ref={phaseCanvasRef}
                    width={340}
                    height={180}
                    className="w-full h-full block"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Phase space trajectory <code className="text-purple-300 font-mono">(Blue, Red)</code>. Closed loops demonstrate Lotka-Volterra limit cycles.
                </p>
              </div>
            )}

            {/* Genetics & Traits Trends */}
            {viewMode === 'traits' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span className="text-blue-400">─ Blue Spd / ╌ Vis</span>
                  <span className="text-rose-400">─ Red Spd / ╌ Vis</span>
                </div>

                <div className="w-full h-44 bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden p-1 shadow-inner">
                  <canvas
                    ref={traitsCanvasRef}
                    width={340}
                    height={165}
                    className="w-full h-full block"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Average inherited traits across generations. Organisms evolve over time under natural selection.
                </p>
              </div>
            )}

            {/* Live Story Narrative */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-slate-200 text-xs">{story.headline}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  Stability: {story.stabilityScore}%
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {story.subhead}
              </p>

              <div className="pt-1 border-t border-slate-900 space-y-1">
                {story.insightBullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
