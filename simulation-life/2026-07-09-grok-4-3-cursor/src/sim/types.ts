export type Species = "prey" | "predator";

export type Behavior =
  | "wandering"
  | "seeking_food"
  | "fleeing"
  | "eating"
  | "hunting"
  | "digesting"
  | "reproducing"
  | "resting";

export interface Traits {
  speed: number;
  vision: number;
  metabolism: number;
  size: number;
}

export interface Creature {
  id: number;
  species: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  traits: Traits;
  behavior: Behavior;
  actionTimer: number;
  facing: number;
  bounce: number;
  blink: number;
  fear: number;
  glow: number;
  squash: number;
  generation: number;
  parentId: number | null;
  targetId: number | null;
  targetPlant: number | null;
}

export interface Plant {
  id: number;
  x: number;
  y: number;
  food: number;
  maxFood: number;
  regrowTimer: number;
  sway: number;
  size: number;
  kind: "bush" | "tree" | "sprout";
}

export interface HistorySample {
  t: number;
  food: number;
  prey: number;
  predators: number;
  avgPreySpeed: number;
  avgPreyVision: number;
  avgPreyMetabolism: number;
  avgPredSpeed: number;
  avgPredVision: number;
  avgPredMetabolism: number;
}

export interface SimParams {
  seed: number;
  worldRadius: number;
  plantCount: number;
  foodGrowthRate: number;
  foodCarryingCapacity: number;
  foodRegrowDelay: number;
  foodEnergy: number;

  startPrey: number;
  startPredators: number;

  preyBaseSpeed: number;
  preyBaseVision: number;
  preyBaseMetabolism: number;
  preyEatTime: number;
  preyReproduceEnergy: number;
  preyReproduceCost: number;
  preyReproduceChance: number;
  preyStartEnergy: number;
  preyFleeWeight: number;

  predatorBaseSpeed: number;
  predatorBaseVision: number;
  predatorBaseMetabolism: number;
  predatorHuntRange: number;
  predatorCaptureChance: number;
  predatorFeedTime: number;
  predatorEnergyGain: number;
  predatorReproduceEnergy: number;
  predatorReproduceCost: number;
  predatorReproduceChance: number;
  predatorStartEnergy: number;

  evolutionEnabled: boolean;
  mutationRate: number;
  mutationScale: number;

  simSpeed: number;
}

export type PresetId =
  | "balanced"
  | "high_predator"
  | "prey_paradise"
  | "fragile"
  | "ice_age";

export interface RunVerdict {
  label: string;
  detail: string;
  tone: "stable" | "boom" | "decline" | "collapse" | "oscillating" | "extinction" | "recovery";
}
