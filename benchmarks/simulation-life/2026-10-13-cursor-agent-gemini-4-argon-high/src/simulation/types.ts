export type PresetId =
  | 'balanced'
  | 'fruit_rich'
  | 'red_heavy'
  | 'fragile'
  | 'low_fruit'
  | 'custom';

export interface SimConfig {
  // Fruit controls
  fruitGrowthSpeed: number; // 0.1 to 2.5 (growth rate multiplier)
  fruitLimit: number; // 6 to 120 (max ripe fruits in world)
  fruitReturnDelay: number; // 0.5 to 12.0s (cooldown after being eaten)

  // Blue blob controls
  blueEnergyUse: number; // 1.0 to 12.0 energy/sec
  blueSpeed: number; // 15 to 95 units/sec
  blueVision: number; // 30 to 220 units
  blueCopyThreshold: number; // 60 to 180 energy
  blueEatingTime: number; // 0.2 to 3.5s pause to eat fruit

  // Red blob controls
  redEnergyUse: number; // 1.0 to 12.0 energy/sec
  redSpeed: number; // 15 to 105 units/sec
  redVision: number; // 30 to 240 units
  redContactStrength: number; // 15 to 95 energy drained on contact
  redCopyThreshold: number; // 60 to 180 energy
  redPauseTime: number; // 0.2 to 4.0s pause after contact

  // World & starting setup controls
  startingTrees: number; // 3 to 28 trees
  startingBlue: number; // 2 to 60 blue blobs
  startingRed: number; // 0 to 45 red blobs
  worldSize: number; // 160 to 360 dish radius
  seed: number; // integer seed
  simSpeed: number; // 0.25 to 8.0x speed
}

export type FruitSlotState = 'ripe' | 'being_eaten' | 'cooldown' | 'growing';

export interface FruitSlot {
  index: number;
  // Local offset relative to tree base
  localX: number;
  localY: number;
  localZ: number;
  state: FruitSlotState;
  growthProgress: number; // 0..1 (1 = fully ripe, shrinks to 0 when being eaten)
  cooldownRemaining: number; // seconds left before regrowing starts
  claimedByBlobId: number | null;
}

export interface TreeEntity {
  id: number;
  x: number;
  z: number;
  scale: number;
  canopyRadius: number;
  trunkHeight: number;
  hueShift: number;
  swayOffset: number;
  slots: FruitSlot[];
}

export type BlueAction =
  | 'seeking_fruit'
  | 'eating_fruit'
  | 'fleeing_red'
  | 'avoiding_crowd'
  | 'gathering_near_trees'
  | 'wandering';

export type RedAction = 'seeking_blue' | 'contact_pause' | 'wandering';

export type BlobAction = BlueAction | RedAction;

export interface BlobTraits {
  speedTrait: number; // Multiplier around 1.0 (e.g. 0.78 - 1.28)
  visionTrait: number; // Multiplier around 1.0 (e.g. 0.78 - 1.28)
  sizeTrait: number; // Multiplier around 1.0 (e.g. 0.85 - 1.18)
}

export interface BlobEntity {
  id: number;
  name: string;
  group: 'blue' | 'red';
  x: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  energy: number;
  maxEnergy: number;
  age: number; // seconds alive
  action: BlobAction;
  actionTimer: number; // seconds left in eating_fruit or contact_pause
  actionDuration: number; // total duration of current pause/eating state
  targetTreeId: number | null;
  targetFruitSlotIdx: number | null;
  targetBlobId: number | null;
  contactCooldown: number; // seconds of post-contact immunity for blue blobs
  reproCooldown: number; // seconds before another reproduction is allowed
  wanderAngle: number;
  wanderTimer: number;
  bouncePhase: number;
  bounceHeight: number;
  leanAngle: number;
  squish: number; // >1 wider/shorter, <1 taller/thinner
  blinkTimer: number;
  blinkDuration: number;
  glowIntensity: number;
  expression: 'happy' | 'chewing' | 'alert' | 'focused' | 'chill' | 'proud';
  generation: number;
  parentId: number | null;
  childrenCount: number;
  interactionsCount: number; // fruits eaten or contacts made
  traits: BlobTraits;
}

export interface VisualEffect {
  id: number;
  type: 'eat_sparkle' | 'contact_ring' | 'birth_burst' | 'fade_puff' | 'fruit_pop';
  x: number;
  y: number;
  z: number;
  color: string;
  secondaryColor?: string;
  age: number;
  duration: number;
  radius: number;
}

export interface GroundDecor {
  x: number;
  z: number;
  type: 'grass_tuft' | 'pebble' | 'flower' | 'cloverPatch';
  scale: number;
  rotation: number;
  colorVariant: number;
}

export interface HistoryPoint {
  time: number; // simulation seconds
  tick: number;
  fruit: number; // available + being eaten ripe fruit count
  growingFruit: number; // regrowing buds count
  blue: number;
  red: number;
  avgBlueEnergy: number;
  avgRedEnergy: number;
  avgBlueSpeed: number;
  avgBlueVision: number;
  avgRedSpeed: number;
  avgRedVision: number;
}

export interface StoryEvent {
  id: number;
  time: number;
  category: 'wave' | 'boom' | 'dip' | 'fade' | 'balance' | 'info';
  text: string;
}

export interface RunSummaryAnalysis {
  headline: string;
  narrative: string;
  bullets: string[];
  badgeText: string;
  badgeTone: 'emerald' | 'blue' | 'rose' | 'amber' | 'slate';
  waveCount: number;
  peakBlue: number;
  peakRed: number;
  peakFruit: number;
}
