export interface Params {
  fruitGrowth: number;
  fruitLimit: number;
  fruitReturnDelay: number;
  blueEnergyUse: number;
  blueSpeed: number;
  blueVision: number;
  blueRepro: number;
  blueEatTime: number;
  redEnergyUse: number;
  redSpeed: number;
  redVision: number;
  redContact: number;
  redRepro: number;
  redPause: number;
  trees: number;
  blueStart: number;
  redStart: number;
  worldSize: number;
  seed: number;
  simSpeed: number;
}

export interface ControlDef {
  key: keyof Params;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  group: "fruit" | "blue" | "red" | "world";
  format?: (v: number) => string;
}

export const DEFAULTS: Params = {
  fruitGrowth: 0.24,
  fruitLimit: 6,
  fruitReturnDelay: 3,
  blueEnergyUse: 1.7,
  blueSpeed: 3.2,
  blueVision: 10,
  blueRepro: 80,
  blueEatTime: 1.3,
  redEnergyUse: 1.3,
  redSpeed: 5,
  redVision: 9,
  redContact: 34,
  redRepro: 82,
  redPause: 2.6,
  trees: 26,
  blueStart: 30,
  redStart: 8,
  worldSize: 40,
  seed: 1234,
  simSpeed: 1,
};

const s1 = (v: number) => v.toFixed(1);
const s2 = (v: number) => v.toFixed(2);
const s0 = (v: number) => v.toFixed(0);

export const CONTROLS: ControlDef[] = [
  {
    key: "fruitGrowth",
    label: "Fruit growth speed",
    hint: "Fruit added per tree each second",
    min: 0.01,
    max: 0.4,
    step: 0.01,
    group: "fruit",
    format: s2,
  },
  {
    key: "fruitLimit",
    label: "Fruit limit",
    hint: "Most fruit a single tree can hold",
    min: 1,
    max: 14,
    step: 1,
    group: "fruit",
    format: s0,
  },
  {
    key: "fruitReturnDelay",
    label: "Fruit return delay",
    hint: "Pause before a picked tree regrows",
    min: 0,
    max: 20,
    step: 0.5,
    group: "fruit",
    format: (v) => `${s1(v)}s`,
  },
  {
    key: "blueEnergyUse",
    label: "Blue energy use",
    hint: "Energy burned per second while active",
    min: 0.4,
    max: 5,
    step: 0.05,
    group: "blue",
    format: s2,
  },
  {
    key: "blueSpeed",
    label: "Blue speed",
    hint: "Top travel speed",
    min: 0.8,
    max: 8,
    step: 0.1,
    group: "blue",
    format: s1,
  },
  {
    key: "blueVision",
    label: "Blue vision",
    hint: "How far a blue blob senses fruit and danger",
    min: 2,
    max: 30,
    step: 0.5,
    group: "blue",
    format: s1,
  },
  {
    key: "blueRepro",
    label: "Blue copy threshold",
    hint: "Energy needed before a blue blob copies itself",
    min: 30,
    max: 100,
    step: 1,
    group: "blue",
    format: s0,
  },
  {
    key: "blueEatTime",
    label: "Blue eating time",
    hint: "Seconds spent chewing one fruit",
    min: 0.2,
    max: 6,
    step: 0.1,
    group: "blue",
    format: (v) => `${s1(v)}s`,
  },
  {
    key: "redEnergyUse",
    label: "Red energy use",
    hint: "Energy burned per second while active",
    min: 0.3,
    max: 5,
    step: 0.05,
    group: "red",
    format: s2,
  },
  {
    key: "redSpeed",
    label: "Red speed",
    hint: "Top travel speed",
    min: 0.8,
    max: 8,
    step: 0.1,
    group: "red",
    format: s1,
  },
  {
    key: "redVision",
    label: "Red vision",
    hint: "How far a red blob senses blue blobs",
    min: 2,
    max: 34,
    step: 0.5,
    group: "red",
    format: s1,
  },
  {
    key: "redContact",
    label: "Red contact strength",
    hint: "Energy taken from a blue blob per contact",
    min: 4,
    max: 70,
    step: 1,
    group: "red",
    format: s0,
  },
  {
    key: "redRepro",
    label: "Red copy threshold",
    hint: "Energy needed before a red blob copies itself",
    min: 35,
    max: 110,
    step: 1,
    group: "red",
    format: s0,
  },
  {
    key: "redPause",
    label: "Red pause time",
    hint: "Rest after a successful contact",
    min: 0.2,
    max: 10,
    step: 0.1,
    group: "red",
    format: (v) => `${s1(v)}s`,
  },
  {
    key: "trees",
    label: "Starting fruit trees",
    hint: "Trees planted at reset",
    min: 1,
    max: 48,
    step: 1,
    group: "world",
    format: s0,
  },
  {
    key: "blueStart",
    label: "Starting blue blobs",
    hint: "Blue blobs at reset",
    min: 0,
    max: 80,
    step: 1,
    group: "world",
    format: s0,
  },
  {
    key: "redStart",
    label: "Starting red blobs",
    hint: "Red blobs at reset",
    min: 0,
    max: 60,
    step: 1,
    group: "world",
    format: s0,
  },
  {
    key: "worldSize",
    label: "World size",
    hint: "Radius of the garden dish",
    min: 12,
    max: 60,
    step: 1,
    group: "world",
    format: s0,
  },
  {
    key: "seed",
    label: "Random seed",
    hint: "Same seed replays the same garden",
    min: 1,
    max: 9999,
    step: 1,
    group: "world",
    format: s0,
  },
  {
    key: "simSpeed",
    label: "Simulation speed",
    hint: "Sim seconds per real second",
    min: 0.25,
    max: 12,
    step: 0.25,
    group: "world",
    format: (v) => `${s2(v)}x`,
  },
];

