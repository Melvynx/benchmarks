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
  mutation: number;
  trees: number;
  blueStart: number;
  redStart: number;
  worldSize: number;
  seed: number;
}

export type ParamKey = keyof Params;
export type ParamGroup = "garden" | "blue" | "red" | "start";

export interface ParamSpec {
  key: ParamKey;
  label: string;
  group: ParamGroup;
  min: number;
  max: number;
  step: number;
  hint: string;
  resetOnly?: boolean;
  format: (v: number) => string;
}

const fixed = (d: number, unit = "") => (v: number) => `${v.toFixed(d)}${unit}`;

export const PARAM_SPECS: ParamSpec[] = [
  {
    key: "fruitGrowth",
    label: "Fruit growth speed",
    group: "garden",
    min: 0.03,
    max: 0.5,
    step: 0.01,
    hint: "How fast a fresh fruit swells until it is ripe",
    format: (v) => `${(1 / v).toFixed(v > 0.1 ? 1 : 0)}s to ripen`,
  },
  {
    key: "fruitLimit",
    label: "Fruit limit",
    group: "garden",
    min: 1,
    max: 12,
    step: 1,
    hint: "Fruit spots on each tree",
    format: (v) => `${v} per tree`,
  },
  {
    key: "fruitDelay",
    label: "Fruit return delay",
    group: "garden",
    min: 0,
    max: 40,
    step: 0.5,
    hint: "Rest time after a fruit is eaten before it starts regrowing",
    format: fixed(1, "s"),
  },
  {
    key: "blueEnergyUse",
    label: "Energy use",
    group: "blue",
    min: 0.4,
    max: 2.5,
    step: 0.05,
    hint: "Multiplier on the cost of moving and waiting",
    format: (v) => `×${v.toFixed(2)}`,
  },
  {
    key: "blueSpeed",
    label: "Speed",
    group: "blue",
    min: 1,
    max: 5,
    step: 0.1,
    hint: "Top speed. Faster legs burn more energy",
    format: fixed(1, " u/s"),
  },
  {
    key: "blueVision",
    label: "Vision",
    group: "blue",
    min: 1.5,
    max: 14,
    step: 0.25,
    hint: "How far a blue spots fruit and reds",
    format: fixed(1, " u"),
  },
  {
    key: "blueCopyAt",
    label: "Copy threshold",
    group: "blue",
    min: 50,
    max: 250,
    step: 5,
    hint: "Energy needed to split in two (each fruit gives 30)",
    format: fixed(0, " energy"),
  },
  {
    key: "blueEatTime",
    label: "Eating time",
    group: "blue",
    min: 0.2,
    max: 6,
    step: 0.1,
    hint: "Chewing pause. Blues stand still and cannot escape while eating",
    format: fixed(1, "s"),
  },
  {
    key: "redEnergyUse",
    label: "Energy use",
    group: "red",
    min: 0.4,
    max: 2.5,
    step: 0.05,
    hint: "Multiplier on the cost of moving and waiting",
    format: (v) => `×${v.toFixed(2)}`,
  },
  {
    key: "redSpeed",
    label: "Speed",
    group: "red",
    min: 1,
    max: 6,
    step: 0.1,
    hint: "Top speed. Faster legs burn more energy",
    format: fixed(1, " u/s"),
  },
  {
    key: "redVision",
    label: "Vision",
    group: "red",
    min: 1.5,
    max: 16,
    step: 0.25,
    hint: "How far a red notices blue blobs",
    format: fixed(1, " u"),
  },
  {
    key: "redContact",
    label: "Contact strength",
    group: "red",
    min: 5,
    max: 120,
    step: 1,
    hint: "Energy a red gains from one boop",
    format: fixed(0, " energy"),
  },
  {
    key: "redCopyAt",
    label: "Copy threshold",
    group: "red",
    min: 50,
    max: 300,
    step: 5,
    hint: "Energy needed to split in two",
    format: fixed(0, " energy"),
  },
  {
    key: "redPauseTime",
    label: "Pause time",
    group: "red",
    min: 0,
    max: 12,
    step: 0.1,
    hint: "Happy rest after a boop before hunting again",
    format: fixed(1, "s"),
  },
  {
    key: "mutation",
    label: "Trait drift",
    group: "garden",
    min: 0,
    max: 0.2,
    step: 0.005,
    hint: "How much babies' speed and vision differ from their parent",
    format: (v) => `±${(v * 100).toFixed(1)}%`,
  },
  {
    key: "trees",
    label: "Fruit trees",
    group: "start",
    min: 3,
    max: 60,
    step: 1,
    hint: "Trees planted in a new garden",
    resetOnly: true,
    format: fixed(0),
  },
  {
    key: "blueStart",
    label: "Blue blobs",
    group: "start",
    min: 0,
    max: 300,
    step: 1,
    hint: "Blues placed in a new garden",
    resetOnly: true,
    format: fixed(0),
  },
  {
    key: "redStart",
    label: "Red blobs",
    group: "start",
    min: 0,
    max: 150,
    step: 1,
    hint: "Reds placed in a new garden",
    resetOnly: true,
    format: fixed(0),
  },
  {
    key: "worldSize",
    label: "World size",
    group: "start",
    min: 12,
    max: 34,
    step: 1,
    hint: "Radius of the garden dish",
    resetOnly: true,
    format: fixed(0, " u"),
  },
  {
    key: "seed",
    label: "Random seed",
    group: "start",
    min: 1,
    max: 999999,
    step: 1,
    hint: "Same seed + same settings = same story",
    resetOnly: true,
    format: fixed(0),
  },
];

