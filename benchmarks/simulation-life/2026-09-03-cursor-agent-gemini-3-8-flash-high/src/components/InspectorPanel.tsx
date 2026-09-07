import React from 'react';
import {
  Heart,
  Zap,
  Eye,
  Gauge,
  Clock,
  Camera,
  X,
  Cookie,
  Smile,
} from 'lucide-react';
import { BlobEntity, SimulationConfig } from '../types/simulation';

interface InspectorPanelProps {
  blob: BlobEntity | null;
  config: SimulationConfig;
  isTracked: boolean;
  onToggleTrack: () => void;
  onFeedBlob: () => void;
  onCheerBlob: () => void;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  blob,
  config,
  isTracked,
  onToggleTrack,
  onFeedBlob,
  onCheerBlob,
  onClose,
}) => {
  if (!blob) return null;

  const isBlue = blob.species === 'blue';
  const energyPercent = Math.max(0, Math.min(100, (blob.energy / blob.maxEnergy) * 100));

  const baseSpeed = isBlue ? config.blueBaseSpeed : config.redBaseSpeed;
  const baseVision = isBlue ? config.blueBaseVision : config.redBaseVision;
  const actualSpeed = (baseSpeed * blob.traits.speed).toFixed(1);
  const actualVision = (baseVision * blob.traits.vision).toFixed(1);

  const getActionLabel = () => {
    switch (blob.action) {
      case 'eating':
        return {
          title: 'Chewing sweet fruit...',
          color: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
          icon: '😋',
        };
      case 'foraging':
        return {
          title: 'Searching for ripe fruit',
          color: 'text-cyan-400 bg-cyan-950/80 border-cyan-800',
          icon: '🍎',
        };
      case 'fleeing':
        return {
          title: 'Panicking & fleeing predator!',
          color: 'text-amber-400 bg-amber-950/80 border-amber-800',
          icon: '💨',
        };
      case 'hunting':
        return {
          title: 'Stalking blue forager',
          color: 'text-rose-400 bg-rose-950/80 border-rose-800',
          icon: '🎯',
        };
      case 'paused':
        return {
          title: 'Satisfied rest after contact',
          color: 'text-purple-400 bg-purple-950/80 border-purple-800',
          icon: '😌',
        };
      case 'reproducing':
        return {
          title: 'Dividing into next generation',
          color: 'text-pink-400 bg-pink-950/80 border-pink-800',
          icon: '✨',
        };
      default:
        return {
          title: 'Wandering peacefully',
          color: 'text-slate-300 bg-slate-800/80 border-slate-700',
          icon: '🧭',
        };
    }
  };

  const actionInfo = getActionLabel();

  return (
    <aside className="absolute top-20 right-4 z-20 w-80 sm:w-84 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all text-slate-200">
      {/* Header Bar */}
      <div
        className={`p-3.5 border-b flex items-center justify-between ${
          isBlue ? 'bg-blue-950/40 border-blue-900/60' : 'bg-rose-950/40 border-rose-900/60'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              isBlue ? 'bg-sky-400 shadow-[0_0_10px_#38bdf8]' : 'bg-rose-400 shadow-[0_0_10px_#f43f5e]'
            }`}
          />
          <div>
            <h3 className="text-sm font-display font-bold text-slate-100 flex items-center gap-1.5">
              <span>{blob.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono text-slate-400">
                #G{blob.generation}
              </span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {isBlue ? 'Blue Forager' : 'Red Predator'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTrack}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isTracked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title={isTracked ? 'Stop camera follow' : 'Follow with camera'}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Stats Body */}
      <div className="p-3.5 space-y-3.5">
        {/* Action Status Badge */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${actionInfo.color}`}>
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base">{actionInfo.icon}</span>
            <span>{actionInfo.title}</span>
          </div>
          {blob.actionTimer > 0 && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40">
              {blob.actionTimer.toFixed(1)}s left
            </span>
          )}
        </div>

        {/* Energy Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Stored Energy</span>
            </span>
            <span className="font-mono text-slate-200">
              <span className="font-bold text-amber-300">{Math.round(blob.energy)}</span>
              <span className="text-slate-500"> / {blob.maxEnergy}</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                energyPercent > 50
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : energyPercent > 25
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-rose-600 to-rose-400 animate-pulse'
              }`}
              style={{ width: `${energyPercent}%` }}
            />
          </div>
        </div>

        {/* Vital Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Age / Life</span>
            </span>
            <div className="font-mono font-bold text-slate-100">{blob.age.toFixed(1)}s</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>Speed</span>
            </span>
            <div className="font-mono font-bold text-slate-100">
              {actualSpeed} <span className="text-[10px] text-slate-500">({blob.traits.speed.toFixed(2)}x)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Eye className="w-3 h-3 text-purple-400" />
              <span>Vision Range</span>
            </span>
            <div className="font-mono font-bold text-slate-100">
              {actualVision}m <span className="text-[10px] text-slate-500">({blob.traits.vision.toFixed(2)}x)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Heart className="w-3 h-3 text-pink-400" />
              <span>Offspring</span>
            </span>
            <div className="font-mono font-bold text-slate-100">{blob.stats.offspringCount} children</div>
          </div>
        </div>

        {/* Lifetime Achievements */}
        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1.5 text-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Lifetime Milestones
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>{isBlue ? 'Fruit Meals Harvested' : 'Prey Contacts Made'}:</span>
            <span className="font-mono font-bold text-emerald-400">
              {isBlue ? blob.stats.fruitEaten : blob.stats.contactsMade}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Distance Explored:</span>
            <span className="font-mono text-slate-400">{blob.stats.distanceTraveled.toFixed(0)}m</span>
          </div>
        </div>

        {/* Interactive Direct Controls */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          <button
            onClick={onFeedBlob}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Feed (+40⚡)</span>
          </button>

          <button
            onClick={onCheerBlob}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Cheer Up</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
