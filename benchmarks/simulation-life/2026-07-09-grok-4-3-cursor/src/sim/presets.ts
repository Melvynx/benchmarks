import type { PresetId, SimParams } from "./types";

export const DEFAULT_PARAMS: SimParams = {
  seed: 42,
  worldRadius: 260,
  plantCount: 55,
  foodGrowthRate: 0.75,
  foodCarryingCapacity: 2.5,
  foodRegrowDelay: 3.4,
  foodEnergy: 30,

  startPrey: 48,
  startPredators: 10,

  preyBaseSpeed: 50,
  preyBaseVision: 68,
  preyBaseMetabolism: 2.2,
  preyEatTime: 0.4,
  preyReproduceEnergy: 64,
  preyReproduceCost: 28,
  preyReproduceChance: 0.7,
  preyStartEnergy: 55,
  preyFleeWeight: 1.4,

  predatorBaseSpeed: 58,
  predatorBaseVision: 95,
  predatorHuntRange: 20,
  predatorCaptureChance: 0.38,
  predatorBaseMetabolism: 3.1,
  predatorFeedTime: 0.7,
  predatorEnergyGain: 52,
  predatorReproduceEnergy: 92,
  predatorReproduceCost: 40,
  predatorReproduceChance: 0.38,
  predatorStartEnergy: 68,

  evolutionEnabled: true,
  mutationRate: 0.2,
  mutationScale: 0.1,

  simSpeed: 1,
};

export const PRESETS: Record<
  PresetId,
  { name: string; blurb: string; params: Partial<SimParams> }
> = {
  balanced: {
    name: "Balanced ecosystem",
    blurb: "Classic out-of-phase predator–prey oscillations.",
    params: {},
  },
  high_predator: {
    name: "High predator pressure",
    blurb: "Prey collapse first; predators decline after.",
    params: {
      seed: 77,
      startPrey: 44,
      startPredators: 16,
      predatorCaptureChance: 0.58,
      predatorHuntRange: 26,
      predatorBaseVision: 110,
      predatorBaseSpeed: 66,
      predatorEnergyGain: 55,
      predatorReproduceChance: 0.45,
      preyFleeWeight: 0.9,
      foodGrowthRate: 0.55,
      foodRegrowDelay: 4.2,
    },
  },
  prey_paradise: {
    name: "Prey paradise",
    blurb: "Abundant food, soft predation — prey boom.",
    params: {
      seed: 12,
      foodGrowthRate: 1.3,
      foodCarryingCapacity: 3.5,
      foodRegrowDelay: 1.0,
      startPredators: 3,
      predatorCaptureChance: 0.12,
      predatorBaseMetabolism: 4.2,
      predatorReproduceChance: 0.2,
      preyReproduceChance: 0.9,
      preyReproduceEnergy: 52,
    },
  },
  fragile: {
    name: "Fragile equilibrium",
    blurb: "Narrow balance — tip it and watch recovery or collapse.",
    params: {
      seed: 303,
      startPrey: 32,
      startPredators: 10,
      foodGrowthRate: 0.5,
      foodRegrowDelay: 4.5,
      predatorCaptureChance: 0.48,
      preyReproduceChance: 0.5,
      predatorReproduceChance: 0.32,
    },
  },
  ice_age: {
    name: "Low food / ice age",
    blurb: "Scarce growth — starvation pressure dominates.",
    params: {
      seed: 19,
      foodGrowthRate: 0.22,
      foodCarryingCapacity: 1.25,
      foodRegrowDelay: 6.2,
      plantCount: 32,
      startPrey: 26,
      startPredators: 5,
      preyBaseMetabolism: 3.0,
      predatorBaseMetabolism: 4.0,
      predatorCaptureChance: 0.28,
    },
  },
};

export const PRESET_ORDER: PresetId[] = [
  "balanced",
  "high_predator",
  "prey_paradise",
  "fragile",
  "ice_age",
];
