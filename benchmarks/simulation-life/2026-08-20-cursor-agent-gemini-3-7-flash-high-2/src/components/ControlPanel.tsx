import React, { useState } from 'react';
import {
  Sliders,
  Apple,
  CircleDot,
  Flame,
  Dna,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PRESETS } from '../simulation/presets';
import { SimulationConfig } from '../types/simulation';

interface ControlPanelProps {
  config: SimulationConfig;
  onConfigChange: (updated: Partial<SimulationConfig>) => void;
  onSelectPreset: (presetId: string) => void;
  activePresetId: string | null;
}

type TabType = 'presets' | 'fruit' | 'blue' | 'red' | 'genetics';

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onConfigChange,
  onSelectPreset,
  activePresetId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 w-80 max-h-[calc(100vh-6rem)]">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-200">Ecology Tuning</span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-slate-800 p-1 gap-1 bg-slate-950/30 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === 'presets'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>

            <button
              onClick={() => setActiveTab('fruit')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === 'fruit'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>Fruit</span>
            </button>

            <button
              onClick={() => setActiveTab('blue')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === 'blue'
                  ? 'bg-blue-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5" />
              <span>Blue</span>
            </button>

            <button
              onClick={() => setActiveTab('red')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === 'red'
                  ? 'bg-rose-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Red</span>
            </button>

            <button
              onClick={() => setActiveTab('genetics')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === 'genetics'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Dna className="w-3.5 h-3.5" />
              <span>World</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
            {/* Presets Tab */}
            {activeTab === 'presets' && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Choose a tuned ecological preset to explore different population waves and dynamics.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {PRESETS.map((preset) => {
                    const isSelected = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => onSelectPreset(preset.id)}
                        className={`text-left p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border-blue-500/80 shadow-md ring-1 ring-blue-500/40'
                            : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-200">{preset.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fruit Trees Tab */}
            {activeTab === 'fruit' && (
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Fruit Growth Speed</span>
                    <span className="font-mono text-emerald-400">{config.fruitGrowthSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={config.fruitGrowthSpeed}
                    onChange={(e) => onConfigChange({ fruitGrowthSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">How rapidly plants swell ripe fruit</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Fruit Return Delay</span>
                    <span className="font-mono text-emerald-400">{config.fruitReturnDelay.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="16.0"
                    step="0.5"
                    value={config.fruitReturnDelay}
                    onChange={(e) => onConfigChange({ fruitReturnDelay: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">Base seconds for harvested fruit to regrow</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Fruit Energy Value</span>
                    <span className="font-mono text-emerald-400">+{config.fruitEnergyValue}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    step="2"
                    value={config.fruitEnergyValue}
                    onChange={(e) => onConfigChange({ fruitEnergyValue: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">Caloric energy transferred per bite</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Fruit Limit Per Tree</span>
                    <span className="font-mono text-emerald-400">{config.fruitPerTree}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={config.fruitPerTree}
                    onChange={(e) => onConfigChange({ fruitPerTree: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Starting Tree Count</span>
                    <span className="font-mono text-emerald-400">{config.treeCount}</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="30"
                    step="1"
                    value={config.treeCount}
                    onChange={(e) => onConfigChange({ treeCount: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Blue Blobs Tab */}
            {activeTab === 'blue' && (
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Movement Speed</span>
                    <span className="font-mono text-blue-400">{config.blueBaseSpeed.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="6.0"
                    max="22.0"
                    step="0.5"
                    value={config.blueBaseSpeed}
                    onChange={(e) => onConfigChange({ blueBaseSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Vision Radius</span>
                    <span className="font-mono text-blue-400">{config.blueBaseVision.toFixed(0)}</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="45"
                    step="1"
                    value={config.blueBaseVision}
                    onChange={(e) => onConfigChange({ blueBaseVision: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Energy Burn (Metabolism)</span>
                    <span className="font-mono text-blue-400">{config.blueEnergyUse.toFixed(1)}/s</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.5"
                    step="0.1"
                    value={config.blueEnergyUse}
                    onChange={(e) => onConfigChange({ blueEnergyUse: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Copy Threshold (Reproduction)</span>
                    <span className="font-mono text-blue-400">{config.blueCopyThreshold} E</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    step="2"
                    value={config.blueCopyThreshold}
                    onChange={(e) => onConfigChange({ blueCopyThreshold: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Eating Duration</span>
                    <span className="font-mono text-blue-400">{config.blueEatingTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={config.blueEatingTime}
                    onChange={(e) => onConfigChange({ blueEatingTime: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">Chew pause duration near tree</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Flee Panic Distance</span>
                    <span className="font-mono text-blue-400">{config.blueFleeDistance.toFixed(0)}</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    step="1"
                    value={config.blueFleeDistance}
                    onChange={(e) => onConfigChange({ blueFleeDistance: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Red Blobs Tab */}
            {activeTab === 'red' && (
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Movement Speed</span>
                    <span className="font-mono text-rose-400">{config.redBaseSpeed.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="8.0"
                    max="24.0"
                    step="0.5"
                    value={config.redBaseSpeed}
                    onChange={(e) => onConfigChange({ redBaseSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Vision Radius</span>
                    <span className="font-mono text-rose-400">{config.redBaseVision.toFixed(0)}</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="48"
                    step="1"
                    value={config.redBaseVision}
                    onChange={(e) => onConfigChange({ redBaseVision: parseInt(e.target.value) })}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Energy Burn (Metabolism)</span>
                    <span className="font-mono text-rose-400">{config.redEnergyUse.toFixed(1)}/s</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="6.5"
                    step="0.1"
                    value={config.redEnergyUse}
                    onChange={(e) => onConfigChange({ redEnergyUse: parseFloat(e.target.value) })}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Contact Strength (Energy Drain)</span>
                    <span className="font-mono text-rose-400">+{config.redContactStrength}</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="90"
                    step="2"
                    value={config.redContactStrength}
                    onChange={(e) => onConfigChange({ redContactStrength: parseInt(e.target.value) })}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Copy Threshold (Reproduction)</span>
                    <span className="font-mono text-rose-400">{config.redCopyThreshold} E</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="160"
                    step="5"
                    value={config.redCopyThreshold}
                    onChange={(e) => onConfigChange({ redCopyThreshold: parseInt(e.target.value) })}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Post-Hunt Pause Time</span>
                    <span className="font-mono text-rose-400">{config.redPauseTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.5"
                    step="0.1"
                    value={config.redPauseTime}
                    onChange={(e) => onConfigChange({ redPauseTime: parseFloat(e.target.value) })}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">Rest / digestion pause after catching blue blob</span>
                </div>
              </div>
            )}

            {/* Genetics & World Tab */}
            {activeTab === 'genetics' && (
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>World Dish Radius</span>
                    <span className="font-mono text-purple-400">{config.worldRadius}</span>
                  </div>
                  <input
                    type="range"
                    min="35"
                    max="75"
                    step="1"
                    value={config.worldRadius}
                    onChange={(e) => onConfigChange({ worldRadius: parseInt(e.target.value) })}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Mutation Chance</span>
                    <span className="font-mono text-purple-400">{(config.mutationRate * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.6"
                    step="0.05"
                    value={config.mutationRate}
                    onChange={(e) => onConfigChange({ mutationRate: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Mutation Magnitude</span>
                    <span className="font-mono text-purple-400">±{(config.mutationStrength * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.30"
                    step="0.02"
                    value={config.mutationStrength}
                    onChange={(e) => onConfigChange({ mutationStrength: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Random Seed</span>
                    <span className="font-mono text-purple-400">{config.randomSeed}</span>
                  </div>
                  <input
                    type="number"
                    value={config.randomSeed}
                    onChange={(e) => onConfigChange({ randomSeed: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
