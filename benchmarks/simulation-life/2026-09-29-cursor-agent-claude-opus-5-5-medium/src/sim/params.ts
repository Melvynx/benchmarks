export interface Params {
  fruitGrowth: number;
  fruitLimit: number;
  fruitDelay: number;
  blueEnergyUse: number;
  blueSpeed: number;
  blueVision: number;
  blueCopy: number;
  blueEatTime: number;
  redEnergyUse: number;
  redSpeed: number;
  redVision: number;
  redContact: number;
  redCopy: number;
  redPause: number;
  trees: number;
  blues: number;
  reds: number;
  worldSize: number;
  seed: number;
  mutation: number;
  simSpeed: number;
}

export type ParamKey = keyof Params;

export interface ParamMeta {
  key: ParamKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Only takes effect when the world is rebuilt. */
  onReset?: boolean;
  format?: (v: number) => string;
}

export interface ParamGroup {
  id: string;
  title: string;
  accent: string;
  params: ParamMeta[];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const x = (v: number) => `×${v.toFixed(2)}`;

export const PARAM_GROUPS: ParamGroup[] = [
  {
    id: "fruit",
    title: "Fruit trees",
    accent: "var(--fruit)",
    params: [
      { key: "fruitGrowth", label: "Fruit growth speed", hint: "How fast an empty stem ripens a new fruit", min: 0.03, max: 1, step: 0.01, format: (v) => `${(1 / v).toFixed(1)}s to ripen` },
      { key: "fruitLimit", label: "Fruit limit", hint: "Fruit each tree can hold at once", min: 1, max: 12, step: 1, unit: "per tree" },
      { key: "fruitDelay", label: "Fruit return delay", hint: "Rest time before a picked stem starts regrowing", min: 0, max: 40, step: 0.5, unit: "s" },
    ],
  },
  {
    id: "blue",
    title: "Blue blobs",
    accent: "var(--blue)",
    params: [
      { key: "blueEnergyUse", label: "Energy use", hint: "Multiplier on moving + waiting cost", min: 0.3, max: 2.5, step: 0.05, format: x },
      { key: "blueSpeed", label: "Speed", hint: "Top walking speed (moving faster costs more)", min: 0.8, max: 7, step: 0.1, unit: "u/s" },
      { key: "blueVision", label: "Vision", hint: "How far they spot fruit and red blobs", min: 1.5, max: 14, step: 0.25, unit: "u" },
      { key: "blueCopy", label: "Copy threshold", hint: "Energy needed to split into two", min: 35, max: 150, step: 1, unit: "E" },
      { key: "blueEatTime", label: "Eating time", hint: "Chewing pause per fruit", min: 0.2, max: 6, step: 0.1, unit: "s" },
    ],
  },
  {
    id: "red",
    title: "Red blobs",
    accent: "var(--red)",
    params: [
      { key: "redEnergyUse", label: "Energy use", hint: "Multiplier on moving + waiting cost", min: 0.3, max: 2.5, step: 0.05, format: x },
      { key: "redSpeed", label: "Speed", hint: "Top chasing speed (roaming is half)", min: 0.8, max: 8, step: 0.1, unit: "u/s" },
      { key: "redVision", label: "Vision", hint: "How far they notice blue blobs", min: 1.5, max: 16, step: 0.25, unit: "u" },
      { key: "redContact", label: "Contact strength", hint: "Energy a boop moves from blue to red", min: 5, max: 120, step: 1, unit: "E" },
      { key: "redCopy", label: "Copy threshold", hint: "Energy needed to split into two", min: 40, max: 200, step: 1, unit: "E" },
      { key: "redPause", label: "Pause time", hint: "Cuddle/rest pause after each contact", min: 0, max: 12, step: 0.1, unit: "s" },
    ],
  },
  {
    id: "world",
    title: "New world",
    accent: "var(--ink-soft)",
    params: [
      { key: "trees", label: "Starting fruit trees", hint: "", min: 1, max: 40, step: 1, onReset: true },
      { key: "blues", label: "Starting blue blobs", hint: "", min: 0, max: 160, step: 1, onReset: true },
      { key: "reds", label: "Starting red blobs", hint: "", min: 0, max: 100, step: 1, onReset: true },
      { key: "worldSize", label: "World size", hint: "Radius of the garden dish", min: 8, max: 30, step: 1, unit: "u", onReset: true },
      { key: "seed", label: "Random seed", hint: "Same seed + settings = same garden", min: 1, max: 9999, step: 1, onReset: true },
      { key: "mutation", label: "Trait drift", hint: "How much babies' speed & vision differ from parents", min: 0, max: 0.2, step: 0.005, format: pct },
    ],
  },
];

export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 0.2,
  fruitLimit: 5,
  fruitDelay: 3,
  blueEnergyUse: 1,
  blueSpeed: 3,
  blueVision: 6,
  blueCopy: 78,
  blueEatTime: 1.2,
  redEnergyUse: 1,
  redSpeed: 3.4,
  redVision: 5,
  redContact: 45,
  redCopy: 145,
  redPause: 4,
  trees: 15,
  blues: 40,
  reds: 8,
  worldSize: 18,
  seed: 7,
  mutation: 0.04,
  simSpeed: 3,
};

export interface Preset {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  params: Partial<Params>;
}

export const PRESETS: Preset[] = [
  {
    id: "balanced",
    name: "Balanced garden",
    emoji: "🌿",
    blurb: "Blue and red take turns rising and falling.",
    params: {},
  },
  {
    id: "rich",
    name: "Fruit-rich garden",
    emoji: "🍏",
    blurb: "Lots of fast fruit: blue booms, red follows.",
    params: { fruitGrowth: 0.3, fruitLimit: 7, fruitDelay: 2, trees: 16 },
  },
  {
    id: "redheavy",
    name: "Red-heavy garden",
    emoji: "🔴",
    blurb: "Too many reds: blue dips first, reds fade later.",
    params: { reds: 30, blues: 50 },
  },
  {
    id: "fragile",
    name: "Fragile balance",
    emoji: "🫧",
    blurb: "Sharper, faster reds on a knife's edge.",
    params: { redVision: 5.75, redSpeed: 3.6, redPause: 3.2 },
  },
  {
    id: "lowfruit",
    name: "Low-fruit garden",
    emoji: "🍂",
    blurb: "Scarce, slow fruit keeps everyone small.",
    params: { fruitGrowth: 0.1, fruitLimit: 3, fruitDelay: 6, trees: 8, blues: 20, reds: 4 },
  },
];

export function presetParams(id: string, base: Params = DEFAULT_PARAMS): Params {
  const preset = PRESETS.find((p) => p.id === id);
  return { ...DEFAULT_PARAMS, seed: base.seed, simSpeed: base.simSpeed, ...(preset?.params ?? {}) };
}

export const RESET_KEYS: ParamKey[] = ["trees", "blues", "reds", "worldSize", "seed"];
