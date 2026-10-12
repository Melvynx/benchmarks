export interface Settings {
  seed: number;
  worldSize: number;
  trees: number;
  blueStart: number;
  redStart: number;
  fruitGrowth: number;
  fruitLimit: number;
  fruitDelay: number;
  blueUse: number;
  blueSpeed: number;
  blueVision: number;
  blueCopy: number;
  blueEat: number;
  redUse: number;
  redSpeed: number;
  redVision: number;
  redContact: number;
  redPause: number;
  redCopy: number;
}

export type SettingKey = keyof Settings;

export interface SettingSpec {
  key: SettingKey;
  label: string;
  min: number;
  max: number;
  step: number;
  /** true when the value only takes effect on reset (builds the world) */
  structural: boolean;
  hint: string;
}

export interface SettingSection {
  id: "garden" | "fruit" | "blue" | "red";
  title: string;
  specs: SettingSpec[];
}

export const DEFAULTS: Settings = {
  seed: 2,
  worldSize: 1,
  trees: 9,
  blueStart: 40,
  redStart: 14,
  fruitGrowth: 0.12,
  fruitLimit: 4,
  fruitDelay: 2,
  blueUse: 0.9,
  blueSpeed: 0.22,
  blueVision: 0.3,
  blueCopy: 70,
  blueEat: 1.2,
  redUse: 0.9,
  redSpeed: 0.26,
  redVision: 0.35,
  redContact: 2.5,
  redPause: 2.2,
  redCopy: 88,
};

export const SECTIONS: SettingSection[] = [
  {
    id: "garden",
    title: "Garden",
    specs: [
      { key: "worldSize", label: "World size", min: 0.6, max: 1.8, step: 0.05, structural: true, hint: "Dish radius. Bigger dish = same blobs spread thinner." },
      { key: "trees", label: "Starting fruit trees", min: 2, max: 24, step: 1, structural: true, hint: "Trees placed at reset." },
      { key: "blueStart", label: "Starting blue blobs", min: 0, max: 150, step: 1, structural: true, hint: "Blue population at reset." },
      { key: "redStart", label: "Starting red blobs", min: 0, max: 80, step: 1, structural: true, hint: "Red population at reset." },
      { key: "seed", label: "Random seed", min: 1, max: 99999, step: 1, structural: true, hint: "Same seed + settings = same run." },
    ],
  },
  {
    id: "fruit",
    title: "Fruit",
    specs: [
      { key: "fruitGrowth", label: "Fruit growth speed", min: 0.02, max: 0.4, step: 0.01, structural: false, hint: "Fruit per tree per second while regrowing." },
      { key: "fruitLimit", label: "Fruit limit per tree", min: 1, max: 8, step: 1, structural: false, hint: "Maximum fruit a tree can carry." },
      { key: "fruitDelay", label: "Fruit return delay", min: 0, max: 30, step: 0.5, structural: false, hint: "Seconds a tree waits after being picked before regrowing." },
    ],
  },
  {
    id: "blue",
    title: "Blue blobs",
    specs: [
      { key: "blueUse", label: "Energy use", min: 0.2, max: 2.5, step: 0.05, structural: false, hint: "Metabolism per second while moving." },
      { key: "blueSpeed", label: "Speed", min: 0.05, max: 0.5, step: 0.01, structural: false, hint: "Top speed in garden radii per second." },
      { key: "blueVision", label: "Vision", min: 0.1, max: 0.7, step: 0.01, structural: false, hint: "How far blue blobs see fruit and red blobs." },
      { key: "blueCopy", label: "Copy threshold", min: 40, max: 98, step: 1, structural: false, hint: "Energy needed before paying to make a child." },
      { key: "blueEat", label: "Eating time", min: 0.2, max: 5, step: 0.1, structural: false, hint: "Chew pause after each fruit. Blobs stand still." },
    ],
  },
  {
    id: "red",
    title: "Red blobs",
    specs: [
      { key: "redUse", label: "Energy use", min: 0.2, max: 2.5, step: 0.05, structural: false, hint: "Metabolism per second while moving." },
      { key: "redSpeed", label: "Speed", min: 0.05, max: 0.6, step: 0.01, structural: false, hint: "Top speed in garden radii per second." },
      { key: "redVision", label: "Vision", min: 0.1, max: 0.7, step: 0.01, structural: false, hint: "How far red blobs see blue blobs." },
      { key: "redContact", label: "Contact strength", min: 2, max: 40, step: 0.5, structural: false, hint: "Energy gained per gentle contact. Blue loses 35% of it." },
      { key: "redPause", label: "Pause after contact", min: 0.2, max: 5, step: 0.1, structural: false, hint: "Red blobs rest after contact, limiting contact rate." },
      { key: "redCopy", label: "Copy threshold", min: 40, max: 98, step: 1, structural: false, hint: "Energy needed before paying to make a child." },
    ],
  },
];

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  values: Partial<Settings>;
}

export const PRESETS: Preset[] = [
  {
    id: "balanced",
    name: "Balanced garden",
    blurb: "Defaults. Blue and red should trade the lead.",
    values: {},
  },
  {
    id: "fruit-rich",
    name: "Fruit-rich garden",
    blurb: "Fast regrowth, many trees. Blue explodes first.",
    values: { trees: 12, fruitGrowth: 0.18, fruitLimit: 5, fruitDelay: 2, blueStart: 30, redStart: 10, blueCopy: 80, redUse: 1.0, redCopy: 88, redContact: 2, redPause: 1.5 },
  },
  {
    id: "red-heavy",
    name: "Red-heavy garden",
    blurb: "Lots of red at the start. Blue dips first, red fades later.",
    values: { blueStart: 60, redStart: 45, redCopy: 88, redContact: 2, blueCopy: 60 },
  },
  {
    id: "fragile",
    name: "Fragile balance",
    blurb: "Thin margins. Small nudges flip the outcome.",
    values: { redUse: 1.0, blueUse: 1.0, redContact: 2.5 },
  },
  {
    id: "low-fruit",
    name: "Low-fruit garden",
    blurb: "Scarce, slow fruit. The whole garden stays small.",
    values: { trees: 6, fruitGrowth: 0.06, fruitLimit: 3, fruitDelay: 3, blueStart: 12, redStart: 4 },
  },
];
