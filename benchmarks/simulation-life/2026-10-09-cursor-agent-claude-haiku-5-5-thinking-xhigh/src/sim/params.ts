export interface Params {
  // fruit
  fruitGrowth: number; // fraction of one fruit ripened per sim second
  fruitLimit: number; // max fruit hanging per tree
  fruitReturnDelay: number; // seconds after a pick before regrowth starts
  startTrees: number;
  // blue
  blueEnergyUse: number;
  blueSpeed: number;
  blueVision: number;
  blueCopyThreshold: number;
  blueEatTime: number;
  startBlue: number;
  // red
  redEnergyUse: number;
  redSpeed: number;
  redVision: number;
  redContactStrength: number;
  redCopyThreshold: number;
  redPauseTime: number;
  startRed: number;
  // world
  worldSize: number; // garden radius in world units
  seed: number;
}

export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 0.12,
  fruitLimit: 4,
  fruitReturnDelay: 4,
  startTrees: 6,
  blueEnergyUse: 1,
  blueSpeed: 1.2,
  blueVision: 4.5,
  blueCopyThreshold: 78,
  blueEatTime: 2.5,
  startBlue: 24,
  redEnergyUse: 1.3,
  redSpeed: 1.5,
  redVision: 5,
  redContactStrength: 14,
  redCopyThreshold: 60,
  redPauseTime: 3,
  startRed: 8,
  worldSize: 14,
  seed: 4242,
};

export type ParamKey = keyof Params;
export type ParamGroup = 'fruit' | 'blue' | 'red' | 'world';

export interface ParamSpec {
  key: ParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  group: ParamGroup;
  /** Needs a fresh garden to take effect (starting counts, size, seed). */
  reset?: boolean;
}

export const PARAM_SPECS: ParamSpec[] = [
  { key: 'fruitGrowth', label: 'Fruit growth speed', min: 0.01, max: 0.3, step: 0.005, unit: '', group: 'fruit' },
  { key: 'fruitLimit', label: 'Fruit limit', min: 1, max: 10, step: 1, unit: 'per tree', group: 'fruit' },
  { key: 'fruitReturnDelay', label: 'Fruit return delay', min: 0, max: 30, step: 0.5, unit: 's', group: 'fruit' },
  { key: 'startTrees', label: 'Starting trees', min: 1, max: 16, step: 1, unit: '', group: 'fruit', reset: true },

  { key: 'blueEnergyUse', label: 'Energy use', min: 0.2, max: 3, step: 0.05, unit: '', group: 'blue' },
  { key: 'blueSpeed', label: 'Speed', min: 0.4, max: 2.4, step: 0.05, unit: '', group: 'blue' },
  { key: 'blueVision', label: 'Vision', min: 1.5, max: 9, step: 0.1, unit: '', group: 'blue' },
  { key: 'blueCopyThreshold', label: 'Copy threshold', min: 45, max: 95, step: 1, unit: 'energy', group: 'blue' },
  { key: 'blueEatTime', label: 'Eating time', min: 0.5, max: 6, step: 0.1, unit: 's', group: 'blue' },
  { key: 'startBlue', label: 'Starting blue blobs', min: 0, max: 80, step: 1, unit: '', group: 'blue', reset: true },

  { key: 'redEnergyUse', label: 'Energy use', min: 0.2, max: 3, step: 0.05, unit: '', group: 'red' },
  { key: 'redSpeed', label: 'Speed', min: 0.4, max: 2.8, step: 0.05, unit: '', group: 'red' },
  { key: 'redVision', label: 'Vision', min: 1.5, max: 9, step: 0.1, unit: '', group: 'red' },
  { key: 'redContactStrength', label: 'Contact strength', min: 4, max: 30, step: 0.5, unit: 'energy', group: 'red' },
  { key: 'redCopyThreshold', label: 'Copy threshold', min: 45, max: 95, step: 1, unit: 'energy', group: 'red' },
  { key: 'redPauseTime', label: 'Pause time', min: 0.2, max: 5, step: 0.1, unit: 's', group: 'red' },
  { key: 'startRed', label: 'Starting red blobs', min: 0, max: 50, step: 1, unit: '', group: 'red', reset: true },

  { key: 'worldSize', label: 'World size', min: 8, max: 24, step: 0.5, unit: 'radius', group: 'world', reset: true },
  { key: 'seed', label: 'Random seed', min: 1, max: 99999, step: 1, unit: '', group: 'world', reset: true },
];

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  params: Partial<Params>;
}

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    name: 'Balanced garden',
    blurb: 'Default tuning. Blue and red trade the lead in long waves.',
    params: {},
  },
  {
    id: 'fruit-rich',
    name: 'Fruit-rich garden',
    blurb: 'Fast-ripening trees. Blue blobs boom first and red follows.',
    params: { fruitGrowth: 0.2, fruitLimit: 6, fruitReturnDelay: 2, startTrees: 9, startBlue: 30 },
  },
  {
    id: 'red-heavy',
    name: 'Red-heavy garden',
    blurb: 'Crowd of red hunters. Blue dips first, then red crashes.',
    params: { startRed: 24, startBlue: 20, redEnergyUse: 1.5 },
  },
  {
    id: 'fragile',
    name: 'Fragile balance',
    blurb: 'Tight margins. Small nudges tip the garden either way.',
    params: { fruitGrowth: 0.085, fruitReturnDelay: 6, redEnergyUse: 1.45, redContactStrength: 13 },
  },
  {
    id: 'low-fruit',
    name: 'Low-fruit garden',
    blurb: 'Scarce fruit and few trees. Both groups stay small.',
    params: { fruitGrowth: 0.07, fruitLimit: 3, fruitReturnDelay: 8, startTrees: 5, startBlue: 14, startRed: 5, redEnergyUse: 1.0 },
  },
];

/** Presets reset tuning to defaults, then apply their overrides. Seed and garden size are kept. */
export function withPreset(base: Params, preset: Preset): Params {
  return { ...DEFAULT_PARAMS, ...preset.params, seed: base.seed, worldSize: base.worldSize };
}
