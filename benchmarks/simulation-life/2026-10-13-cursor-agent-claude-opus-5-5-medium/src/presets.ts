import { DEFAULTS, type Params } from "./sim";

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  params: Params;
}

const make = (id: string, name: string, blurb: string, over: Partial<Params>): Preset => ({
  id,
  name,
  blurb,
  params: { ...DEFAULTS, ...over },
});

export const PRESETS: Preset[] = [
  make("balanced", "Balanced garden", "Blue and red rise and fall in long, out-of-phase waves.", {}),
  make("rich", "Fruit-rich garden", "Lots of fast fruit: blue booms early, red follows hard.", {
    fruitGrowth: 1.6,
    fruitLimit: 7,
    fruitDelay: 2,
    trees: 18,
    seed: 3,
  }),
  make("redheavy", "Red-heavy garden", "Too many reds at the start: blue dips first, red fades after.", {
    redStart: 40,
    blueStart: 45,
    seed: 5,
  }),
  make("fragile", "Fragile balance", "Sharp-eyed, fast reds: deep swings that flirt with collapse.", {
    redVision: 9,
    redSpeed: 3.7,
    seed: 11,
  }),
  make("lowfruit", "Low-fruit garden", "Sparse, slow fruit keeps everyone small.", {
    trees: 6,
    fruitLimit: 3,
    fruitGrowth: 0.5,
    fruitDelay: 8,
    blueStart: 16,
    redStart: 4,
    seed: 9,
  }),
];
