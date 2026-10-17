import React from 'react'
import { Crosshair, HeartHandshake, Sparkles, Timer, UserCheck, X, Zap } from 'lucide-react'
import { BlobAction, BlobEntity, SimConfig } from '../sim/types'

interface BlobInspectorProps {
  blob: BlobEntity | null
  config: SimConfig
  onClear: () => void
  onPickSampleBlob: (species?: 'blue' | 'red') => void
}

const ACTION_LABELS: Record<BlobAction, { label: string; color: string }> = {
  wandering: { label: 'Wandering Dish', color: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' },
  seeking_fruit: { label: 'Seeking Ripe Fruit', color: 'bg-lime-500/20 text-lime-200 border-lime-500/40' },
  gathering: { label: 'Gathering Near Tree', color: 'bg-teal-500/20 text-teal-200 border-teal-500/30' },
  avoiding_crowd: { label: 'Avoiding Crowd', color: 'bg-amber-500/20 text-amber-200 border-amber-500/30' },
  fleeing: { label: 'Evading Red Seeker!', color: 'bg-orange-500/25 text-orange-200 border-orange-400/50' },
  eating: { label: 'Chewing Green Fruit', color: 'bg-lime-400/30 text-lime-100 border-lime-400/60' },
  hunting: { label: 'Approaching Blue Blob', color: 'bg-rose-500/25 text-rose-200 border-rose-400/50' },
  pausing: { label: 'Post-Contact Pause', color: 'bg-pink-500/30 text-pink-100 border-pink-400/60' },
}

export const BlobInspector: React.FC<BlobInspectorProps> = ({
  blob,
  config,
  onClear,
  onPickSampleBlob,
}) => {
  if (!blob) {
    return (
      <div className="rounded-2xl bg-[#131d19] border border-emerald-900/60 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Blob Inspector
            </h3>
          </div>
          <span className="text-[11px] text-emerald-200/60">Click any blob on the dish</span>
        </div>
        <p className="text-xs text-emerald-100/70 mb-3">
          Select a glossy blue or red blob in the garden dish to inspect its live energy, current decision, sensing range, pause countdown, and inherited family traits.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPickSampleBlob('blue')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-xs font-medium text-sky-200 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Inspect a Blue Blob</span>
          </button>
          <button
            type="button"
            onClick={() => onPickSampleBlob('red')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-xs font-medium text-rose-200 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Inspect a Red Blob</span>
          </button>
        </div>
      </div>
    )
  }

  const isBlue = blob.species === 'blue'
  const copyThreshold = isBlue ? config.blueCopyThreshold : config.redCopyThreshold
  const baseSpeed = isBlue ? config.blueSpeed : config.redSpeed
  const baseVision = isBlue ? config.blueVision : config.redVision
  const effectiveMaxSpeed = baseSpeed * blob.traits.speedTrait
  const currentSpeed = Math.hypot(blob.vx, blob.vy)
  const effectiveVision = baseVision * blob.traits.visionTrait
  const energyPct = Math.min(100, Math.round((blob.energy / copyThreshold) * 100))
  const actionMeta = ACTION_LABELS[blob.action]

  return (
    <div
      className={`rounded-2xl bg-[#131d19] border p-4 shadow-lg transition-colors ${
        isBlue ? 'border-sky-500/50' : 'border-rose-500/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-inner border ${
              isBlue
                ? 'bg-gradient-to-br from-sky-300 via-sky-500 to-sky-800 border-sky-200/60'
                : 'bg-gradient-to-br from-rose-300 via-rose-500 to-rose-800 border-rose-200/60'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-950">••</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{blob.name}</h3>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  isBlue
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {isBlue ? 'Blue Group' : 'Red Group'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/70 font-mono">
              Gen #{blob.generation} • Age {blob.age.toFixed(1)}s •{' '}
              {blob.parentId ? `Parent ${blob.parentId}` : 'Founder'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200/70 hover:text-white transition-colors"
          title="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Current Action + Animation Timer */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 p-2.5 rounded-xl bg-[#0c1411] border border-emerald-900/50">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-emerald-300/60 block mb-0.5">
            Current Action
          </span>
          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${actionMeta.color}`}>
            {actionMeta.label}
          </span>
        </div>

        <div className="text-right font-mono">
          <span className="text-[10px] uppercase tracking-wider text-emerald-300/60 flex items-center justify-end gap-1 mb-0.5">
            <Timer className="w-3 h-3" />
            <span>Animation Pause Left</span>
          </span>
          <span className="text-xs font-semibold text-amber-300">
            {blob.actionTimer > 0
              ? `${blob.actionTimer.toFixed(2)}s (${blob.action === 'eating' ? 'Chewing' : 'Resting'})`
              : '0.00s (Active)'}
          </span>
        </div>
      </div>

      {/* Energy to Copy Threshold Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="flex items-center gap-1 text-emerald-100/90 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Stored Energy</span>
          </span>
          <span className="font-mono text-xs text-white">
            {blob.energy.toFixed(1)} / {copyThreshold} copy threshold ({energyPct}%)
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-[#09100d] overflow-hidden border border-emerald-950">
          <div
            className={`h-full transition-all duration-150 ${
              isBlue
                ? 'bg-gradient-to-r from-sky-500 to-cyan-300'
                : 'bg-gradient-to-r from-rose-500 to-amber-300'
            }`}
            style={{ width: `${Math.min(100, (blob.energy / copyThreshold) * 100)}%` }}
          />
        </div>
      </div>

      {/* Speed, Vision, and Lifetime Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
        <div className="p-2 rounded-xl bg-[#0c1411] border border-emerald-900/40">
          <span className="text-[10px] uppercase text-emerald-300/60 block">Speed (Now / Max)</span>
          <span className="text-white font-semibold">
            {currentSpeed.toFixed(1)} / {effectiveMaxSpeed.toFixed(1)} u/s
          </span>
        </div>
        <div className="p-2 rounded-xl bg-[#0c1411] border border-emerald-900/40">
          <span className="text-[10px] uppercase text-emerald-300/60 block">Sensing Range</span>
          <span className="text-white font-semibold">{effectiveVision.toFixed(1)} units</span>
        </div>
      </div>

      {/* Inherited Traits & Lineage Info */}
      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-emerald-900/50 text-emerald-200/80 font-mono">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>
            Traits: Spd ×{blob.traits.speedTrait.toFixed(2)} • Vis ×{blob.traits.visionTrait.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            {blob.childrenCount} babies
          </span>
          <span className="flex items-center gap-1">
            <HeartHandshake className="w-3.5 h-3.5 text-pink-400" />
            {isBlue ? `${blob.fruitsEaten} fruits` : `${blob.contactsMade} contacts`}
          </span>
        </div>
      </div>
    </div>
  )
}
