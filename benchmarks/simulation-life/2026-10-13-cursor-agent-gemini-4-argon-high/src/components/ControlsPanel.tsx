import React, { useState } from 'react';
import {
  Apple,
  Dices,
  Flame,
  Globe,
  RotateCcw,
  Sliders,
  Sparkles,
   Sprout,
} from 'lucide-react';
import { PRESETS } from '../simulation/presets.ts';
import type { PresetId, SimConfig } from '../simulation/types.ts';

interface ControlsPanelProps {
  config: SimConfig;
  activePreset: PresetId;
  onSelectPreset: (presetId: Exclude<PresetId, 'custom'>) => void;
  onUpdateConfig: (partial: Partial<SimConfig>, rebuildWorld?: boolean) => void;
  onRandomize: () => void;
  onReset: () => void;
}

type ControlTab = 'all' | 'fruit' | 'blue' | 'red' | 'world';

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  config,
  activePreset,
  onSelectPreset,
  onUpdateConfig,
  onRandomize,
  onReset,
}) => {
  const [tab, setTab] = useState<ControlTab>('all');

  const presetList = Object.values(PRESETS);

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Ecological Presets Card */}
      <div className="bg-white/95 backdrop-blur-sm border border-[#E5DEC9] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-[#1F2924]">
              Garden Presets
            </h2>
          </div>
          <button
            type="button"
            onClick={onRandomize}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition"
          >
            <Dices className="w-3.5 h-3.5" />
            Randomize
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {presetList.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id)}
                className={`text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-[#F9F7F2] hover:bg-[#F1ECE0] border-[#E6DFCE]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#1F2924] flex items-center gap-1.5">
                    {p.name}
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    )}
                  </div>
                  <div className="text-[11px] text-[#5B6960] line-clamp-1">
                    {p.tagline}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-[#68766E] bg-white/80 px-2 py-0.5 rounded-md border border-[#E5DEC9] shrink-0">
                  {p.config.fruitLimit}F • {p.config.startingBlue}B •{' '}
                  {p.config.startingRed}R
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Live Rule Tuning Sliders Card */}
      <div className="bg-white/95 backdrop-blur-sm border border-[#E5DEC9] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-[#1F2924]">
              Live Ecology Rules
            </h2>
          </div>
          <span className="text-[10px] font-medium text-[#68766E] bg-[#F4F0E6] px-2 py-0.5 rounded-full">
            Updates live
          </span>
        </div>

        {/* Category Filter Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-[#F4F0E6] p-1 rounded-xl border border-[#E5DEC9] mb-3 text-[11px] font-semibold">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'fruit', label: 'Fruit' },
              { id: 'blue', label: 'Blue' },
              { id: 'red', label: 'Red' },
              { id: 'world', label: 'World' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`py-1 rounded-lg transition ${
                tab === item.id
                  ? 'bg-white text-[#1F2924] shadow-sm'
                  : 'text-[#68766E] hover:text-[#1F2924]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 max-h-[430px] overflow-y-auto pr-1">
          {/* FRUIT SECTION */}
          {(tab === 'all' || tab === 'fruit') && (
            <div className="space-y-2.5 bg-emerald-50/40 border border-emerald-200/70 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Apple className="w-3.5 h-3.5 text-emerald-600" />
                Fruit & Orchard Rules
              </div>

              <SliderRow
                label="Fruit Growth Speed"
                value={config.fruitGrowthSpeed}
                min={0.15}
                max={2.4}
                step={0.05}
                unit="x"
                accentClass="accent-emerald-600"
                onChange={(v) => onUpdateConfig({ fruitGrowthSpeed: v })}
              />
              <SliderRow
                label="Fruit Limit"
                value={config.fruitLimit}
                min={8}
                max={110}
                step={2}
                unit=" fruits"
                accentClass="accent-emerald-600"
                onChange={(v) => onUpdateConfig({ fruitLimit: v })}
              />
              <SliderRow
                label="Fruit Return Delay"
                value={config.fruitReturnDelay}
                min={0.5}
                max={10.0}
                step={0.2}
                unit="s"
                accentClass="accent-emerald-600"
                onChange={(v) => onUpdateConfig({ fruitReturnDelay: v })}
              />
            </div>
          )}

          {/* BLUE BLOB SECTION */}
          {(tab === 'all' || tab === 'blue') && (
            <div className="space-y-2.5 bg-blue-50/40 border border-blue-200/70 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Sprout className="w-3.5 h-3.5 text-blue-600" />
                Blue Blob Rules (Foragers)
              </div>

              <SliderRow
                label="Blue Blob Energy Use"
                value={config.blueEnergyUse}
                min={1.2}
                max={9.0}
                step={0.1}
                unit="/s"
                accentClass="accent-blue-600"
                onChange={(v) => onUpdateConfig({ blueEnergyUse: v })}
              />
              <SliderRow
                label="Blue Blob Speed"
                value={config.blueSpeed}
                min={20}
                max={95}
                step={2}
                unit=" u/s"
                accentClass="accent-blue-600"
                onChange={(v) => onUpdateConfig({ blueSpeed: v })}
              />
              <SliderRow
                label="Blue Blob Vision"
                value={config.blueVision}
                min={35}
                max={200}
                step={5}
                unit=" u"
                accentClass="accent-blue-600"
                onChange={(v) => onUpdateConfig({ blueVision: v })}
              />
              <SliderRow
                label="Blue Blob Copy Threshold"
                value={config.blueCopyThreshold}
                min={65}
                max={170}
                step={2}
                unit=" E"
                accentClass="accent-blue-600"
                onChange={(v) => onUpdateConfig({ blueCopyThreshold: v })}
              />
              <SliderRow
                label="Blue Blob Eating Time"
                value={config.blueEatingTime}
                min={0.2}
                max={3.0}
                step={0.05}
                unit="s"
                accentClass="accent-blue-600"
                onChange={(v) => onUpdateConfig({ blueEatingTime: v })}
              />
            </div>
          )}

          {/* RED BLOB SECTION */}
          {(tab === 'all' || tab === 'red') && (
            <div className="space-y-2.5 bg-rose-50/40 border border-rose-200/70 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                Red Blob Rules (Contact Seekers)
              </div>

              <SliderRow
                label="Red Blob Energy Use"
                value={config.redEnergyUse}
                min={1.2}
                max={9.0}
                step={0.1}
                unit="/s"
                accentClass="accent-rose-600"
                onChange={(v) => onUpdateConfig({ redEnergyUse: v })}
              />
              <SliderRow
                label="Red Blob Speed"
                value={config.redSpeed}
                min={20}
                max={100}
                step={2}
                unit=" u/s"
                accentClass="accent-rose-600"
                onChange={(v) => onUpdateConfig({ redSpeed: v })}
              />
              <SliderRow
                label="Red Blob Vision"
                value={config.redVision}
                min={35}
                max={220}
                step={5}
                unit=" u"
                accentClass="accent-rose-600"
                onChange={(v) => onUpdateConfig({ redVision: v })}
              />
              <SliderRow
                label="Red Blob Contact Strength"
                value={config.redContactStrength}
                min={18}
                max={90}
                step={2}
                unit=" E"
                accentClass="accent-rose-600"
                onChange={(v) => onUpdateConfig({ redContactStrength: v })}
              />
              <SliderRow
                label="Red Blob Copy Threshold"
                value={config.redCopyThreshold}
                min={65}
                max={175}
                step={2}
                unit=" E"
                accentClass="accent-rose-600"
                onChange={(v) => onUpdateConfig({ redCopyThreshold: v })}
              />
              <SliderRow
                label="Red Blob Pause Time"
                value={config.redPauseTime}
                min={0.25}
                max={3.5}
                step={0.05}
                unit="s"
                accentClass="accent-rose-600"
                onChange={(v) => onUpdateConfig({ redPauseTime: v })}
              />
            </div>
          )}

          {/* WORLD & SETUP SECTION */}
          {(tab === 'all' || tab === 'world') && (
            <div className="space-y-2.5 bg-amber-50/40 border border-amber-200/70 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <Globe className="w-3.5 h-3.5 text-amber-700" />
                  World & Starting Setup
                </div>
              </div>

              <SliderRow
                label="Simulation Speed"
                value={config.simSpeed}
                min={0.25}
                max={6.0}
                step={0.25}
                unit="x"
                accentClass="accent-amber-600"
                onChange={(v) => onUpdateConfig({ simSpeed: v })}
              />
              <SliderRow
                label="World Size (Dish Radius)"
                value={config.worldSize}
                min={170}
                max={330}
                step={5}
                unit=" u"
                accentClass="accent-amber-600"
                onChange={(v) => onUpdateConfig({ worldSize: v })}
              />
              <SliderRow
                label="Starting Fruit Trees"
                value={config.startingTrees}
                min={4}
                max={26}
                step={1}
                unit=" trees"
                accentClass="accent-amber-600"
                onChange={(v) => onUpdateConfig({ startingTrees: v }, true)}
              />
              <SliderRow
                label="Starting Blue Blobs"
                value={config.startingBlue}
                min={2}
                max={50}
                step={1}
                unit=" blobs"
                accentClass="accent-amber-600"
                onChange={(v) => onUpdateConfig({ startingBlue: v }, true)}
              />
              <SliderRow
                label="Starting Red Blobs"
                value={config.startingRed}
                min={0}
                max={40}
                step={1}
                unit=" blobs"
                accentClass="accent-amber-600"
                onChange={(v) => onUpdateConfig({ startingRed: v }, true)}
              />

              <div className="pt-1 flex items-center justify-between gap-2">
                <label className="text-[11px] font-medium text-[#44524A]">
                  Random Seed
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={config.seed}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) {
                        onUpdateConfig({ seed: val }, true);
                      }
                    }}
                    className="w-24 px-2 py-1 text-xs font-mono bg-white border border-[#D8D0BC] rounded-lg text-right"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig(
                        { seed: Math.floor(1000 + Math.random() * 9000) },
                        true
                      )
                    }
                    title="New random seed"
                    className="p-1.5 rounded-lg bg-white border border-[#D8D0BC] hover:bg-[#F4F0E6] text-[#334139]"
                  >
                    <Dices className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onReset}
                className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white hover:bg-[#F4F0E6] text-xs font-semibold text-[#334139] border border-[#D8D0BC] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset World with Starting Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  accentClass: string;
  onChange: (value: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  accentClass,
  onChange,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-0.5">
        <span className="font-medium text-[#334139]">{label}</span>
        <span className="font-mono font-semibold text-[#1F2924]">
          {Number.isInteger(step) ? value : value.toFixed(2).replace(/\.00$/, '.0')}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 bg-[#E2DAC6] rounded-lg cursor-pointer ${accentClass}`}
      />
    </div>
  );
};
