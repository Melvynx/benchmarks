import React from 'react';
import {
  X,
  Zap,
  Apple,
  Eye,
  Activity,
  Award,
  Video,
  Flame,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { BlobEntity } from '../types/simulation';

interface InspectorPanelProps {
  blob: BlobEntity | null;
  isTracked: boolean;
  onToggleTrack: () => void;
  onFeed: () => void;
  onPoke: () => void;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  blob,
  isTracked,
  onToggleTrack,
  onFeed,
  onPoke,
  onClose,
}) => {
  if (!blob) return null;

  const isBlue = blob.species === 'blue';
  const energyPercent = Math.min(100, Math.max(0, (blob.energy / blob.maxEnergy) * 100));

  const actionDetails: Record<string, { label: string; color: string; desc: string }> = {
    wandering: { label: 'Wandering', color: 'bg-slate-700 text-slate-200', desc: 'Exploring garden dish' },
    foraging: { label: 'Foraging Fruit', color: 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40', desc: 'Heading towards ripe plant fruit' },
    eating: { label: 'Eating Fruit', color: 'bg-emerald-500 text-slate-950 font-bold animate-pulse', desc: 'Chewing delicious green fruit' },
    fleeing: { label: 'Fleeing Danger!', color: 'bg-amber-500 text-slate-950 font-bold animate-bounce', desc: 'Sprinting away from predator' },
    hunting: { label: 'Hunting Prey', color: 'bg-rose-600/30 text-rose-300 border border-rose-500/40', desc: 'Pursuing nearby blue forager' },
    paused: { label: 'Digesting & Resting', color: 'bg-amber-600/30 text-amber-300 border border-amber-500/40', desc: 'Satisfied rest after contact' },
    reproducing: { label: 'Reproducing', color: 'bg-purple-600/30 text-purple-300', desc: 'Splitting into new offspring' },
    contacting: { label: 'Contacting', color: 'bg-rose-500 text-white font-bold', desc: 'Interacting with prey' },
  };

  const actionInfo = actionDetails[blob.action] || actionDetails.wandering;

  return (
    <div className="absolute top-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-in">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        isBlue
          ? 'bg-blue-950/50 border-blue-900/50'
          : 'bg-rose-950/50 border-rose-900/50'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-3.5 h-3.5 rounded-full ${isBlue ? 'bg-blue-400 shadow-blue-500/50' : 'bg-rose-400 shadow-rose-500/50'} shadow-md`} />
          <div>
            <h2 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <span>{blob.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 font-normal">
                Gen {blob.generation}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              {isBlue ? 'Blue Herbivore' : 'Red Predator'} · Age: {blob.age.toFixed(1)}s
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4 text-xs">
        {/* Energy Bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 flex items-center gap-1 font-medium text-[11px]">
              <Heart className={`w-3.5 h-3.5 ${isBlue ? 'text-blue-400' : 'text-rose-400'}`} />
              <span>Energy Stored</span>
            </span>
            <span className="font-mono font-bold text-slate-200">
              {blob.energy.toFixed(1)} <span className="text-slate-500 font-normal text-[10px]">/ {blob.maxEnergy.toFixed(0)}</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                isBlue
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                  : 'bg-gradient-to-r from-rose-500 to-amber-400'
              }`}
              style={{ width: `${energyPercent}%` }}
            />
          </div>
        </div>

        {/* Current State & Action */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Current Behavior:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${actionInfo.color}`}>
              {actionInfo.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            {actionInfo.desc}
          </p>
          {blob.actionTimer > 0 && (
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 pt-1 border-t border-slate-900">
              <span>Time left in action:</span>
              <span>{blob.actionTimer.toFixed(2)}s</span>
            </div>
          )}
        </div>

        {/* Genetic Traits */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span>Inherited Traits</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex flex-col">
              <span className="text-slate-500 text-[10px]">Speed Trait</span>
              <span className="font-bold text-slate-200">{(blob.traits.speed * 100).toFixed(0)}%</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex flex-col">
              <span className="text-slate-500 text-[10px]">Vision Trait</span>
              <span className="font-bold text-slate-200">{(blob.traits.vision * 100).toFixed(0)}%</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex flex-col">
              <span className="text-slate-500 text-[10px]">Efficiency</span>
              <span className="font-bold text-slate-200">{(blob.traits.efficiency * 100).toFixed(0)}%</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex flex-col">
              <span className="text-slate-500 text-[10px]">Body Size</span>
              <span className="font-bold text-slate-200">{(blob.traits.size * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Lifetime Achievements */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              <span>{isBlue ? 'Fruits Consumed' : 'Contacts Made'}</span>
            </span>
            <span className="font-mono text-slate-200 font-semibold">
              {isBlue ? blob.stats.fruitEaten : blob.stats.contactsMade}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Offspring Born</span>
            </span>
            <span className="font-mono text-slate-200 font-semibold">
              {blob.stats.offspringCount}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 grid grid-cols-3 gap-1.5">
          <button
            onClick={onToggleTrack}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-all ${
              isTracked
                ? 'bg-blue-600 text-white font-semibold shadow-md ring-1 ring-blue-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Lock camera to follow this blob"
          >
            <Video className="w-4 h-4 mb-1" />
            <span>{isTracked ? 'Following' : 'Track Cam'}</span>
          </button>

          <button
            onClick={onFeed}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 transition-all"
            title="Feed energy to this blob"
          >
            <Apple className="w-4 h-4 mb-1 text-emerald-400" />
            <span>Feed (+40)</span>
          </button>

          <button
            onClick={onPoke}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 transition-all"
            title="Poke and scatter blob"
          >
            <Zap className="w-4 h-4 mb-1 text-amber-400" />
            <span>Poke</span>
          </button>
        </div>
      </div>
    </div>
  );
};
