import type { PresetId, SimConfig } from './types.ts';

export interface PresetDefinition {
  id: Exclude<PresetId, 'custom'>;
  name: string;
  tagline: string;
  description: string;
  config: SimConfig;
}

export const PRESETS: Record<Exclude<PresetId, 'custom'>, PresetDefinition> = {
  balanced: {
    id: 'balanced',
    name: 'Balanced Garden',
    tagline: 'Out-of-phase waves',
    description:
      'Fruit fuels blue booms, blue booms feed red rises, and high red counts trim blue until red fades back—creating classic Lotka-Volterra waves.',
    config: {
      fruitGrowthSpeed: 0.85,
      fruitLimit: 48,
      fruitReturnDelay: 2.6,
      blueEnergyUse: 3.4,
      blueSpeed: 54,
      blueVision: 110,
      blueCopyThreshold: 105,
      blueEatingTime: 0.85,
      redEnergyUse: 4.1,
      redSpeed: 60,
      redVision: 120,
      redContactStrength: 44,
      redCopyThreshold: 112,
      redPauseTime: 1.25,
      startingTrees: 14,
      startingBlue: 18,
      startingRed: 7,
      worldSize: 255,
      seed: 4210,
      simSpeed: 1,
    },
  },
  fruit_rich: {
    id: 'fruit_rich',
    name: 'Fruit-Rich Garden',
    tagline: 'Abundant orchard boom',
    description:
      'Many lush trees and rapid fruit regrowth let blue blobs multiply quickly before leveling out at a bustling garden carrying capacity.',
    config: {
      fruitGrowthSpeed: 1.55,
      fruitLimit: 92,
      fruitReturnDelay: 1.4,
      blueEnergyUse: 3.1,
      blueSpeed: 56,
      blueVision: 118,
      blueCopyThreshold: 96,
      blueEatingTime: 0.7,
      redEnergyUse: 4.2,
      redSpeed: 58,
      redVision: 115,
      redContactStrength: 40,
      redCopyThreshold: 116,
      redPauseTime: 1.45,
      startingTrees: 20,
      startingBlue: 16,
      startingRed: 6,
      worldSize: 275,
      seed: 7788,
      simSpeed: 1,
    },
  },
  red_heavy: {
    id: 'red_heavy',
    name: 'Red-Heavy Garden',
    tagline: 'Overgrazed prey crash',
    description:
      'Starts with an oversized, hungry pack of red blobs. Blue blobs dip sharply first, leaving red blobs with too few contacts so they fade later.',
    config: {
      fruitGrowthSpeed: 0.65,
      fruitLimit: 36,
      fruitReturnDelay: 3.4,
      blueEnergyUse: 3.8,
      blueSpeed: 48,
      blueVision: 92,
      blueCopyThreshold: 118,
      blueEatingTime: 1.1,
      redEnergyUse: 4.9,
      redSpeed: 66,
      redVision: 145,
      redContactStrength: 62,
      redCopyThreshold: 110,
      redPauseTime: 0.75,
      startingTrees: 12,
      startingBlue: 16,
      startingRed: 24,
      worldSize: 245,
      seed: 9012,
      simSpeed: 1,
    },
  },
  fragile: {
    id: 'fragile',
    name: 'Fragile Balance',
    tagline: 'Deep boom-and-bust swings',
    description:
      'High metabolic costs and strong interactions push both groups to the brink on every wave before rebounding from small pockets of survivors.',
    config: {
      fruitGrowthSpeed: 0.78,
      fruitLimit: 44,
      fruitReturnDelay: 3.3,
      blueEnergyUse: 4.4,
      blueSpeed: 58,
      blueVision: 115,
      blueCopyThreshold: 102,
      blueEatingTime: 0.9,
      redEnergyUse: 4.8,
      redSpeed: 64,
      redVision: 132,
      redContactStrength: 52,
      redCopyThreshold: 106,
      redPauseTime: 1.15,
      startingTrees: 13,
      startingBlue: 20,
      startingRed: 9,
      worldSize: 250,
      seed: 3141,
      simSpeed: 1,
    },
  },
  low_fruit: {
    id: 'low_fruit',
    name: 'Low-Fruit Garden',
    tagline: 'Sparse resource cap',
    description:
      'Few trees and slow fruit return keep the entire garden small. Blue blobs stabilize at a modest population and red blobs remain scarce.',
    config: {
      fruitGrowthSpeed: 0.48,
      fruitLimit: 14,
      fruitReturnDelay: 4.2,
      blueEnergyUse: 2.9,
      blueSpeed: 54,
      blueVision: 130,
      blueCopyThreshold: 112,
      blueEatingTime: 0.95,
      redEnergyUse: 4.8,
      redSpeed: 52,
      redVision: 95,
      redContactStrength: 34,
      redCopyThreshold: 132,
      redPauseTime: 1.65,
      startingTrees: 7,
      startingBlue: 10,
      startingRed: 3,
      worldSize: 230,
      seed: 5505,
      simSpeed: 1,
    },
  },
};

export function createSeededRandom(seed: number): () => number {
  let a = (seed | 0) + 0x6d2b79f5;
  return function () {
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandomizedConfig(currentSimSpeed: number = 1): SimConfig {
  const randomSeed = Math.floor(1000 + Math.random() * 9000);
  const rng = createSeededRandom(randomSeed);
  const randRange = (min: number, max: number, step: number = 1) => {
    const raw = min + rng() * (max - min);
    return Math.round(raw / step) * step;
  };

  const startingTrees = randRange(9, 20, 1);
  const fruitLimit = Math.max(startingTrees * 2, randRange(24, 78, 2));

  return {
    fruitGrowthSpeed: Number(randRange(0.45, 1.4, 0.05).toFixed(2)),
    fruitLimit,
    fruitReturnDelay: Number(randRange(1.5, 4.2, 0.1).toFixed(1)),
    blueEnergyUse: Number(randRange(2.8, 4.6, 0.1).toFixed(1)),
    blueSpeed: randRange(44, 68, 2),
    blueVision: randRange(85, 145, 5),
    blueCopyThreshold: randRange(92, 125, 2),
    blueEatingTime: Number(randRange(0.6, 1.3, 0.05).toFixed(2)),
    redEnergyUse: Number(randRange(3.5, 5.2, 0.1).toFixed(1)),
    redSpeed: randRange(50, 72, 2),
    redVision: randRange(95, 155, 5),
    redContactStrength: randRange(36, 56, 2),
    redCopyThreshold: randRange(100, 130, 2),
    redPauseTime: Number(randRange(0.9, 1.7, 0.05).toFixed(2)),
    startingTrees,
    startingBlue: randRange(12, 26, 1),
    startingRed: randRange(4, 13, 1),
    worldSize: randRange(220, 285, 5),
    seed: randomSeed,
    simSpeed: currentSimSpeed,
  };
}
