export type EntityId = string;

export type Species = 'blue' | 'red';

export type BlobAction =
  | 'wandering'
  | 'foraging'
  | 'eating'
  | 'fleeing'
  | 'hunting'
  | 'contacting'
  | 'paused'
  | 'reproducing';

export interface GeneticTraits {
  speed: number;      // Multiplier (0.7 to 1.5)
  vision: number;     // Multiplier (0.7 to 1.5)
  efficiency: number; // Metabolism discount (0.7 to 1.3)
  size: number;       // Visual scale (0.8 to 1.3)
}

export interface BlobEntity {
  id: EntityId;
  species: Species;
  x: number;
  z: number;
  vx: number;
  vz: number;
  angle: number;
  energy: number;
  maxEnergy: number;
  age: number;          // In simulation seconds
  generation: number;
  name: string;
  action: BlobAction;
  actionTimer: number;   // Countdown for current action (e.g. eating, pause)
  targetId: string | null;
  targetPos: { x: number; z: number } | null;
  traits: GeneticTraits;
  stats: {
    fruitEaten: number;
    contactsMade: number;
    offspringCount: number;
    distanceTraveled: number;
  };
  // Animation wobble
  hopPhase: number;
  blinkTimer: number;
  isBlinking: boolean;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface FruitSlot {
  id: string;
  localX: number;
  localY: number;
  localZ: number;
  isRipe: boolean;
  growthProgress: number; // 0 to 1
}

export interface FruitTree {
  id: string;
  x: number;
  z: number;
  scale: number;
  foliageRadius: number;
  fruits: FruitSlot[];
  jiggle: number;
}

export interface SimulationConfig {
  // World
  worldRadius: number;
  randomSeed: number;

  // Fruit rules
  treeCount: number;
  fruitPerTree: number;
  fruitGrowthSpeed: number; // Multiplier
  fruitReturnDelay: number;  // Base seconds to regrow
  fruitEnergyValue: number;  // Energy given to blue blob

  // Blue blob rules
  blueCount: number;
  blueBaseSpeed: number;
  blueBaseVision: number;
  blueEnergyUse: number;      // Basal metabolic loss per sec
  blueMoveEnergyCost: number; // Movement cost multiplier
  blueCopyThreshold: number;  // Energy required to duplicate
  blueEatingTime: number;     // Seconds spent eating fruit
  blueFleeDistance: number;   // Distance at which blue panics
  blueSeparationForce: number;

  // Red blob rules
  redCount: number;
  redBaseSpeed: number;
  redBaseVision: number;
  redEnergyUse: number;       // Basal metabolic loss per sec
  redMoveEnergyCost: number;  // Movement cost multiplier
  redContactStrength: number; // Energy drained from blue / given to red
  redCopyThreshold: number;   // Energy required to duplicate
  redPauseTime: number;       // Seconds paused after catching blue
  redSeparationForce: number;

  // Genetics & Evolution
  mutationRate: number;       // Chance of trait shift
  mutationStrength: number;   // Magnitude of trait shift (0.05 - 0.2)
}

export interface HistoryPoint {
  time: number;
  fruitCount: number;
  blueCount: number;
  redCount: number;
  avgBlueEnergy: number;
  avgRedEnergy: number;
  avgBlueSpeed: number;
  avgRedSpeed: number;
  avgBlueVision: number;
  avgRedVision: number;
  narrativeText?: string;
}

export interface SimulationEvent {
  id: string;
  type: 'eat_fruit' | 'predation' | 'birth' | 'death' | 'tree_planted';
  x: number;
  y: number;
  z: number;
  species?: Species;
  message?: string;
  value?: number;
}

export interface Preset {
  id: string;
  name: string;
  badge: string;
  description: string;
  config: Partial<SimulationConfig>;
}

export type InteractiveTool = 'inspect' | 'feed' | 'spawn_blue' | 'spawn_red' | 'plant_tree' | 'poke';
