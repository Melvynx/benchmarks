import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Camera,
  StepForward,
  Dices,
} from 'lucide-react';
import { SimulationStats } from '../types/simulation';

interface TopHeaderProps {
  isRunning: boolean;
  simSpeed: number;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onRandomize: () => void;
  onSpeedChange: (speed: number) => void;
  onResetCamera: () => void;
  stats: SimulationStats;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  isRunning,
  simSpeed,
  onTogglePlay,
  onStep,
  onReset,
  onRandomize,
  onSpeedChange,
  onResetCamera,
  stats,
}) => {
  return (
    <header className="h-16 px-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between z-30 shrink-0">
      {/* Primary Visible Title: Exactly Gemini 3.8 Flash */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-blue-500 to-rose-500 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-xl font-display font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Gemini 3.8 Flash
          </h1>
        </div>

        {/* Live Population Counts */}
        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-xs font-mono text-emerald-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Fruit:</span>
            <span className="font-bold">{stats.fruitCount}</span>
            <span className="text-emerald-500/70 text-[10px]">/{stats.fruitCapacity}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-xs font-mono text-blue-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Blue:</span>
            <span className="font-bold">{stats.blueCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-xs font-mono text-rose-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Red:</span>
            <span className="font-bold">{stats.redCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700/60 text-xs font-mono text-slate-300">
            <span>Time:</span>
            <span className="font-bold">{stats.time.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Main Playback & Simulation Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs shadow-md transition-all ${
            isRunning
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
          }`}
          title={isRunning ? 'Pause simulation (Space)' : 'Play simulation (Space)'}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isRunning ? 'Pause' : 'Play'}</span>
        </button>

        {/* Step Forward 1 Tick */}
        <button
          onClick={onStep}
          disabled={isRunning}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-medium transition-colors"
          title="Step forward 1 tick"
        >
          <StepForward className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Step</span>
        </button>

        {/* Speed Selector */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/70">
          {[0.5, 1.0, 2.0, 4.0].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                simSpeed === s
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Reset Camera */}
        <button
          onClick={onResetCamera}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
          title="Reset Camera View"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Randomize Seeds & Rules */}
        <button
          onClick={onRandomize}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
          title="Randomize rules & seed"
        >
          <Dices className="w-4 h-4" />
        </button>

        {/* Reset Simulation */}
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700/60 hover:border-rose-800/50 text-xs font-medium transition-colors"
          title="Reset simulation with current settings"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
