import React from 'react';
import { Info } from 'lucide-react';
import { AppMode } from '../types';

interface LegendFooterProps {
  mode: AppMode;
}

export const LegendFooter: React.FC<LegendFooterProps> = ({ mode }) => {
  return (
    <footer className="bg-slate-900/70 border border-slate-800/80 rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400">
      {/* Three Visual States Legend */}
      <div className="flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md bg-emerald-500 border border-emerald-300 shadow-sm inline-block shrink-0" />
          <span className="font-semibold text-emerald-300">
            Green cells = everyone awake
          </span>
          {mode === 'base' && (
            <span className="text-slate-400">
              (or awake with REF in Base Mode)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md bg-slate-800 border border-slate-700 inline-block shrink-0" />
          <span className="text-slate-300">Awake (no overlap)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md bg-slate-950 border border-slate-800 opacity-60 inline-block shrink-0" />
          <span className="text-slate-500">Sleeping (outside awake window)</span>
        </div>
      </div>

      {/* Interaction Hint */}
      <div className="flex items-center gap-1.5 text-slate-400">
        <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>
          Click any city name to promote it to <strong className="text-slate-200">REF</strong>.
        </span>
      </div>
    </footer>
  );
};
