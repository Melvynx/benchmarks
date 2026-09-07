import React, { useState } from 'react';
import {
  Sliders,
  Apple,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Flame,
  Globe,
  Dices,
  RotateCcw,
} from 'lucide-react';
import { PRESETS } from '../simulation/presets';
import { SimulationConfig } from '../types/simulation';

interface ControlPanelProps {
  config: SimulationConfig;
  activePresetId: string;
  onConfigChange: (newConfig: Partial<SimulationConfig>) => void;
  onSelectPreset: (presetId: string) => void;
  onResetToDefault: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  activePresetId,
  onConfigChange,
  onSelectPreset,
  onResetToDefault,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'rules'>('presets');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    fruit: false,
    blue: false,
    red: false,
    world: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSlider = (key: keyof SimulationConfig, val: number) => {
    onConfigChange({ [key]: val });
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className="absolute top-20 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 text-slate-200 border border-slate-700/80 shadow-xl backdrop-blur-md transition-all group"
      >
        <Sliders className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
        <span className="text-xs font-semibold">Tuning & Presets</span>
      </button>
    );
  }

  return (
    <aside className="absolute top-20 left-4 z-20 w-80 sm:w-88 max-h-[calc(100vh-6.5rem)] flex flex-col bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all text-slate-200">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-display font-bold">Garden Rules & Presets</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onResetToDefault}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[11px] transition-colors"
            title="Reset rules to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleOpen}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/80 shrink-0 bg-slate-950/30 p-1 gap-1">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'presets'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Ecology Presets
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'rules'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Custom Tuning
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
        {activeTab === 'presets' ? (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Select an ecological scenario to observe distinct population wave behaviors:
            </p>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  activePresetId === preset.id
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-display text-slate-100 flex items-center gap-1.5">
                    {preset.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-emerald-300">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. Fruit & Trees */}
            <div className="border border-slate-800 rounded-xl bg-slate-950/30 overflow-hidden">
              <button
                onClick={() => toggleSection('fruit')}
                className="w-full px-3 py-2 bg-emerald-950/20 border-b border-slate-800 flex items-center justify-between text-left text-xs font-bold text-emerald-400"
              >
                <div className="flex items-center gap-2">
                  <Apple className="w-3.5 h-3.5" />
                  <span>Fruit Trees & Regrowth</span>
                </div>
                {collapsedSections.fruit ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {!collapsedSections.fruit && (
                <div className="p-3 space-y-3">
                  <SliderRow
                    label="Growth Speed"
                    value={config.fruitGrowthSpeed}
                    min={0.2}
                    max={3.0}
                    step={0.1}
                    unit="x"
                    onChange={(v) => handleSlider('fruitGrowthSpeed', v)}
                  />
                  <SliderRow
                    label="Fruit Limit (per tree)"
                    value={config.fruitPerTree}
                    min={2}
                    max={10}
                    step={1}
                    unit=""
                    onChange={(v) => handleSlider('fruitPerTree', v)}
                  />
                  <SliderRow
                    label="Fruit Return Delay"
                    value={config.fruitReturnDelay}
                    min={2.0}
                    max={15.0}
                    step={0.5}
                    unit="s"
                    onChange={(v) => handleSlider('fruitReturnDelay', v)}
                  />
                  <SliderRow
                    label="Starting Fruit Trees"
                    value={config.treeCount}
                    min={4}
                    max={32}
                    step={1}
                    unit=""
                    onChange={(v) => handleSlider('treeCount', v)}
                  />
                  <SliderRow
                    label="Fruit Energy Value"
                    value={config.fruitEnergyValue}
                    min={20}
                    max={80}
                    step={2}
                    unit="⚡"
                    onChange={(v) => handleSlider('fruitEnergyValue', v)}
                  />
                </div>
              )}
            </div>

            {/* 2. Blue Blob Rules */}
            <div className="border border-slate-800 rounded-xl bg-slate-950/30 overflow-hidden">
              <button
                onClick={() => toggleSection('blue')}
                className="w-full px-3 py-2 bg-blue-950/20 border-b border-slate-800 flex items-center justify-between text-left text-xs font-bold text-blue-400"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Blue Forager Blobs</span>
                </div>
                {collapsedSections.blue ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {!collapsedSections.blue && (
                <div className="p-3 space-y-3">
                  <SliderRow
                    label="Starting Blue Blobs"
                    value={config.blueCount}
                    min={5}
                    max={60}
                    step={1}
                    unit=""
                    onChange={(v) => handleSlider('blueCount', v)}
                  />
                  <SliderRow
                    label="Blue Blob Energy Use"
                    value={config.blueEnergyUse}
                    min={1.0}
                    max={6.0}
                    step={0.2}
                    unit="/s"
                    onChange={(v) => handleSlider('blueEnergyUse', v)}
                  />
                  <SliderRow
                    label="Blue Blob Speed"
                    value={config.blueBaseSpeed}
                    min={6.0}
                    max={22.0}
                    step={0.5}
                    unit=""
                    onChange={(v) => handleSlider('blueBaseSpeed', v)}
                  />
                  <SliderRow
                    label="Blue Blob Vision"
                    value={config.blueBaseVision}
                    min={12.0}
                    max={40.0}
                    step={1.0}
                    unit="m"
                    onChange={(v) => handleSlider('blueBaseVision', v)}
                  />
                  <SliderRow
                    label="Blue Copy Threshold"
                    value={config.blueCopyThreshold}
                    min={60}
                    max={130}
                    step={2}
                    unit="⚡"
                    onChange={(v) => handleSlider('blueCopyThreshold', v)}
                  />
                  <SliderRow
                    label="Blue Blob Eating Time"
                    value={config.blueEatingTime}
                    min={0.3}
                    max={2.5}
                    step={0.1}
                    unit="s"
                    onChange={(v) => handleSlider('blueEatingTime', v)}
                  />
                  <SliderRow
                    label="Blue Flee Panic Distance"
                    value={config.blueFleeDistance}
                    min={10.0}
                    max={30.0}
                    step={1.0}
                    unit="m"
                    onChange={(v) => handleSlider('blueFleeDistance', v)}
                  />
                </div>
              )}
            </div>

            {/* 3. Red Blob Rules */}
            <div className="border border-slate-800 rounded-xl bg-slate-950/30 overflow-hidden">
              <button
                onClick={() => toggleSection('red')}
                className="w-full px-3 py-2 bg-rose-950/20 border-b border-slate-800 flex items-center justify-between text-left text-xs font-bold text-rose-400"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Red Predator Blobs</span>
                </div>
                {collapsedSections.red ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {!collapsedSections.red && (
                <div className="p-3 space-y-3">
                  <SliderRow
                    label="Starting Red Blobs"
                    value={config.redCount}
                    min={2}
                    max={35}
                    step={1}
                    unit=""
                    onChange={(v) => handleSlider('redCount', v)}
                  />
                  <SliderRow
                    label="Red Blob Energy Use"
                    value={config.redEnergyUse}
                    min={1.5}
                    max={7.0}
                    step={0.2}
                    unit="/s"
                    onChange={(v) => handleSlider('redEnergyUse', v)}
                  />
                  <SliderRow
                    label="Red Blob Speed"
                    value={config.redBaseSpeed}
                    min={8.0}
                    max={24.0}
                    step={0.5}
                    unit=""
                    onChange={(v) => handleSlider('redBaseSpeed', v)}
                  />
                  <SliderRow
                    label="Red Blob Vision"
                    value={config.redBaseVision}
                    min={15.0}
                    max={45.0}
                    step={1.0}
                    unit="m"
                    onChange={(v) => handleSlider('redBaseVision', v)}
                  />
                  <SliderRow
                    label="Red Contact Strength"
                    value={config.redContactStrength}
                    min={25}
                    max={85}
                    step={2}
                    unit="⚡"
                    onChange={(v) => handleSlider('redContactStrength', v)}
                  />
                  <SliderRow
                    label="Red Copy Threshold"
                    value={config.redCopyThreshold}
                    min={75}
                    max={160}
                    step={5}
                    unit="⚡"
                    onChange={(v) => handleSlider('redCopyThreshold', v)}
                  />
                  <SliderRow
                    label="Red Blob Pause Time"
                    value={config.redPauseTime}
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    unit="s"
                    onChange={(v) => handleSlider('redPauseTime', v)}
                  />
                </div>
              )}
            </div>

            {/* 4. World & Environment */}
            <div className="border border-slate-800 rounded-xl bg-slate-950/30 overflow-hidden">
              <button
                onClick={() => toggleSection('world')}
                className="w-full px-3 py-2 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between text-left text-xs font-bold text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>World Size & Genetics</span>
                </div>
                {collapsedSections.world ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {!collapsedSections.world && (
                <div className="p-3 space-y-3">
                  <SliderRow
                    label="World Size (Radius)"
                    value={config.worldRadius}
                    min={35}
                    max={80}
                    step={2}
                    unit="m"
                    onChange={(v) => handleSlider('worldRadius', v)}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Random Seed</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {config.randomSeed}
                      </span>
                      <button
                        onClick={() => handleSlider('randomSeed', Math.floor(Math.random() * 9999))}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Roll new seed"
                      >
                        <Dices className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <SliderRow
                    label="Trait Mutation Rate"
                    value={config.mutationRate}
                    min={0.0}
                    max={0.5}
                    step={0.05}
                    unit="%"
                    onChange={(v) => handleSlider('mutationRate', v)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-400">
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
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
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
      />
    </div>
  );
};
