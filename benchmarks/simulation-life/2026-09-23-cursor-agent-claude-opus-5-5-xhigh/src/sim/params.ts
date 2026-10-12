export interface Params {
  fruitGrowth: number;
  fruitLimit: number;
  fruitDelay: number;
  trees: number;
  worldSize: number;

  blueEnergyUse: number;
  blueSpeed: number;
  blueVision: number;
  blueCopy: number;
  blueEatTime: number;
  blueStart: number;

  redEnergyUse: number;
  redSpeed: number;
  redVision: number;
  redContact: number;
  redCopy: number;
  redPauseTime: number;
  redStart: number;

  traitDrift: number;
  seed: number;
  simSpeed: number;
}

export type ParamKey = keyof Params;
export type ParamGroup = "garden" | "blue" | "red" | "world";

export interface ParamMeta {
  key: ParamKey;
  label: string;
  group: ParamGroup;
  min: number;
  max: number;
  step: number;
  help: string;
  resetOnly?: boolean;
  log?: boolean;
  format: (v: number) => string;
}

/** Fixed rules of the garden that are not exposed as sliders. */
export const RULES = {
  dt: 1 / 20,
  fruitEnergy: 22,
  redEfficiency: 0.8,
  copyOverhead: 0.15,
  idleShare: 0.25,
  maxEnergyMult: 1.3,
  blueRadius: 0.4,
  redRadius: 0.46,
  treeTrunkRadius: 0.32,
  treeReach: 0.95,
  maxBlobs: 1400,
  maxFruitSlots: 10,
  fadeTime: 1.1,
  startledTime: 0.55,
  chaseStamina: 5,
  tiredTime: 1.6,
  redSpacing: 2.2,
  fleeBurst: 1.2,
  shelterRadius: 1.8,
  shelterSlots: 1,
  hideMemory: 4,
  boldBelow: 0.2,
  boldFleeDistance: 1.8,
  huntTime: [3, 6] as const,
  lurkTime: [2, 5] as const,
  sampleInterval: 0.5,
} as const;

export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 0.1,
  fruitLimit: 5,
  fruitDelay: 6,
  trees: 20,
  worldSize: 18,

  blueEnergyUse: 2,
  blueSpeed: 2,
  blueVision: 4.5,
  blueCopy: 60,
  blueEatTime: 1.4,
  blueStart: 60,

  redEnergyUse: 1.5,
  redSpeed: 2.2,
  redVision: 4.5,
  redContact: 45,
  redCopy: 100,
  redPauseTime: 2.5,
  redStart: 8,

  traitDrift: 0.05,
  seed: 7,
  simSpeed: 4,
};

const fixed = (d: number, unit = "") => (v: number) => `${v.toFixed(d)}${unit}`;