export const SPEC_BY_KEY = Object.fromEntries(PARAM_SPECS.map((s) => [s.key, s])) as Record<
  ParamKey,
  ParamSpec
>;

export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 0.14,
  fruitLimit: 6,
  fruitDelay: 6,
  blueEnergyUse: 1,
  blueSpeed: 2.6,
  blueVision: 6,
  blueCopyAt: 75,
  blueEatTime: 1.4,
  redEnergyUse: 1,
  redSpeed: 2.6,
  redVision: 7,
  redContact: 34,
  redCopyAt: 150,
  redPauseTime: 2.5,
  mutation: 0.03,
  trees: 24,
  blueStart: 60,
  redStart: 10,
  worldSize: 22,
  seed: 4242,
};

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  params: Partial<Params>;
  speed?: number;
}

export const PRESETS: Preset[] = [
  {
    id: "balanced",
    name: "Balanced garden",
    blurb: "Blues and reds chase each other in long, out-of-phase waves.",
    params: {},
  },
  {
    id: "rich",
    name: "Fruit-rich garden",
    blurb: "More trees, more fruit, faster regrowth. Blues boom quickly and reds ride bigger waves.",
    params: { trees: 30, fruitLimit: 7, fruitGrowth: 0.2, fruitDelay: 4, worldSize: 25 },
  },
  {
    id: "redheavy",
    name: "Red-heavy garden",
    blurb: "Almost as many reds as blues at the start. Blues dip first, then hungry reds fade.",
    params: { redStart: 45, blueStart: 50 },
  },
  {
    id: "fragile",
    name: "Fragile balance",
    blurb: "Sharper-eyed, quicker reds that rest less. Big swings, and some seeds collapse.",
    params: { redVision: 8.5, redSpeed: 2.75, redPauseTime: 1.8 },
  },
  {
    id: "lowfruit",
    name: "Low-fruit garden",
    blurb: "Few slow trees. Blues stay few, and reds struggle to find enough of them.",
    params: { trees: 10, fruitLimit: 4, fruitGrowth: 0.1, fruitDelay: 10, worldSize: 18, blueStart: 25, redStart: 6 },
  },
  {
    id: "meadow",
    name: "Blue meadow",
    blurb: "No reds at all. Blues level out where the fruit supply says stop.",
    params: { redStart: 0 },
  },
];

export function presetParams(preset: Preset, seed?: number): Params {
  return { ...DEFAULT_PARAMS, ...preset.params, ...(seed !== undefined ? { seed } : {}) };
}

export function clampParam(key: ParamKey, v: number): number {
  const s = SPEC_BY_KEY[key];
  const stepped = Math.round(v / s.step) * s.step;
  return Math.min(s.max, Math.max(s.min, Number(stepped.toFixed(4))));
}
