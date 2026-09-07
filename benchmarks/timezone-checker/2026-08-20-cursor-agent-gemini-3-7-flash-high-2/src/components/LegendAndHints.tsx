import React from 'react';
import { useTimezone } from '../context/TimezoneContext';
import { Sparkles, Moon, Sun, Info, Calendar } from 'lucide-react';

export const LegendAndHints: React.FC = () => {
  const { mode } = useTimezone();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Primary Legend Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>Grid Legend</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
          {/* Overlap State */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-500/25 border border-emerald-500/70 text-emerald-300 font-bold flex items-center justify-center text-[10px] ring-1 ring-emerald-500/30">
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-emerald-300 font-semibold">
              {mode === 'meeting' ? 'Overlap (All Awake)' : 'Overlap with Base'}
            </span>
          </div>

          {/* Awake, No Overlap State */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700 text-slate-200 font-medium flex items-center justify-center text-[10px]">
              <Sun className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-slate-300">Awake (No Overlap)</span>
          </div>

          {/* Sleeping State */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-slate-950/80 border border-slate-900 text-slate-400 opacity-40 flex items-center justify-center text-[10px]">
              <Moon className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-slate-400">Sleeping (Outside Window)</span>
          </div>

          {/* Day Offset Badge */}
          <div className="flex items-center gap-2">
            <div className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30">
              +1d / -1d
            </div>
            <span className="text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Different Day
            </span>
          </div>
        </div>
      </div>

      {/* Primary Highlight Hint as specified */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-emerald-300/90 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>
            {mode === 'meeting'
              ? 'Green cells = everyone awake'
              : 'Green cells = overlap with base city'}
          </span>
        </div>

        <div className="text-slate-400 text-[11px]">
          Click any city name to set it as the anchor city &bull; DST auto-computed
        </div>
      </div>
    </div>
  );
};