export const PARAM_META: ParamMeta[] = [
  {
    key: "fruitGrowth",
    label: "Fruit growth speed",
    group: "garden",
    min: 0.02,
    max: 0.5,
    step: 0.01,
    log: true,
    help: "How fast a new fruit swells on the branch once it starts growing.",
    format: (v) => `${(1 / v).toFixed(v > 0.2 ? 1 : 0)}s to ripen`,
  },
  {
    key: "fruitLimit",
    label: "Fruit limit",
    group: "garden",
    min: 1,
    max: 10,
    step: 1,
    help: "Most fruit a single tree can hold at once.",
    format: (v) => `${v} per tree`,
  },
  {
    key: "fruitDelay",
    label: "Fruit return delay",
    group: "garden",
    min: 0,
    max: 30,
    step: 0.5,
    help: "Rest time on the branch after a fruit is eaten, before a new one begins to grow.",
    format: fixed(1, "s"),
  },
  {
    key: "trees",
    label: "Starting fruit trees",
    group: "garden",
    min: 1,
    max: 40,
    step: 1,
    resetOnly: true,
    help: "Number of fruit trees planted when the garden resets.",
    format: (v) => `${v} trees`,
  },
  {
    key: "worldSize",
    label: "World size",
    group: "garden",
    min: 8,
    max: 26,
    step: 1,
    resetOnly: true,
    help: "Radius of the garden dish.",
    format: fixed(0, " m"),
  },

  {
    key: "blueEnergyUse",
    label: "Energy use",
    group: "blue",
    min: 0.4,
    max: 6,
    step: 0.1,
    help: "Energy burned per second while moving at full speed. Waiting burns about a quarter of this.",
    format: fixed(1, "/s"),
  },
  {
    key: "blueSpeed",
    label: "Speed",
    group: "blue",
    min: 0.5,
    max: 4.5,
    step: 0.1,
    help: "Top speed. Faster moves cost more energy (cost grows with speed squared).",
    format: fixed(1, " m/s"),
  },
  {
    key: "blueVision",
    label: "Vision",
    group: "blue",
    min: 1,
    max: 12,
    step: 0.5,
    help: "How far a blue blob can spot fruit and red blobs.",
    format: fixed(1, " m"),
  },
  {
    key: "blueCopy",
    label: "Copy threshold",
    group: "blue",
    min: 25,
    max: 160,
    step: 1,
    help: "Energy needed to copy. The copy costs 15% of this, then the rest is split in half.",
    format: fixed(0, " energy"),
  },
  {
    key: "blueEatTime",
    label: "Eating time",
    group: "blue",
    min: 0.2,
    max: 6,
    step: 0.1,
    help: "Seconds spent chewing a fruit. A chewing blob can't run away.",
    format: fixed(1, "s"),
  },
  {
    key: "blueStart",
    label: "Starting blue blobs",
    group: "blue",
    min: 0,
    max: 250,
    step: 1,
    resetOnly: true,
    help: "Blue blobs placed when the garden resets.",
    format: fixed(0),
  },

  {
    key: "redEnergyUse",
    label: "Energy use",
    group: "red",
    min: 0.4,
    max: 7,
    step: 0.1,
    help: "Energy burned per second while moving at full speed. Waiting burns about a quarter of this.",
    format: fixed(1, "/s"),
  },
  {
    key: "redSpeed",
    label: "Speed",
    group: "red",
    min: 0.5,
    max: 5,
    step: 0.1,
    help: "Top speed while chasing. Wandering is slower and cheaper.",
    format: fixed(1, " m/s"),
  },
  {
    key: "redVision",
    label: "Vision",
    group: "red",
    min: 1,
    max: 14,
    step: 0.5,
    help: "How far a red blob can spot a blue blob.",
    format: fixed(1, " m"),
  },
  {
    key: "redContact",
    label: "Contact strength",
    group: "red",
    min: 5,
    max: 120,
    step: 1,
    help: "Energy a red blob draws from a blue blob on contact (80% of it is kept). A blue blob left with none fades.",
    format: fixed(0, " energy"),
  },
  {
    key: "redCopy",
    label: "Copy threshold",
    group: "red",
    min: 30,
    max: 220,
    step: 1,
    help: "Energy needed to copy. The copy costs 15% of this, then the rest is split in half.",
    format: fixed(0, " energy"),
  },
  {
    key: "redPauseTime",
    label: "Pause time",
    group: "red",
    min: 0,
    max: 12,
    step: 0.1,
    help: "Seconds a red blob rests after a contact before it can look again.",
    format: fixed(1, "s"),
  },
  {
    key: "redStart",
    label: "Starting red blobs",
    group: "red",
    min: 0,
    max: 120,
    step: 1,
    resetOnly: true,
    help: "Red blobs placed when the garden resets.",
    format: fixed(0),
  },

  {
    key: "traitDrift",
    label: "Trait drift",
    group: "world",
    min: 0,
    max: 0.25,
    step: 0.01,
    help: "How much a copy's speed and vision genes wander from its parent's. 0 makes perfect clones.",
    format: (v) => (v === 0 ? "clones" : `±${Math.round(v * 100)}%`),
  },
  {
    key: "seed",
    label: "Random seed",
    group: "world",
    min: 1,
    max: 9999,
    step: 1,
    resetOnly: true,
    help: "Same seed and settings replay the same garden.",
    format: fixed(0),
  },
  {
    key: "simSpeed",
    label: "Simulation speed",
    group: "world",
    min: 0.25,
    max: 32,
    step: 0.25,
    log: true,
    help: "Garden seconds per real second.",
    format: (v) => `${v < 1 ? v.toFixed(2) : v.toFixed(v < 10 ? 1 : 0)}×`,
  },
];

export const META_BY_KEY = Object.fromEntries(PARAM_META.map((m) => [m.key, m])) as Record<
  ParamKey,
  ParamMeta
>;

export const RESET_KEYS = PARAM_META.filter((m) => m.resetOnly).map((m) => m.key);

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  params: Partial<Params>;
}

export const PRESETS: Preset[] = [
  {
    id: "balanced",
    name: "Balanced garden",
    blurb: "Blue and red rise and fall in long, offset waves.",
    params: {},
  },
  {
    id: "fruit-rich",
    name: "Fruit-rich garden",
    blurb: "Heavy branches. Blue booms fast, red follows hungry.",
    params: {
      fruitGrowth: 0.25,
      fruitLimit: 8,
      fruitDelay: 2,
      trees: 22,
    },
  },
  {
    id: "red-heavy",
    name: "Red-heavy garden",
    blurb: "Too many reds at the start. Blue dips first, red fades later.",
    params: {
      redStart: 45,
    },
  },
  {
    id: "fragile",
    name: "Fragile balance",
    blurb: "Few trees to hide under, sharp-eyed reds. Big swings; now and then red doesn't make it.",
    params: {
      trees: 10,
      fruitGrowth: 0.22,
      redVision: 6,
    },
  },
  {
    id: "low-fruit",
    name: "Low-fruit garden",
    blurb: "Sparse trees, slow fruit. Everyone stays small.",
    params: {
      fruitGrowth: 0.05,
      fruitLimit: 2,
      fruitDelay: 12,
      trees: 9,
      blueStart: 20,
      redStart: 4,
    },
  },
];

export function presetParams(id: string, keep?: Partial<Params>): Params {
  const preset = PRESETS.find((p) => p.id === id) ?? PRESETS[0];
  return { ...DEFAULT_PARAMS, ...preset.params, ...keep };
}

export function clampParam(key: ParamKey, v: number): number {
  const m = META_BY_KEY[key];
  const c = Math.min(m.max, Math.max(m.min, v));
  return m.step >= 1 ? Math.round(c) : c;
}
