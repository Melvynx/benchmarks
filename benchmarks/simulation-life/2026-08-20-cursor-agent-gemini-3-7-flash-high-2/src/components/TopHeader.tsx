import React from 'react';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Shuffle,
  Camera,
  Activity,
  Sparkles,
} from 'lucide-react';
import { SimulationEngine } from '../simulation/engine';

interface TopHeaderProps {
  engine: SimulationEngine;
  isRunning: boolean;
  simSpeed: number;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onRandomize: () => void;
  onSpeedChange: (speed: number) => void;
  onResetCamera: () => void;
  stats: {
    fruitCount: number;
    fruitCapacity: number;
    blueCount: number;
    redCount: number;
  };
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  engine,
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
      {/* Primary Visible Title: Exactly Gemini 3.7 Flash */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-blue-500 to-rose-500 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-xl font-display font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Gemini 3.7 Flash
          </h1>
        </div>

        {/* Live Population Pills */}
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

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs font-mono text-slate-400">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>{Math.floor(engine.time)}s</span>
          </div>
        </div>
      </div>

      {/* Main Playback & Simulation Speed Controls */}
      <div className="flex items-center gap-2">
        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium text-sm transition-all shadow-md active:scale-95 ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-amber-500/20'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-emerald-500/20'
          }`}
          title={isRunning ? 'Pause Simulation' : 'Play Simulation'}
        >
          {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isRunning ? 'Pause' : 'Play'}</span>
        </button>

        {/* Step Single Frame */}
        <button
          onClick={onStep}
          disabled={isRunning}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition-all border border-slate-700/60"
          title="Step 1 Tick"
        >
          <StepForward className="w-4 h-4" />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
          {[0.5, 1, 2, 5].map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`px-2 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                simSpeed === speed
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Randomize Seed */}
        <button
          onClick={onRandomize}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all"
          title="Randomize Seed & World"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Randomize</span>
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all"
          title="Reset Simulation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Reset Camera */}
        <button
          onClick={onResetCamera}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700/60 transition-all"
          title="Reset 3D Camera View"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
