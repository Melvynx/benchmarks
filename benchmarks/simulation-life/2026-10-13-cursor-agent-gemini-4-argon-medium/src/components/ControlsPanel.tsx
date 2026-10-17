import React, { useState } from 'react'
import {
  Dices,
  FastForward,
  Flame,
  Leaf,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  StepForward,
  Trees,
} from 'lucide-react'
import { PRESETS } from '../sim/presets'
import { PresetDefinition, SimConfig } from '../sim/types'

interface ControlsPanelProps {
  config: SimConfig
  activePresetId: string
  isRunning: boolean
  simSpeed: number
  onTogglePlay: () => void
  onStep: () => void
  onReset: () => void
  onRandomize: () => void
  onSelectPreset: (preset: PresetDefinition) => void
  onChangeConfig: (partial: Partial<SimConfig>, requiresReset?: boolean) => void
  onChangeSimSpeed: (speed: number) => void
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  config,
  activePresetId,
  isRunning,
  simSpeed,
  onTogglePlay,
  onStep,
  onReset,
  onRandomize,
  onSelectPreset,
  onChangeConfig,
  onChangeSimSpeed,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'fruit' | 'blue' | 'red' | 'world'>('all')

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Transport & Speed Deck */}
      <div className="rounded-2xl bg-[#131d19] border border-emerald-900/60 p-3.5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlay}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
                isRunning
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isRunning ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={onStep}
              disabled={isRunning}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium bg-[#0c1411] hover:bg-emerald-950/80 disabled:opacity-40 border border-emerald-800/60 text-emerald-100 transition-colors"
              title="Advance simulation by one step (0.5s)"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Step</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium bg-[#0c1411] hover:bg-emerald-950/80 border border-emerald-800/60 text-emerald-100 transition-colors"
              title="Reset dish to t=0 with current parameters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={onRandomize}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 transition-colors"
              title="Randomize seed & parameters"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Randomize</span>
            </button>
          </div>

          {/* Simulation Speed Selector */}
          <div className="flex items-center gap-1 bg-[#0b120f] p-1 rounded-xl border border-emerald-900/60">
            <FastForward className="w-3.5 h-3.5 text-emerald-400 ml-1.5 mr-0.5" />
            {[0.5, 1, 2, 4, 8].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSimSpeed(spd)}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                  simSpeed === spd
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>
        </div>

        {/* Ecological Presets Bar */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 block mb-1.5">
            Garden Presets (Instant Scenarios)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-2 xl:grid-cols-3 gap-1.5">
            {PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={`text-left px-2.5 py-1.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                      : 'bg-[#0b120f] border-emerald-900/50 text-emerald-100/75 hover:border-emerald-700 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{preset.name}</div>
                  <div className="text-[10px] text-emerald-300/70 truncate">{preset.badge}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Parameter Sliders Card */}
      <div className="rounded-2xl bg-[#131d19] border border-emerald-900/60 p-3.5 shadow-lg flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Live Ecology Rules
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-[#0b120f] p-0.5 rounded-xl border border-emerald-900/60 text-[11px]">
            {[
              { id: 'all', label: 'All' },
              { id: 'fruit', label: '🍏' },
              { id: 'blue', label: '🔵' },
              { id: 'red', label: '🔴' },
              { id: 'world', label: '🌍' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-600/35 text-emerald-200 font-semibold'
                    : 'text-emerald-200/60 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 max-h-[540px]">
          {/* Fruit Rules */}
          {(activeTab === 'all' || activeTab === 'fruit') && (
            <div className="space-y-2.5 bg-[#0d1512] p-3 rounded-xl border border-lime-500/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-lime-300">
                <Leaf className="w-3.5 h-3.5" />
                <span>Fruit & Tree Regrowth</span>
              </div>
              <SliderRow
                label="Fruit Growth Speed"
                value={config.fruitGrowthSpeed}
                min={0.2}
                max={3.0}
                step={0.05}
                unit="×"
                accent="accent-lime-400"
                onChange={(v) => onChangeConfig({ fruitGrowthSpeed: v })}
              />
              <SliderRow
                label="Fruit Limit (Garden Cap)"
                value={config.fruitLimit}
                min={8}
                max={140}
                step={2}
                unit=" fruits"
                accent="accent-lime-400"
                onChange={(v) => onChangeConfig({ fruitLimit: v })}
              />
              <SliderRow
                label="Fruit Return Delay"
                value={config.fruitReturnDelay}
                min={1.0}
                max={15.0}
                step={0.5}
                unit="s"
                accent="accent-lime-400"
                onChange={(v) => onChangeConfig({ fruitReturnDelay: v })}
              />
            </div>
          )}

          {/* Blue Blob Rules */}
          {(activeTab === 'all' || activeTab === 'blue') && (
            <div className="space-y-2.5 bg-[#0d1512] p-3 rounded-xl border border-sky-500/25">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>Blue Blobs (Fruit Foragers)</span>
              </div>
              <SliderRow
                label="Blue Energy Use"
                value={config.blueEnergyUse}
                min={1.5}
                max={9.0}
                step={0.1}
                unit="/s"
                accent="accent-sky-400"
                onChange={(v) => onChangeConfig({ blueEnergyUse: v })}
              />
              <SliderRow
                label="Blue Speed"
                value={config.blueSpeed}
                min={18}
                max={75}
                step={1}
                unit=" u/s"
                accent="accent-sky-400"
                onChange={(v) => onChangeConfig({ blueSpeed: v })}
              />
              <SliderRow
                label="Blue Vision"
                value={config.blueVision}
                min={35}
                max={160}
                step={2}
                unit=" u"
                accent="accent-sky-400"
                onChange={(v) => onChangeConfig({ blueVision: v })}
              />
              <SliderRow
                label="Blue Copy Threshold"
                value={config.blueCopyThreshold}
                min={65}
                max={170}
                step={2}
                unit="⚡"
                accent="accent-sky-400"
                onChange={(v) => onChangeConfig({ blueCopyThreshold: v })}
              />
              <SliderRow
                label="Blue Eating Time"
                value={config.blueEatTime}
                min={0.4}
                max={3.5}
                step={0.1}
                unit="s"
                accent="accent-sky-400"
                onChange={(v) => onChangeConfig({ blueEatTime: v })}
              />
            </div>
          )}

          {/* Red Blob Rules */}
          {(activeTab === 'all' || activeTab === 'red') && (
            <div className="space-y-2.5 bg-[#0d1512] p-3 rounded-xl border border-rose-500/25">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Red Blobs (Contact Seekers)</span>
              </div>
              <SliderRow
                label="Red Energy Use"
                value={config.redEnergyUse}
                min={1.5}
                max={9.5}
                step={0.1}
                unit="/s"
                accent="accent-rose-400"
                onChange={(v) => onChangeConfig({ redEnergyUse: v })}
              />
              <SliderRow
                label="Red Speed"
                value={config.redSpeed}
                min={18}
                max={80}
                step={1}
                unit=" u/s"
                accent="accent-rose-400"
                onChange={(v) => onChangeConfig({ redSpeed: v })}
              />
              <SliderRow
                label="Red Vision"
                value={config.redVision}
                min={35}
                max={170}
                step={2}
                unit=" u"
                accent="accent-rose-400"
                onChange={(v) => onChangeConfig({ redVision: v })}
              />
              <SliderRow
                label="Red Contact Strength"
                value={config.redContactStrength}
                min={18}
                max={85}
                step={1}
                unit="⚡"
                accent="accent-rose-400"
                onChange={(v) => onChangeConfig({ redContactStrength: v })}
              />
              <SliderRow
                label="Red Copy Threshold"
                value={config.redCopyThreshold}
                min={75}
                max={185}
                step={2}
                unit="⚡"
                accent="accent-rose-400"
                onChange={(v) => onChangeConfig({ redCopyThreshold: v })}
              />
              <SliderRow
                label="Red Pause Time"
                value={config.redPauseTime}
                min={0.6}
                max={4.5}
                step={0.1}
                unit="s"
                accent="accent-rose-400"
                onChange={(v) => onChangeConfig({ redPauseTime: v })}
              />
            </div>
          )}

          {/* World & Initial Setup */}
          {(activeTab === 'all' || activeTab === 'world') && (
            <div className="space-y-2.5 bg-[#0d1512] p-3 rounded-xl border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <Trees className="w-3.5 h-3.5" />
                  <span>Dish World & Starting Groups</span>
                </div>
                <span className="text-[10px] text-emerald-400/70">Live / Reset</span>
              </div>
              <SliderRow
                label="Fruit Trees"
                value={config.startingTrees}
                min={3}
                max={26}
                step={1}
                unit=" trees"
                accent="accent-emerald-400"
                onChange={(v) => onChangeConfig({ startingTrees: v })}
              />
              <SliderRow
                label="Starting Blue Blobs"
                value={config.startingBlue}
                min={2}
                max={45}
                step={1}
                unit=" blue"
                accent="accent-sky-400"
                onChange={(v) => onChangeConfig({ startingBlue: v }, true)}
              />
              <SliderRow
                label="Starting Red Blobs"
                value={config.startingRed}
                min={0}
                max={35}
                step={1}
                unit=" red"
                accent="accent-rose-400"
                onChange={(v) => onChangeConfig({ startingRed: v }, true)}
              />
              <SliderRow
                label="World Dish Size"
                value={config.worldSize}
                min={160}
                max={290}
                step={5}
                unit=" r"
                accent="accent-emerald-400"
                onChange={(v) => onChangeConfig({ worldSize: v })}
              />
              <div className="flex items-center justify-between pt-1">
                <label className="text-xs text-emerald-100/80">Random Seed</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={config.seed}
                    onChange={(e) =>
                      onChangeConfig({ seed: Math.max(1, parseInt(e.target.value, 10) || 1) }, true)
                    }
                    className="w-24 px-2 py-1 rounded-lg bg-[#080d0b] border border-emerald-800/70 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChangeConfig({ seed: Math.floor(1000 + Math.random() * 9000) }, true)
                    }
                    className="p-1.5 rounded-lg bg-emerald-900/50 hover:bg-emerald-800/70 text-emerald-200"
                    title="Pick a new random seed"
                  >
                    <Dices className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  accent: string
  onChange: (value: number) => void
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  accent,
  onChange,
}) => {
  const formatted = step < 1 ? value.toFixed(step === 0.05 ? 2 : 1) : Math.round(value).toString()

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-emerald-100/85">{label}</span>
        <span className="font-mono text-[11px] text-white font-semibold">
          {formatted}
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
        className={`w-full h-1.5 bg-[#080e0b] rounded-lg appearance-none cursor-pointer ${accent}`}
      />
    </div>
  )
}
