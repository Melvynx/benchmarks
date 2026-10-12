export interface Params {
  fruitGrowth: number;
  fruitLimit: number;
  fruitDelay: number;

  blueEnergyUse: number;
  blueSpeed: number;
  blueVision: number;
  blueCopyAt: number;
  blueEatTime: number;

  redEnergyUse: number;
  redSpeed: number;
  redVision: number;
  redContact: number;
  redCopyAt: number;
  redPauseTime: number;

  startTrees: number;
  startBlue: number;
  startRed: number;
  worldSize: number;
  seed: number;

  simSpeed: number;
  traitDrift: number;
}

export type ParamKey = keyof Params;
export type GroupId = "fruit" | "blue" | "red" | "start" | "sim";

export interface ParamMeta {
  key: ParamKey;
  label: string;
  group: GroupId;
  min: number;
  max: number;
  step: number;
  /** Changes to "start" params only take effect on reset. */
  live: boolean;
  format: (v: number) => string;
  hint: (v: number, p: Params) => string;
}

export const BASE_RIPEN_SECONDS = 10;

const fx = (d: number, suffix = "") => (v: number) => `${v.toFixed(d)}${suffix}`;

export const PARAM_META: ParamMeta[] = [
  {
    key: "fruitGrowth",
    label: "Fruit growth speed",
    group: "fruit",
    min: 0.2,
    max: 4,
    step: 0.05,
    live: true,
    format: fx(2, "×"),
    hint: (v) => `A fruit ripens in ~${(BASE_RIPEN_SECONDS / v).toFixed(0)}s once it starts growing`,
  },
  {
    key: "fruitLimit",
    label: "Fruit limit",
    group: "fruit",
    min: 1,
    max: 12,
    step: 1,
    live: true,
    format: (v) => `${v} / tree`,
    hint: (v, p) => `Up to ${v * p.startTrees} fruit in the garden at once`,
  },
  {
    key: "fruitDelay",
    label: "Fruit return delay",
    group: "fruit",
    min: 0,
    max: 30,
    step: 0.5,
    live: true,
    format: fx(1, "s"),
    hint: () => "Bare branch time after a fruit is eaten, before regrowth starts",
  },

  {
    key: "blueEnergyUse",
    label: "Energy use",
    group: "blue",
    min: 0.2,
    max: 3,
    step: 0.05,
    live: true,
    format: fx(2, "/s"),
    hint: () => "Energy burned per second while walking. Waiting burns 30% of this",
  },
  {
    key: "blueSpeed",
    label: "Speed",
    group: "blue",
    min: 0.5,
    max: 5,
    step: 0.1,
    live: true,
    format: fx(1, " u/s"),
    hint: () => "Faster blobs reach fruit and escape reds, but energy use grows with speed²",
  },
  {
    key: "blueVision",
    label: "Vision",
    group: "blue",
    min: 1,
    max: 10,
    step: 0.1,
    live: true,
    format: fx(1, " u"),
    hint: () => "How far a blue spots fruit. Red blobs are noticed at 65% of this",
  },
  {
    key: "blueCopyAt",
    label: "Copy threshold",
    group: "blue",
    min: 25,
    max: 150,
    step: 1,
    live: true,
    format: fx(0, " E"),
    hint: () => "Energy needed to bud a copy. 20% is lost, the rest is split in half",
  },
  {
    key: "blueEatTime",
    label: "Eating time",
    group: "blue",
    min: 0.2,
    max: 6,
    step: 0.1,
    live: true,
    format: fx(1, "s"),
    hint: () => "Chewing pause per fruit. Chewing blues don't watch for reds",
  },

  {
    key: "redEnergyUse",
    label: "Energy use",
    group: "red",
    min: 0.2,
    max: 4,
    step: 0.05,
    live: true,
    format: fx(2, "/s"),
    hint: () => "Energy burned per second while walking. Waiting burns 30% of this",
  },
  {
    key: "redSpeed",
    label: "Speed",
    group: "red",
    min: 0.5,
    max: 6,
    step: 0.1,
    live: true,
    format: fx(1, " u/s"),
    hint: () => "Chasing runs at 125% of this. Energy use grows with speed²",
  },
  {
    key: "redVision",
    label: "Vision",
    group: "red",
    min: 1,
    max: 12,
    step: 0.1,
    live: true,
    format: fx(1, " u"),
    hint: () => "How far a red spots blue blobs",
  },
  {
    key: "redContact",
    label: "Contact strength",
    group: "red",
    min: 5,
    max: 80,
    step: 1,
    live: true,
    format: fx(0, " E"),
    hint: () => "Energy a red draws from a blue per hug. A blue left near zero fades away",
  },
  {
    key: "redCopyAt",
    label: "Copy threshold",
    group: "red",
    min: 25,
    max: 220,
    step: 1,
    live: true,
    format: fx(0, " E"),
    hint: () => "Energy needed to bud a copy. 20% is lost, the rest is split in half",
  },
  {
    key: "redPauseTime",
    label: "Pause time",
    group: "red",
    min: 0,
    max: 12,
    step: 0.1,
    live: true,
    format: fx(1, "s"),
    hint: () => "Rest after each hug. Resting reds are harmless and blues know it",
  },

  {
    key: "startTrees",
    label: "Fruit trees",
    group: "start",
    min: 1,
    max: 30,
    step: 1,
    live: false,
    format: fx(0),
    hint: () => "Trees planted when the garden resets",
  },
  {
    key: "startBlue",
    label: "Blue blobs",
    group: "start",
    min: 0,
    max: 200,
    step: 1,
    live: false,
    format: fx(0),
    hint: () => "Blue blobs at reset",
  },
  {
    key: "startRed",
    label: "Red blobs",
    group: "start",
    min: 0,
    max: 80,
    step: 1,
    live: false,
    format: fx(0),
    hint: () => "Red blobs at reset",
  },
  {
    key: "worldSize",
    label: "World size",
    group: "start",
    min: 9,
    max: 28,
    step: 0.5,
    live: false,
    format: fx(1, " u"),
    hint: (v) => `Dish radius. Area ≈ ${Math.round(Math.PI * v * v)} u²`,
  },

  {
    key: "simSpeed",
    label: "Simulation speed",
    group: "sim",
    min: 0.25,
    max: 24,
    step: 0.25,
    live: true,
    format: fx(2, "×"),
    hint: () => "Simulated seconds per real second",
  },
  {
    key: "traitDrift",
    label: "Trait drift",
    group: "sim",
    min: 0,
    max: 0.15,
    step: 0.005,
    live: true,
    format: (v) => `${(v * 100).toFixed(1)}%`,
    hint: () => "How much a copy's speed and vision genes wander from its parent",
  },
];

