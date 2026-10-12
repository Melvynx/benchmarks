import type { Params } from './params';
import type { Rng } from './rng';
import type { SpatialGrid } from './grid';

export type Group = 'blue' | 'red';

export type Action =
  | 'wander'
  | 'idle'
  | 'seek'
  | 'gather'
  | 'avoid'
  | 'flee'
  | 'eat'
  | 'hunt'
  | 'pause';

export interface Tree {
  id: number;
  x: number;
  z: number;
  fruit: number; // ripe fruit currently hanging
  growth: number; // 0..1 progress toward the next fruit
  pending: number[]; // one entry per missing fruit: sim time it may start regrowing
  phase: number; // visual rotation of fruit slots
  eaten: number; // lifetime picks
}

export interface Blob {
  id: number;
  group: Group;
  x: number;
  z: number;
  vx: number;
  vz: number;
  energy: number;
  age: number;
  generation: number;
  parentId: number | null;
  speedTrait: number; // multiplier, inherited with mutation
  visionTrait: number;
  action: Action;
  actionTimer: number; // remaining eat / pause / idle time
  eatRemain: number; // energy still to absorb from the fruit being chewed
  targetId: number | null;
  wanderAngle: number;
  wanderTimer: number;
  copyCooldown: number;
  contactCooldown: number; // blue only: immune to bites while > 0
  moved: number; // current speed magnitude
  births: number;
  bites: number; // red: bites made
  bitten: number; // blue: times touched by red
  eats: number;
  alive: boolean;
}

export type SimEvent =
  | { type: 'eat'; id: number; treeId: number; x: number; z: number; gain: number }
  | { type: 'bite'; redId: number; blueId: number; x: number; z: number; gain: number }
  | { type: 'birth'; id: number; group: Group; x: number; z: number }
  | { type: 'death'; id: number; group: Group; x: number; z: number };

export interface Totals {
  births: { blue: number; red: number };
  deaths: { blue: number; red: number };
  eats: number;
  bites: number;
}

export interface World {
  tick: number;
  time: number;
  params: Params;
  rng: Rng;
  trees: Tree[];
  blue: Blob[];
  red: Blob[];
  nextId: number;
  events: SimEvent[];
  totals: Totals;
  gridBlue: SpatialGrid<Blob>;
  gridRed: SpatialGrid<Blob>;
}

/** One row of recorded history. Trait means are multipliers (1 = founder average). */
export interface Sample {
  t: number;
  fruit: number;
  blue: number;
  red: number;
  blueEnergy: number;
  redEnergy: number;
  blueSpeedT: number;
  blueVisionT: number;
  redSpeedT: number;
  redVisionT: number;
  births: number;
  deaths: number;
  eats: number;
  bites: number;
}
