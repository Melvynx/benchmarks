import React from 'react';
import { Globe2, Users, UserCheck, RotateCcw } from 'lucide-react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onResetDefaults: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  onResetDefaults,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand & Primary Model Heading */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Globe2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Gemini 4 Argon
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                Timezone Overlap Checker
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Compare global schedules, spot common awake hours, and coordinate across timezones with automatic DST.
            </p>
          </div>
        </div>

        {/* Mode Switcher & Reset */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div
            role="group"
            aria-label="Comparison mode"
            className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 shadow-inner"
          >
            <button
              type="button"
              onClick={() => onModeChange('meeting')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                mode === 'meeting'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Meeting Mode</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('base')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                mode === 'base'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Base Mode</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetDefaults}
            title="Reset to default cities and settings"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
