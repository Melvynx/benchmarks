import React from 'react';
import { useTimezone } from '../context/TimezoneContext';
import { RotateCcw, Users, Compass, Sliders, Globe2 } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  isSettingsOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, isSettingsOpen }) => {
  const { mode, setMode, resetToDefaults } = useTimezone();

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Primary Page Heading */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400">
              <Globe2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Gemini 3.7 Flash
            </h1>
          </div>
        </div>

        {/* Mode & Action Controls */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-950/80 border border-slate-800 rounded-xl shadow-inner">
            <button
              onClick={() => setMode('meeting')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                mode === 'meeting'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Find hours when everyone is awake simultaneously"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Meeting Mode</span>
            </button>

            <button
              onClick={() => setMode('base')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                mode === 'base'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Compare each city independently against reference city"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Base Mode</span>
            </button>
          </div>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
              isSettingsOpen
                ? 'bg-slate-800 border-emerald-500/60 text-emerald-400 shadow-sm'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600'
            }`}
            aria-label="Toggle availability settings"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Reset to Defaults */}
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 hover:border-slate-700 text-xs transition-all"
            title="Reset to default cities and schedule"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
