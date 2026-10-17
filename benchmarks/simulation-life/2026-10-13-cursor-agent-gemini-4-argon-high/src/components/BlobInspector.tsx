import React from 'react';
import {
  Activity,
  Clock,
  Compass,
  Eye,
  Gauge,
  GitBranch,
  Heart,
  Sparkles,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import type { BlobAction, BlobEntity, SimConfig } from '../simulation/types.ts';

interface BlobInspectorProps {
  selectedBlob: BlobEntity | null;
  allBlobs: BlobEntity[];
  config: SimConfig;
  onSelectBlob: (id: number | null) => void;
}

const ACTION_LABELS: Record<
  BlobAction,
  { label: string; detail: string; badgeClass: string }
> = {
  seeking_fruit: {
    label: 'Seeking Fruit',
    detail: 'Moving toward a tree with ripe green fruit',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  eating_fruit: {
    label: 'Eating Fruit',
    detail: 'Paused at branch, chewing fruit to restore energy',
    badgeClass: 'bg-green-100 text-green-900 border-green-300 animate-pulse',
  },
  fleeing_red: {
    label: 'Evading Red Blob',
    detail: 'Sensed a nearby red blob and steering away',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  avoiding_crowd: {
    label: 'Avoiding Crowd',
    detail: 'Spreading out from a dense cluster of blue blobs',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  gathering_near_trees: {
    label: 'Gathering Near Trees',
    detail: 'Hanging around an orchard waiting for buds to ripen',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  wandering: {
    label: 'Wandering Garden',
    detail: 'Exploring the circular dish in search of activity',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  seeking_blue: {
    label: 'Seeking Blue Blob',
    detail: 'Pursuing a nearby blue blob for a gentle contact',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  contact_pause: {
    label: 'Post-Contact Pause',
    detail: 'Bouncing happily after absorbing energy from contact',
    badgeClass: 'bg-pink-100 text-pink-900 border-pink-300 animate-pulse',
  },
};

export const BlobInspector: React.FC<BlobInspectorProps> = ({
  selectedBlob,
  allBlobs,
  config,
  onSelectBlob,
}) => {
  const pickRandomOfGroup = (group: 'blue' | 'red') => {
    const candidates = allBlobs.filter((b) => b.group === group);
    if (candidates.length === 0) return;
    if (selectedBlob && selectedBlob.group === group && candidates.length > 1) {
      const idx = candidates.findIndex((b) => b.id === selectedBlob.id);
      const next = candidates[(idx + 1) % candidates.length];
      onSelectBlob(next.id);
    } else {
      onSelectBlob(candidates[0].id);
    }
  };

  if (!selectedBlob) {
    const blueCount = allBlobs.filter((b) => b.group === 'blue').length;
    const redCount = allBlobs.filter((b) => b.group === 'red').length;

    return (
      <div className="bg-white/90 backdrop-blur-sm border border-[#E5DEC9] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-[#1F2924]">Blob Inspector</h2>
          </div>
          <span className="text-[11px] font-medium text-[#68766E] bg-[#F4F0E6] px-2 py-0.5 rounded-full">
            Click a blob on the dish
          </span>
        </div>

        <p className="text-xs text-[#55635B] mb-3 leading-relaxed">
          Click any glossy blue or red blob on the garden map—or pick one below—to
          inspect its live energy, current action, sensing range, pause timer, and
          inherited traits.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={blueCount === 0}
            onClick={() => pickRandomOfGroup('blue')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 disabled:opacity-40 transition"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            Inspect Blue ({blueCount})
          </button>
          <button
            type="button"
            disabled={redCount === 0}
            onClick={() => pickRandomOfGroup('red')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 disabled:opacity-40 transition"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            Inspect Red ({redCount})
          </button>
        </div>
      </div>
    );
  }

  const isBlue = selectedBlob.group === 'blue';
  const copyThreshold = isBlue
    ? config.blueCopyThreshold
    : config.redCopyThreshold;
  const baseSpeed = isBlue ? config.blueSpeed : config.redSpeed;
  const baseVision = isBlue ? config.blueVision : config.redVision;

  const effectiveSpeed = baseSpeed * selectedBlob.traits.speedTrait;
  const effectiveVision = baseVision * selectedBlob.traits.visionTrait;
  const currentVelocity = Math.hypot(selectedBlob.vx, selectedBlob.vz);
  const energyRatio = Math.min(
    100,
    Math.max(0, (selectedBlob.energy / copyThreshold) * 100)
  );
  const actionMeta = ACTION_LABELS[selectedBlob.action];

  const isPausedAction =
    selectedBlob.action === 'eating_fruit' ||
    selectedBlob.action === 'contact_pause';
  const pauseTimeLeft = isPausedAction
    ? Math.max(0, selectedBlob.actionTimer)
    : 0;
  const pauseProgress =
    isPausedAction && selectedBlob.actionDuration > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((selectedBlob.actionDuration - pauseTimeLeft) /
              selectedBlob.actionDuration) *
              100
          )
        )
      : 0;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-[#E5DEC9] rounded-2xl p-4 shadow-sm transition-all">
      {/* Header with Avatar, Name, Group Color & Quick Switchers */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          {/* Mini glossy blob badge */}
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner border ${
              isBlue
                ? 'bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 border-blue-300'
                : 'bg-gradient-to-br from-rose-400 via-rose-600 to-rose-800 border-rose-300'
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-[#1F2924]">
                {selectedBlob.name}
              </h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isBlue
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isBlue ? 'Blue Group' : 'Red Group'}
              </span>
            </div>
            <p className="text-[11px] text-[#68766E]">
              Gen {selectedBlob.generation} •{' '}
              {selectedBlob.parentId
                ? `Parent #${selectedBlob.parentId}`
                : 'Founder Blob'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => pickRandomOfGroup(selectedBlob.group)}
            title="Cycle to next blob in group"
            className="text-[11px] font-medium px-2 py-1 rounded-lg bg-[#F4F0E6] hover:bg-[#EAE3D2] text-[#334139] transition"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => onSelectBlob(null)}
            title="Clear selection"
            className="p-1 rounded-lg text-[#68766E] hover:bg-[#F4F0E6] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Action Badge */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#68766E] mb-1 flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Current Action
        </div>
        <div
          className={`border rounded-xl px-3 py-2 ${actionMeta.badgeClass}`}
        >
          <div className="text-xs font-bold">{actionMeta.label}</div>
          <div className="text-[11px] opacity-85">{actionMeta.detail}</div>
        </div>
      </div>

      {/* Energy Bar & Copy Threshold */}
      <div className="mb-3 bg-[#F9F7F2] border border-[#EBE5D5] rounded-xl p-2.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-[#334139] flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Energy
          </span>
          <span className="font-mono font-semibold text-[#1F2924]">
            {selectedBlob.energy.toFixed(1)}{' '}
            <span className="text-[#68766E] font-normal">
              / {copyThreshold} to copy
            </span>
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#E6E0D0] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isBlue
                ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                : 'bg-gradient-to-r from-rose-500 to-amber-400'
            }`}
            style={{ width: `${energyRatio}%` }}
          />
        </div>
      </div>

      {/* Animation Pause / Eating Countdown */}
      <div className="mb-3 bg-[#F9F7F2] border border-[#EBE5D5] rounded-xl p-2.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-[#334139] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            {isBlue ? 'Eating Animation Timer' : 'Contact Pause Timer'}
          </span>
          <span className="font-mono font-semibold text-[#1F2924]">
            {pauseTimeLeft > 0 ? `${pauseTimeLeft.toFixed(2)}s left` : '0.00s (Active)'}
          </span>
        </div>
        <div className="w-full h-2 bg-[#E6E0D0] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              pauseTimeLeft > 0 ? 'bg-emerald-500' : 'bg-transparent'
            }`}
            style={{ width: `${pauseProgress}%` }}
          />
        </div>
      </div>

      {/* Core Metrics Grid: Age, Speed, Sensing Range, Family/Traits */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#F9F7F2] border border-[#EBE5D5] rounded-xl p-2">
          <div className="text-[10px] text-[#68766E] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Age
          </div>
          <div className="font-mono font-bold text-[#1F2924] mt-0.5">
            {selectedBlob.age.toFixed(1)}s
          </div>
        </div>

        <div className="bg-[#F9F7F2] border border-[#EBE5D5] rounded-xl p-2">
          <div className="text-[10px] text-[#68766E] flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            Speed (Trait)
          </div>
          <div className="font-mono font-bold text-[#1F2924] mt-0.5">
            {effectiveSpeed.toFixed(0)} u/s{' '}
            <span className="text-[10px] font-normal text-[#68766E]">
              ({Math.round(selectedBlob.traits.speedTrait * 100)}%)
            </span>
          </div>
          <div className="text-[10px] text-[#68766E] font-mono">
            Now: {currentVelocity.toFixed(0)} u/s
          </div>
        </div>

        <div className="bg-[#F9F7F2] border border-[#EBE5D5] rounded-xl p-2">
          <div className="text-[10px] text-[#68766E] flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Sensing Range
          </div>
          <div className="font-mono font-bold text-[#1F2924] mt-0.5">
            {effectiveVision.toFixed(0)} u{' '}
            <span className="text-[10px] font-normal text-[#68766E]">
              ({Math.round(selectedBlob.traits.visionTrait * 100)}%)
            </span>
          </div>
        </div>

        <div className="bg-[#F9F7F2] border border-[#EBE5D5] rounded-xl p-2">
          <div className="text-[10px] text-[#68766E] flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            Lineage & Score
          </div>
          <div className="font-mono font-bold text-[#1F2924] mt-0.5">
            {selectedBlob.childrenCount} kids • {selectedBlob.interactionsCount}{' '}
            {isBlue ? 'fruit' : 'tags'}
          </div>
        </div>
      </div>
    </div>
  );
};