export const META_BY_KEY = Object.fromEntries(PARAM_META.map((m) => [m.key, m])) as Record<
  ParamKey,
  ParamMeta
>;

export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 1.2,
  fruitLimit: 7,
  fruitDelay: 4,

  blueEnergyUse: 1,
  blueSpeed: 1.9,
  blueVision: 4.5,
  blueCopyAt: 60,
  blueEatTime: 1.5,

  redEnergyUse: 1,
  redSpeed: 2,
  redVision: 2.4,
  redContact: 15,
  redCopyAt: 95,
  redPauseTime: 3,

  startTrees: 14,
  startBlue: 60,
  startRed: 6,
  worldSize: 18,
  seed: 7,

  simSpeed: 3,
  traitDrift: 0.03,
};

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
    blurb: "Blues and reds rise and fall in long, out-of-phase waves.",
    params: {},
  },
  {
    id: "fruit-rich",
    name: "Fruit-rich garden",
    blurb: "Fast, heavy fruit. Blues boom within minutes, reds cash in, and the boom can bust.",
    params: { fruitGrowth: 1.8, fruitLimit: 9, fruitDelay: 2, startTrees: 16, startBlue: 30, startRed: 3 },
  },
  {
    id: "red-heavy",
    name: "Red-heavy garden",
    blurb: "Lots of hungry reds. Blues dip first, then reds run out of energy.",
    params: { startRed: 30 },
  },
  {
    id: "fragile",
    name: "Fragile balance",
    blurb: "Harder hugs, hungrier reds. Big swings on a knife edge; one group may not make it.",
    params: { redContact: 22, redEnergyUse: 1.4 },
  },
  {
    id: "low-fruit",
    name: "Low-fruit garden",
    blurb: "Few trees, slow fruit. Everything stays small.",
    params: { fruitGrowth: 0.6, fruitLimit: 4, fruitDelay: 10, startTrees: 6, startBlue: 25, startRed: 4 },
  },
];

export function presetParams(id: string, base: Params = DEFAULT_PARAMS): Params {
  const preset = PRESETS.find((p) => p.id === id);
  return { ...DEFAULT_PARAMS, simSpeed: base.simSpeed, ...(preset?.params ?? {}) };
}

export function clampParam(key: ParamKey, v: number): number {
  const m = META_BY_KEY[key];
  if (!m) return v;
  const stepped = Math.round((v - m.min) / m.step) * m.step + m.min;
  return Math.min(m.max, Math.max(m.min, Number(stepped.toFixed(4))));
}