/** Sliders that require rebuilding the world; the rest apply live. */
export const RESET_KEYS: (keyof Params)[] = [
  "trees",
  "blueStart",
  "redStart",
  "worldSize",
  "seed",
];

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
    blurb: "Both groups rise and fall out of phase for a long time.",
    params: { ...DEFAULTS },
  },
  {
    id: "fruit-rich",
    name: "Fruit-rich garden",
    blurb: "Heavy trees, fast regrowth: blue blobs boom quickly.",
    params: {
      ...DEFAULTS,
      fruitGrowth: 0.26,
      fruitLimit: 11,
      fruitReturnDelay: 1,
      trees: 22,
      redStart: 5,
    },
  },
  {
    id: "red-heavy",
    name: "Red-heavy garden",
    blurb: "Fast, hungry reds: blue dips first, red fades after.",
    params: {
      ...DEFAULTS,
      redStart: 22,
      blueStart: 24,
      redSpeed: 4.6,
      redVision: 20,
      redContact: 42,
      redRepro: 70,
      redPause: 1.4,
    },
  },
  {
    id: "fragile",
    name: "Fragile balance",
    blurb: "Thin margins everywhere; small changes tip the world over.",
    params: {
      ...DEFAULTS,
      fruitGrowth: 0.18,
      fruitLimit: 4,
      fruitReturnDelay: 5,
      blueEnergyUse: 1.9,
      blueRepro: 84,
      redEnergyUse: 1.4,
      redContact: 44,
      trees: 22,
      blueStart: 22,
      redStart: 6,
    },
  },
  {
    id: "low-fruit",
    name: "Low-fruit garden",
    blurb: "Scarce fruit keeps every group small and cautious.",
    params: {
      ...DEFAULTS,
      fruitGrowth: 0.075,
      fruitLimit: 3,
      fruitReturnDelay: 9,
      trees: 14,
      blueStart: 14,
      redStart: 4,
      blueVision: 13,
    },
  },
];
