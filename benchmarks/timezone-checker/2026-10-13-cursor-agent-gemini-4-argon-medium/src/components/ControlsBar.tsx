import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Sun,
  Moon,
  Clock,
  ChevronDown,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import { AvailabilitySettings, City, WorldRegion } from '../types';
import { CITIES_CATALOG } from '../data/cities';
import { formatHourLabel, formatUtcOffset, getUtcOffsetMinutes } from '../utils/timezone';

interface ControlsBarProps {
  selectedCityIds: string[];
  settings: AvailabilitySettings;
  onAddCity: (cityId: string) => void;
  onUpdateSettings: (partial: Partial<AvailabilitySettings>) => void;
  now: Date;
}

const REGIONS_ORDER: WorldRegion[] = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Middle East',
  'Asia',
  'Oceania',
];

export const ControlsBar: React.FC<ControlsBarProps> = ({
  selectedCityIds,
  settings,
  onAddCity,
  onUpdateSettings,
  now,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegion, setActiveRegion] = useState<WorldRegion | 'All'>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    } else {
      setSearchQuery('');
      setActiveRegion('All');
    }
  }, [dropdownOpen]);

  const selectedSet = useMemo(() => new Set(selectedCityIds), [selectedCityIds]);

  const filteredCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CITIES_CATALOG.filter((city) => {
      if (activeRegion !== 'All' && city.region !== activeRegion) return false;
      if (!q) return true;
      return (
        city.name.toLowerCase().includes(q) ||
        city.country.toLowerCase().includes(q) ||
        city.region.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeRegion]);

  const groupedCities = useMemo(() => {
    const map = new Map<WorldRegion, City[]>();
    for (const r of REGIONS_ORDER) {
      map.set(r, []);
    }
    for (const c of filteredCities) {
      map.get(c.region)?.push(c);
    }
    return REGIONS_ORDER.map((region) => ({
      region,
      cities: map.get(region) || [],
    })).filter((g) => g.cities.length > 0);
  }, [filteredCities]);

  const isOvernight = settings.wakeHour > settings.sleepHour;
  const awakeDurationHours =
    settings.wakeHour === settings.sleepHour
      ? 24
      : settings.wakeHour < settings.sleepHour
      ? settings.sleepHour - settings.wakeHour
      : 24 - settings.wakeHour + settings.sleepHour;

  const hoursOptions = Array.from({ length: 24 }, (_, i) => i);

  const handleSelectCity = (cityId: string) => {
    if (selectedSet.has(cityId)) return;
    onAddCity(cityId);
    setSearchQuery('');
    setDropdownOpen(false);
  };

  return (
    <section
      aria-label="City selector and availability settings"
      className="grid grid-cols-1 lg:grid-cols-12 gap-4"
    >
      {/* Left: Searchable City Picker */}
      <div
        ref={dropdownRef}
        className="lg:col-span-5 bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between relative shadow-lg shadow-black/20"
      >
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Add City to Compare
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {selectedCityIds.length} / {CITIES_CATALOG.length} selected
          </span>
        </div>

        <div className="relative">
          <div
            onClick={() => setDropdownOpen(true)}
            className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border transition-all cursor-text ${
              dropdownOpen
                ? 'border-emerald-500/70 ring-2 ring-emerald-500/20'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!dropdownOpen) setDropdownOpen(true);
              }}
              placeholder="Search city or country (e.g. Tokyo, Brazil, London)..."
              aria-label="Search city or country"
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen((prev) => !prev);
                }}
                aria-label="Toggle city catalog dropdown"
                className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    dropdownOpen ? 'rotate-180 text-emerald-400' : ''
                  }`}
                />
              </button>
            )}
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/60 z-40 overflow-hidden">
              {/* Region filter pills */}
              <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-slate-950/50">
                {(['All', ...REGIONS_ORDER] as const).map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setActiveRegion(region)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      activeRegion === region
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {groupedCities.length === 0 ? (
                  <div className="py-8 px-4 text-center text-sm text-slate-400">
                    No matching cities in the catalog for "{searchQuery}".
                  </div>
                ) : (
                  groupedCities.map((group) => (
                    <div key={group.region} className="py-1.5">
                      <div className="px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {group.region}
                      </div>
                      {group.cities.map((city) => {
                        const isAdded = selectedSet.has(city.id);
                        const offsetMins = getUtcOffsetMinutes(city.timezone, now);
                        const offsetLabel = formatUtcOffset(offsetMins);
                        return (
                          <button
                            key={city.id}
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleSelectCity(city.id)}
                            className={`w-full px-3.5 py-2 flex items-center justify-between text-left transition-colors ${
                              isAdded
                                ? 'opacity-50 cursor-not-allowed bg-slate-900/40'
                                : 'hover:bg-emerald-500/10 cursor-pointer'
                            }`}
                          >
                            <div>
                              <span className="text-sm font-medium text-slate-100">
                                {city.name}
                              </span>
                              <span className="text-xs text-slate-400 ml-2">
                                {city.country}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {offsetLabel}
                              </span>
                              {isAdded ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                                  <Check className="w-3.5 h-3.5" />
                                  Added
                                </span>
                              ) : (
                                <Plus className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Availability / Awake Window Settings Panel */}
      <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-lg shadow-black/20 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Awake Window Settings
            </span>
            {isOvernight && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-3 h-3" />
                Overnight Shift
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            Active schedule:{' '}
            <strong className="text-slate-200 font-mono">
              {formatHourLabel(settings.wakeHour, 0, settings.timeFormat)} –{' '}
              {formatHourLabel(settings.sleepHour, 0, settings.timeFormat)}
            </strong>{' '}
            ({awakeDurationHours}h awake)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Wake-up Hour */}
          <div className="flex flex-col">
            <label
              htmlFor="wake-hour-select"
              className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Wake-up Hour
            </label>
            <select
              id="wake-hour-select"
              aria-label="Wake-up hour"
              value={settings.wakeHour}
              onChange={(e) => onUpdateSettings({ wakeHour: Number(e.target.value) })}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500/70 cursor-pointer"
            >
              {hoursOptions.map((h) => (
                <option key={h} value={h}>
                  {formatHourLabel(h, 0, settings.timeFormat)} ({h}:00)
                </option>
              ))}
            </select>
          </div>

          {/* Sleep Hour */}
          <div className="flex flex-col">
            <label
              htmlFor="sleep-hour-select"
              className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              Sleep Hour
            </label>
            <select
              id="sleep-hour-select"
              aria-label="Sleep hour"
              value={settings.sleepHour}
              onChange={(e) => onUpdateSettings({ sleepHour: Number(e.target.value) })}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500/70 cursor-pointer"
            >
              {hoursOptions.map((h) => (
                <option key={h} value={h}>
                  {formatHourLabel(h, 0, settings.timeFormat)} ({h}:00)
                </option>
              ))}
            </select>
          </div>

          {/* Time Format Toggle */}
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Time Format
            </span>
            <div
              role="group"
              aria-label="Time format"
              className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 h-[38px]"
            >
              <button
                type="button"
                onClick={() => onUpdateSettings({ timeFormat: '12h' })}
                className={`rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  settings.timeFormat === '12h'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                12h (AM/PM)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ timeFormat: '24h' })}
                className={`rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  settings.timeFormat === '24h'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                24h (00–23)
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
