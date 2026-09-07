import React from 'react';
import { useTimezone } from '../context/TimezoneContext';
import { CitySearchDropdown } from './CitySearchDropdown';
import { MapPin, ArrowUpDown } from 'lucide-react';

interface ControlsBarProps {
  onOpenSettings: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = () => {
  const { cities, referenceCity } = useTimezone();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      {/* City Status & Active Reference */}
      <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Comparing <strong className="text-white">{cities.length}</strong> cities
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Reference Anchor:</span>
          <strong className="text-emerald-300 font-semibold">{referenceCity.name}</strong>
          <span className="text-slate-400">({referenceCity.country})</span>
        </div>

        <div className="hidden md:flex items-center gap-1 text-slate-400 text-xs">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <span>Click any city name to make it the reference anchor</span>
        </div>
      </div>

      {/* Right Side: Add City Button */}
      <div className="flex items-center gap-2 ml-auto">
        <CitySearchDropdown />
      </div>
    </div>
  );
};
